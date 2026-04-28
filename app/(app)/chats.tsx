import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge } from '../../src/components/TrustBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ChatsIcon } from '../../src/components/TabIcons';
import { useSession } from '../../src/hooks/useSession';
import { supabase } from '../../src/lib/supabase';
import { formatRelativeTime } from '../../src/utils';
import { useTheme } from '../../src/hooks/useTheme';
import type { Chat, UserProfile } from '../../src/types';

interface ChatListItem {
  chat: Chat;
  otherParticipant: UserProfile | null;
  lastMessagePreview: string;
  unreadCount: number;
}

export default function ChatsScreen() {
  const { profile } = useSession();
  const { colors } = useTheme();
  const [chatItems, setChatItems] = useState<ChatListItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const loadChats = useCallback(async () => {
    if (!profile) return;
    setIsFetching(true);
    try {
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`*, messages:chat_messages(body, created_at, sender_id, is_read, is_system_message)`)
        .contains('participant_ids', [profile.id])
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error || !chats) return;

      // Collect all unique participant ids (excluding self)
      const otherIds = [
        ...new Set(
          chats.flatMap((c: Chat) =>
            (c.participant_ids ?? []).filter((id) => id !== profile.id),
          ),
        ),
      ];

      let profileMap: Record<string, UserProfile> = {};
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', otherIds);
        profileMap = Object.fromEntries((profiles ?? []).map((p: UserProfile) => [p.id, p]));
      }

      const items: ChatListItem[] = chats.map((c: Chat & { messages: { body: string; created_at: string; sender_id: string; is_read: boolean; is_system_message: boolean }[] }) => {
        const otherId = (c.participant_ids ?? []).find((id) => id !== profile.id) ?? null;
        const msgs = c.messages ?? [];
        const lastMsg = msgs[msgs.length - 1];
        const unread = msgs.filter(
          (m) => !m.is_read && m.sender_id !== profile.id && !m.is_system_message,
        ).length;

        return {
          chat: c,
          otherParticipant: otherId ? (profileMap[otherId] ?? null) : null,
          lastMessagePreview: lastMsg?.is_system_message
            ? '🔗 Connection opened'
            : (lastMsg?.body ?? ''),
          unreadCount: unread,
        };
      });

      setChatItems(items);
    } finally {
      setIsFetching(false);
    }
  }, [profile]);

  useEffect(() => { loadChats(); }, [loadChats]);

  useFocusEffect(useCallback(() => { loadChats(); }, [loadChats]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader
        title="Messages"
        titleIcon={<ChatsIcon size={40} active />}
      />

      <FlatList
        data={chatItems}
        keyExtractor={(item) => item.chat.id}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={loadChats} tintColor="#4F6EF7" />
        }
        renderItem={({ item }) => {
          const { chat, otherParticipant, lastMessagePreview, unreadCount } = item;
          return (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(app)/chat',
                  params: { shoutId: chat.shout_id },
                })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: unreadCount > 0 ? colors.bgElevated : 'transparent',
              }}
            >
              <View style={{ marginRight: 12 }}>
                <Avatar
                  name={otherParticipant?.full_name ?? '?'}
                  avatarUrl={otherParticipant?.avatar_url ?? null}
                  trustTier={otherParticipant?.trust_tier ?? 'Member'}
                  size="md"
                  showTierRing
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: unreadCount > 0 ? 'Inter-Bold' : 'Inter-SemiBold',
                      fontSize: 15,
                    }}
                  >
                    {otherParticipant?.full_name ?? 'Contact'}
                  </Text>
                  {otherParticipant?.trust_tier && (
                    <TrustBadge tier={otherParticipant.trust_tier} size="sm" />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    color: unreadCount > 0 ? colors.textSecondary : colors.textMuted,
                    fontSize: 13,
                    fontFamily: unreadCount > 0 ? 'Inter-Medium' : undefined,
                  }}
                >
                  {lastMessagePreview}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  {chat.last_message_at ? formatRelativeTime(chat.last_message_at) : ''}
                </Text>
                {unreadCount > 0 && (
                  <View
                    style={{
                      backgroundColor: '#4F6EF7',
                      borderRadius: 999,
                      minWidth: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter-Bold' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isFetching ? (
            <LoadingSpinner label="Loading messages…" />
          ) : (
            <EmptyState
              emoji="💬"
              title="No active chats"
              subtitle="When you connect with someone on a shout-out, your conversation will appear here."
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

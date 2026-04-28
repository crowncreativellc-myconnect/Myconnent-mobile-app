import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '../../src/hooks/useSession';
import { useChat } from '../../src/hooks/useChat';
import { ChatBubble } from '../../src/components/ChatBubble';
import { ChatInput } from '../../src/components/ChatInput';
import { ReportModal } from '../../src/components/ReportModal';
import { Avatar } from '../../src/components/Avatar';
import { PointsEarnedPill } from '../../src/components/KonnectPointsBadge';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { useTheme } from '../../src/hooks/useTheme';
import { URGENCY_COLORS, URGENCY_LABELS } from '../../src/utils';
import type { ChatMessage, ChatReportReason, UserProfile } from '../../src/types';

export default function ChatScreen() {
  const { shoutId } = useLocalSearchParams<{ shoutId: string }>();
  const { profile } = useSession();
  const { colors } = useTheme();

  const {
    chat,
    messages,
    setMessages,
    isFetching,
    isScreening,
    isChatLocked,
    fetchChat,
    sendMessage,
    markMessagesRead,
    subscribeToMessages,
    reportMessage,
    markJobComplete,
    blockUser,
  } = useChat();

  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ message: ChatMessage; type: 'message' | 'user' } | null>(null);
  const [moderationError, setModerationError] = useState<{ reason: string; suggestion?: string | null } | null>(null);
  const [showPointsPill, setShowPointsPill] = useState(false);
  const pillAnim = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // ─── Load chat ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shoutId) return;
    fetchChat(shoutId);
  }, [shoutId, fetchChat]);

  // ─── Auth guard — redirect non-participants ─────────────────────────────────
  useEffect(() => {
    if (!chat || !profile) return;
    if (!chat.participant_ids.includes(profile.id)) {
      router.replace('/(app)');
    }
  }, [chat, profile]);

  // ─── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!chat?.id) return;
    const channel = subscribeToMessages(chat.id, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });
    return () => {
      channel.unsubscribe();
    };
  }, [chat?.id, subscribeToMessages, setMessages]);

  // ─── Mark messages read on focus ────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (chat?.id) markMessagesRead(chat.id);
    }, [chat?.id, markMessagesRead]),
  );

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const otherParticipant: UserProfile | undefined = chat?.participants?.find(
    (p) => p.id !== profile?.id,
  );

  const handleSend = async (body: string) => {
    if (!chat?.id) return;
    setModerationError(null);
    const result = await sendMessage(chat.id, body);
    if (result.error) {
      // Moderation failure — show inline warning
      if (result.error.code) {
        setModerationError({ reason: result.error.message, suggestion: null });
      } else {
        Alert.alert('Error', result.error.message);
      }
    }
  };

  const handleLongPress = (message: ChatMessage) => {
    if (message.is_system_message) return;
    Alert.alert('Message Options', undefined, [
      {
        text: 'Report Message',
        onPress: () => {
          setReportTarget({ message, type: 'message' });
          setReportVisible(true);
        },
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => confirmBlockUser(message.sender_id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmBlockUser = (userId: string) => {
    Alert.alert(
      'Block User',
      'They will no longer be able to message you. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = await blockUser(userId);
            if (result.error) Alert.alert('Error', result.error.message);
          },
        },
      ],
    );
  };

  const handleReportSubmit = async (reason: ChatReportReason, description?: string) => {
    if (!reportTarget || !chat?.id || !profile) return;
    const reportedUserId =
      reportTarget.type === 'user'
        ? (otherParticipant?.id ?? reportTarget.message.sender_id)
        : reportTarget.message.sender_id;

    const result = await reportMessage(
      chat.id,
      reportTarget.message.id,
      reportedUserId,
      reason,
      description,
    );

    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      Alert.alert(
        'Report submitted',
        'Thank you. Our team will review this and take action if needed.',
      );
    }
    setReportTarget(null);
  };

  const handleMarkComplete = async () => {
    if (!chat?.id) return;
    const result = await markJobComplete(chat.id);
    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }
    // Show points pill before navigating away
    setShowPointsPill(true);
    Animated.sequence([
      Animated.timing(pillAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(pillAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      router.replace('/(app)');
    });
  };

  const handleThreeDotMenu = () => {
    Alert.alert('Chat Options', undefined, [
      {
        text: 'View Shout-Out',
        onPress: () => {
          if (chat?.shout_id) {
            router.push({ pathname: '/(app)/shout-detail', params: { shoutId: chat.shout_id } });
          }
        },
      },
      {
        text: 'Report User',
        onPress: () => {
          if (!messages.length) return;
          const theirMsg = messages.find((m) => m.sender_id !== profile?.id && !m.is_system_message);
          if (theirMsg) {
            setReportTarget({ message: theirMsg, type: 'user' });
            setReportVisible(true);
          }
        },
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => {
          if (otherParticipant) confirmBlockUser(otherParticipant.id);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isFetching || !chat) {
    return <LoadingSpinner label="Opening chat…" />;
  }

  const reversedMessages = [...messages].reverse();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.bgCard,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: '#4F6EF7', fontSize: 20 }}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 10 }}
            onPress={() => {
              if (otherParticipant) {
                router.push({
                  pathname: '/(app)/connection-detail',
                  params: { userId: otherParticipant.id },
                });
              }
            }}
          >
            <Avatar
              name={otherParticipant?.full_name ?? '?'}
              avatarUrl={otherParticipant?.avatar_url ?? null}
              trustTier={otherParticipant?.trust_tier ?? 'Member'}
              size="sm"
              showTierRing
            />
            <View>
              <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 15 }}>
                {otherParticipant?.full_name ?? 'Contact'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {otherParticipant?.headline ?? ''}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleThreeDotMenu} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 22 }}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* ── Shout context strip ───────────────────────────────────────────── */}
        {chat.shout && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: colors.bgElevated,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 3,
                height: '100%',
                backgroundColor: URGENCY_COLORS[chat.shout.urgency],
                borderRadius: 2,
                alignSelf: 'stretch',
              }}
            />
            <Text
              style={{
                flex: 1,
                color: colors.textSecondary,
                fontSize: 13,
                lineHeight: 18,
              }}
              numberOfLines={1}
            >
              {chat.shout.draft_text}
            </Text>
            <View
              style={{
                backgroundColor: URGENCY_COLORS[chat.shout.urgency] + '22',
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  color: URGENCY_COLORS[chat.shout.urgency],
                  fontSize: 11,
                  fontFamily: 'Inter-SemiBold',
                }}
              >
                {URGENCY_LABELS[chat.shout.urgency]}
              </Text>
            </View>
          </View>
        )}

        {/* ── Locked banner ─────────────────────────────────────────────────── */}
        {chat.is_locked && (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(239,68,68,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
              🔒 {chat.locked_reason ?? 'This chat has been reviewed and temporarily locked by MyKonnect.'}
            </Text>
          </View>
        )}

        {/* ── Message list ──────────────────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isOwn = item.sender_id === profile?.id;
            const sender = chat.participants?.find((p) => p.id === item.sender_id);
            return (
              <ChatBubble
                message={item}
                isOwnMessage={isOwn}
                senderProfile={sender}
                onLongPress={handleLongPress}
              />
            );
          }}
          inverted
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 60 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />

        {/* ── Moderation inline warning ─────────────────────────────────────── */}
        {moderationError && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.25)',
            }}
          >
            <Text style={{ color: '#EF4444', fontSize: 13, lineHeight: 18 }}>
              🚫 {moderationError.reason}
            </Text>
            {moderationError.suggestion && (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                {moderationError.suggestion}
              </Text>
            )}
            <Text style={{ color: 'rgba(239,68,68,0.6)', fontSize: 11, marginTop: 4, fontFamily: 'Inter-Medium' }}>
              Repeated violations may result in account suspension.
            </Text>
          </View>
        )}

        {/* ── Chat input ────────────────────────────────────────────────────── */}
        <ChatInput
          onSend={handleSend}
          isScreening={isScreening}
          isLocked={isChatLocked}
          onMarkComplete={handleMarkComplete}
        />
      </KeyboardAvoidingView>

      {/* ── Points earned pill ────────────────────────────────────────────── */}
      {showPointsPill && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 100,
            alignSelf: 'center',
            opacity: pillAnim,
            transform: [{ scale: pillAnim }],
          }}
        >
          <PointsEarnedPill delta={50} label="pts earned!" />
        </Animated.View>
      )}

      {/* ── Report modal ──────────────────────────────────────────────────── */}
      <ReportModal
        visible={reportVisible}
        onClose={() => { setReportVisible(false); setReportTarget(null); }}
        onSubmit={handleReportSubmit}
        type={reportTarget?.type ?? 'message'}
      />
    </SafeAreaView>
  );
}

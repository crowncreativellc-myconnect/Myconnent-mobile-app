import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Avatar } from './Avatar';
import { useFeedbackChannel } from '../hooks/useFeedbackChannel';
import { formatRelativeTime } from '../utils';
import type { FeedbackMessage, TrustTier } from '../types';

interface ParticipantInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  trust_tier: TrustTier;
}

interface FeedbackChannelProps {
  shoutId: string;
  currentUserId: string;
  participantProfiles: Record<string, ParticipantInfo>;
  isActive?: boolean;
}

const STUB_MESSAGES: FeedbackMessage[] = [
  {
    id: 'sys-1',
    shout_id: 'stub',
    sender_id: null,
    body: 'Connection approved — contact cards have been exchanged. You can now communicate privately.',
    is_system_message: true,
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'msg-1',
    shout_id: 'stub',
    sender_id: 'user-2',
    body: 'Hi! Looking forward to connecting. Would Thursday work for a quick call?',
    is_system_message: false,
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'msg-2',
    shout_id: 'stub',
    sender_id: 'user-3',
    body: 'Thursday works great — 2 PM EST?',
    is_system_message: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

export function FeedbackChannel({
  shoutId,
  currentUserId,
  participantProfiles,
  isActive = true,
}: FeedbackChannelProps) {
  const { fetchChannel, sendMessage, subscribeToMessages, closeChannel } = useFeedbackChannel();
  const [messages, setMessages]     = useState<FeedbackMessage[]>([]);
  const [inputText, setInputText]   = useState('');
  const [isSending, setIsSending]   = useState(false);
  const [isClosing, setIsClosing]   = useState(false);
  const [channelActive, setChannelActive] = useState(isActive);
  const flatListRef = useRef<FlatList<FeedbackMessage>>(null);

  useEffect(() => {
    let cancelled = false;

    fetchChannel(shoutId).then((channel) => {
      if (cancelled) return;
      if (channel) {
        setMessages(channel.messages);
        setChannelActive(channel.is_active);
      } else {
        setMessages(STUB_MESSAGES);
      }
    });

    const unsubscribe = subscribeToMessages(shoutId, (msg) => {
      if (cancelled) return;
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [shoutId]);

  const handleSend = useCallback(async () => {
    const body = inputText.trim();
    if (!body || isSending) return;
    setIsSending(true);
    setInputText('');
    try {
      await sendMessage(shoutId, body);
    } catch {
      Alert.alert('Error', 'Could not send message. Please try again.');
      setInputText(body);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, shoutId, sendMessage]);

  const handleMarkComplete = useCallback(() => {
    Alert.alert(
      'Mark as Complete',
      'This will close the channel and award Konnect Points to both parties. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          style: 'default',
          onPress: async () => {
            setIsClosing(true);
            try {
              await closeChannel(shoutId);
              setChannelActive(false);
            } catch {
              Alert.alert('Error', 'Could not close the channel. Please try again.');
            } finally {
              setIsClosing(false);
            }
          },
        },
      ],
    );
  }, [shoutId, closeChannel]);

  const renderMessage = useCallback(
    ({ item }: { item: FeedbackMessage }) => {
      if (item.is_system_message) {
        return (
          <View className="items-center my-3 px-6">
            <Text className="text-text-muted text-xs italic text-center leading-relaxed">
              {item.body}
            </Text>
          </View>
        );
      }

      const isOwn    = item.sender_id === currentUserId;
      const sender   = item.sender_id ? participantProfiles[item.sender_id] : null;

      return (
        <View
          className={`flex-row items-end mb-3 px-4 ${isOwn ? 'flex-row-reverse' : ''}`}
        >
          {!isOwn && sender && (
            <Avatar
              name={sender.full_name}
              avatarUrl={sender.avatar_url}
              trustTier={sender.trust_tier}
              size="xs"
              className="mr-2 mb-1"
            />
          )}
          <View className={`max-w-[75%] ${isOwn ? 'mr-2' : ''}`}>
            {!isOwn && sender && (
              <Text className="text-text-muted text-xs mb-1 ml-1">{sender.full_name}</Text>
            )}
            <View
              className={`rounded-2xl px-3.5 py-2.5 ${
                isOwn
                  ? 'bg-brand-primary rounded-br-sm'
                  : 'bg-surface-elevated border border-surface-border rounded-bl-sm'
              }`}
            >
              <Text
                className={`text-sm leading-relaxed ${isOwn ? 'text-white' : 'text-text-primary'}`}
              >
                {item.body}
              </Text>
            </View>
            <Text className="text-text-muted text-xs mt-1 mx-1">
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
        </View>
      );
    },
    [currentUserId, participantProfiles],
  );

  return (
    <View className="flex-1 bg-surface-card rounded-2xl border border-surface-border overflow-hidden">
      {/* Channel header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface-border">
        <View className="flex-row items-center gap-x-2">
          <View
            className={`w-2 h-2 rounded-full ${channelActive ? 'bg-brand-accent' : 'bg-text-muted'}`}
          />
          <Text className="text-text-primary font-semibold text-sm">
            {channelActive ? 'Active channel' : 'Channel closed'}
          </Text>
        </View>
        {channelActive && (
          <TouchableOpacity
            onPress={handleMarkComplete}
            disabled={isClosing}
            className="bg-konnect-gold/20 border border-konnect-gold/40 rounded-lg px-3 py-1.5"
            activeOpacity={0.8}
          >
            <Text className="text-konnect-gold text-xs font-semibold">
              {isClosing ? 'Closing…' : 'Mark Complete'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={160}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        {channelActive && (
          <View className="flex-row items-end px-3 py-3 border-t border-surface-border gap-x-2">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Send a message…"
              placeholderTextColor="#4A5578"
              multiline
              className="flex-1 bg-surface-elevated border border-surface-border rounded-2xl px-4 py-3 text-text-primary text-sm"
              style={{ maxHeight: 100 }}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() && !isSending ? 'bg-brand-primary' : 'bg-surface-elevated'
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-base font-bold ${
                  inputText.trim() && !isSending ? 'text-white' : 'text-text-muted'
                }`}
              >
                ↑
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

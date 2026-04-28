import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Avatar } from './Avatar';
import { formatRelativeTime } from '../utils';
import { useTheme } from '../hooks/useTheme';
import type { ChatMessage, UserProfile } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  senderProfile?: UserProfile;
  onLongPress: (message: ChatMessage) => void;
}

export function ChatBubble({ message, isOwnMessage, senderProfile, onLongPress }: ChatBubbleProps) {
  const { colors } = useTheme();

  if (message.is_system_message) {
    return (
      <View style={{ alignItems: 'center', marginVertical: 10, paddingHorizontal: 24 }}>
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              fontStyle: 'italic',
              textAlign: 'center',
              lineHeight: 17,
            }}
          >
            {message.body}
          </Text>
        </View>
      </View>
    );
  }

  const bubbleBg = message.is_flagged
    ? isOwnMessage
      ? 'rgba(239,68,68,0.22)'
      : 'rgba(239,68,68,0.1)'
    : isOwnMessage
    ? '#4F6EF7'
    : colors.bgElevated;

  const textColor = isOwnMessage ? '#FFFFFF' : colors.textPrimary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        paddingHorizontal: 14,
        marginBottom: 6,
      }}
    >
      {!isOwnMessage && (
        <View style={{ marginRight: 8, marginBottom: 18 }}>
          <Avatar
            name={senderProfile?.full_name ?? '?'}
            avatarUrl={senderProfile?.avatar_url ?? null}
            trustTier={senderProfile?.trust_tier ?? 'Member'}
            size="sm"
          />
        </View>
      )}

      <View style={{ maxWidth: '72%' }}>
        {!isOwnMessage && senderProfile && (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 11,
              marginBottom: 3,
              marginLeft: 4,
              fontFamily: 'Inter-Medium',
            }}
          >
            {senderProfile.full_name.split(' ')[0]}
          </Text>
        )}

        <TouchableOpacity
          onLongPress={() => onLongPress(message)}
          activeOpacity={0.88}
          delayLongPress={400}
        >
          <View
            style={{
              backgroundColor: bubbleBg,
              borderRadius: 18,
              borderBottomLeftRadius: isOwnMessage ? 18 : 5,
              borderBottomRightRadius: isOwnMessage ? 5 : 18,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            {message.is_flagged && (
              <Text style={{ fontSize: 12, marginBottom: 3 }}>⚠️</Text>
            )}
            <Text style={{ color: textColor, fontSize: 15, lineHeight: 22 }}>
              {message.body}
            </Text>
          </View>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
            marginTop: 3,
            gap: 4,
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>
            {formatRelativeTime(message.created_at)}
          </Text>
          {isOwnMessage && (
            <Text
              style={{
                fontSize: 11,
                color: message.is_read ? '#4F6EF7' : colors.textMuted,
                fontFamily: 'Inter-SemiBold',
              }}
            >
              {message.is_read ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

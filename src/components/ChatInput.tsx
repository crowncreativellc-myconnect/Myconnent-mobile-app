import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface ChatInputProps {
  onSend: (body: string) => void;
  isScreening: boolean;
  isLocked: boolean;
  onMarkComplete: () => void;
  // Payment integration — provider-only "$" button.
  showPaymentButton?: boolean;
  onOpenPaymentComposer?: () => void;
  hideTextInput?: boolean;
}

export function ChatInput({
  onSend,
  isScreening,
  isLocked,
  onMarkComplete,
  showPaymentButton = false,
  onOpenPaymentComposer,
  hideTextInput = false,
}: ChatInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isScreening || isLocked) return;
    onSend(trimmed);
    setText('');
  };

  const handleMarkComplete = () => {
    Alert.alert(
      'Mark Job Complete',
      'Are both parties satisfied the job is done? Once confirmed, Konnect Points will be awarded to both of you.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Yes, mark complete', onPress: onMarkComplete },
      ],
    );
  };

  const canSend = text.trim().length > 0 && !isScreening && !isLocked;

  if (isLocked || hideTextInput) {
    return (
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 20,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bgCard,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 14, fontStyle: 'italic' }}>
          {isLocked ? 'This chat has been closed.' : 'Messaging unavailable.'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgCard,
        paddingBottom: 8,
      }}
    >
      {/* Mark Job Complete */}
      <TouchableOpacity
        onPress={handleMarkComplete}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 4,
          paddingVertical: 9,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: '#10B981',
        }}
      >
        <Text style={{ color: '#10B981', fontSize: 15, fontFamily: 'Inter-Bold' }}>✓</Text>
        <Text style={{ color: '#10B981', fontSize: 13, fontFamily: 'Inter-SemiBold' }}>
          Mark Job Complete
        </Text>
      </TouchableOpacity>

      {/* Input row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 4,
          gap: 8,
        }}
      >
        {showPaymentButton && onOpenPaymentComposer && (
          <TouchableOpacity
            onPress={onOpenPaymentComposer}
            accessibilityLabel="Request payment"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              borderWidth: 1.5,
              borderColor: '#F6C90E',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}
          >
            <Text style={{ color: '#F6C90E', fontFamily: 'Inter-Bold', fontSize: 18 }}>$</Text>
          </TouchableOpacity>
        )}

        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 22,
            paddingHorizontal: 14,
            paddingVertical: 9,
            maxHeight: 108,
          }}
        >
          <TextInput
            value={text}
            onChangeText={(t) => setText(t.slice(0, 1000))}
            placeholder="Message…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              color: colors.textPrimary,
              fontSize: 15,
              lineHeight: 22,
              maxHeight: 90,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#4F6EF7',
            opacity: canSend ? 1 : 0.35,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 2,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 20, lineHeight: 24 }}>↑</Text>
        </TouchableOpacity>
      </View>

      {isScreening && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 11,
            textAlign: 'center',
            paddingBottom: 4,
          }}
        >
          Checking message…
        </Text>
      )}
    </View>
  );
}

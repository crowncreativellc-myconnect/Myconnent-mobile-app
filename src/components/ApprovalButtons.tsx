import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import type { ConnectionApproval } from '../types';

interface ApprovalButtonsProps {
  shoutId: string;
  currentUserId: string;
  approval: ConnectionApproval;
  onApprove: () => void;
  onDecline?: () => void;
  onSaveContacts?: () => void;
}

export function ApprovalButtons({
  currentUserId,
  approval,
  onApprove,
  onDecline,
  onSaveContacts,
}: ApprovalButtonsProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isRequester  = approval.requester_id === currentUserId;
  const currentUserApproved = isRequester
    ? approval.requester_approved
    : approval.matched_user_approved;

  useEffect(() => {
    if (!currentUserApproved || approval.both_approved) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [currentUserApproved, approval.both_approved, pulseAnim]);

  if (approval.both_approved) {
    return (
      <View className="rounded-2xl border border-konnect-gold/40 bg-konnect-gold/10 p-4 mb-4">
        <Text className="text-konnect-gold font-semibold text-base text-center mb-1">
          Connection approved — contact cards exchanged
        </Text>
        {onSaveContacts && (
          <TouchableOpacity
            onPress={onSaveContacts}
            className="mt-3 bg-konnect-gold/20 border border-konnect-gold/40 rounded-xl py-2.5 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-konnect-gold font-semibold text-sm">Save to Phone Contacts</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (currentUserApproved) {
    return (
      <View className="items-center py-5 mb-4">
        <Animated.View
          className="w-3 h-3 rounded-full bg-brand-accent mb-3"
          style={{ opacity: pulseAnim }}
        />
        <Text className="text-text-muted text-sm text-center">
          Waiting for the other party to approve
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row gap-x-3 mb-4">
      <TouchableOpacity
        onPress={onApprove}
        className="flex-1 bg-brand-accent rounded-2xl py-3.5 items-center flex-row justify-center gap-x-2"
        activeOpacity={0.85}
      >
        <Text className="text-white text-base font-bold">✓  Approve</Text>
      </TouchableOpacity>

      {onDecline && (
        <TouchableOpacity
          onPress={onDecline}
          className="bg-surface-elevated border border-surface-border rounded-2xl px-5 py-3.5 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-text-secondary text-base font-medium">Decline</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

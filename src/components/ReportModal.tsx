import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { ChatReportReason } from '../types';

const REASONS: { value: ChatReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'explicit_content', label: 'Explicit content' },
  { value: 'illegal_services', label: 'Illegal services' },
  { value: 'solicitation', label: 'Solicitation' },
  { value: 'other', label: 'Other' },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ChatReportReason, description?: string) => void;
  type: 'message' | 'user';
}

export function ReportModal({ visible, onClose, onSubmit, type }: ReportModalProps) {
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState<ChatReportReason | null>(null);
  const [description, setDescription] = useState('');
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(400);
      setSelectedReason(null);
      setDescription('');
    }
  }, [visible, slideAnim]);

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason, selectedReason === 'other' && description.trim() ? description.trim() : undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
        onPress={onClose}
        activeOpacity={1}
      >
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 40,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Prevents tap-through on sheet */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
              {/* Handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginBottom: 20,
                }}
              />

              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 18,
                  fontFamily: 'Inter-Bold',
                  marginBottom: 4,
                }}
              >
                Report {type === 'message' ? 'Message' : 'User'}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  marginBottom: 20,
                  lineHeight: 20,
                }}
              >
                Help us keep MyKonnect safe. Your report is confidential.
              </Text>

              {REASONS.map((item, idx) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setSelectedReason(item.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    borderBottomWidth: idx < REASONS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{item.label}</Text>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selectedReason === item.value ? '#4F6EF7' : colors.textMuted,
                      backgroundColor:
                        selectedReason === item.value ? '#4F6EF7' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedReason === item.value && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {selectedReason === 'other' && (
                <TextInput
                  value={description}
                  onChangeText={(t) => setDescription(t.slice(0, 200))}
                  placeholder="Please describe the issue… (optional)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{
                    marginTop: 14,
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 12,
                    color: colors.textPrimary,
                    fontSize: 14,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!selectedReason}
                style={{
                  marginTop: 20,
                  backgroundColor: selectedReason ? '#EF4444' : colors.bgElevated,
                  borderRadius: 12,
                  paddingVertical: 15,
                  alignItems: 'center',
                  opacity: selectedReason ? 1 : 0.5,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontFamily: 'Inter-SemiBold',
                  }}
                >
                  Submit Report
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

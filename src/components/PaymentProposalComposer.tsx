import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { usePayments } from '../hooks/usePayments';

interface PaymentProposalComposerProps {
  visible: boolean;
  onSubmit: (amountDollars: number, description: string) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

const GOLD = '#F6C90E';
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 10_000;
const DESCRIPTION_LIMIT = 100;

export function PaymentProposalComposer({
  visible,
  onSubmit,
  onClose,
  isSubmitting = false,
}: PaymentProposalComposerProps) {
  const { colors } = useTheme();
  const { calculateFeeBreakdown } = usePayments();
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');

  const amountValue = useMemo(() => {
    const cleaned = amountText.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountText]);

  const breakdown = useMemo(
    () => calculateFeeBreakdown(amountValue),
    [amountValue, calculateFeeBreakdown],
  );

  const outOfRange =
    amountValue > 0 && (amountValue < MIN_AMOUNT || amountValue > MAX_AMOUNT);

  const canSubmit =
    amountValue >= MIN_AMOUNT &&
    amountValue <= MAX_AMOUNT &&
    description.trim().length > 0 &&
    !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(amountValue, description.trim());
  };

  const reset = () => {
    setAmountText('');
    setDescription('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        onPress={handleClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 28,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: 'Inter-Bold',
                fontSize: 20,
                marginBottom: 6,
              }}
            >
              Request Payment
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                lineHeight: 18,
                marginBottom: 20,
              }}
            >
              Set the price for this job. The client reviews and pays through MyKonnect.
            </Text>

            {/* Amount input */}
            <Text style={labelStyle(colors)}>Amount (USD)</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: outOfRange ? '#EF4444' : colors.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 22,
                  fontFamily: 'Inter-Bold',
                  marginRight: 6,
                }}
              >
                $
              </Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  color: colors.textPrimary,
                  fontSize: 22,
                  fontFamily: 'Inter-Bold',
                  padding: 0,
                }}
              />
            </View>
            {outOfRange && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 4 }}>
                Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}.
              </Text>
            )}

            {/* Description */}
            <Text style={[labelStyle(colors), { marginTop: 14 }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, DESCRIPTION_LIMIT))}
              placeholder="What is this payment for?"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.textPrimary,
                fontSize: 15,
                minHeight: 64,
                textAlignVertical: 'top',
              }}
            />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                textAlign: 'right',
                marginTop: 4,
              }}
            >
              {description.length}/{DESCRIPTION_LIMIT}
            </Text>

            {/* Live fee breakdown */}
            <View
              style={{
                marginTop: 16,
                backgroundColor: colors.bgElevated,
                borderRadius: 12,
                padding: 14,
                borderLeftWidth: 3,
                borderLeftColor: GOLD,
              }}
            >
              <Text
                style={{
                  color: GOLD,
                  fontSize: 11,
                  fontFamily: 'Inter-Bold',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Fee preview
              </Text>
              <RowLine label="Gross amount" value={breakdown.grossAmount} colors={colors} />
              <RowLine
                label="MyKonnect fee (8%)"
                value={`− ${breakdown.serviceFee}`}
                colors={colors}
                muted
              />
              <RowLine
                label="You receive"
                value={breakdown.providerReceives}
                colors={colors}
                highlight="#10B981"
                bold
              />
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.textSecondary, fontFamily: 'Inter-SemiBold' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={{
                  flex: 1.6,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: GOLD,
                  opacity: canSubmit ? 1 : 0.4,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0A0E27', fontFamily: 'Inter-Bold', fontSize: 15 }}>
                  Send Payment Request
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function labelStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter-SemiBold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: 6,
  };
}

interface RowLineProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  muted?: boolean;
  bold?: boolean;
  highlight?: string;
}

function RowLine({ label, value, colors, muted, bold, highlight }: RowLineProps) {
  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}
    >
      <Text style={{ color: muted ? colors.textMuted : colors.textSecondary, fontSize: 13 }}>
        {label}
      </Text>
      <Text
        style={{
          color: highlight ?? (muted ? colors.textMuted : colors.textPrimary),
          fontSize: 13,
          fontFamily: bold ? 'Inter-Bold' : 'Inter-SemiBold',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

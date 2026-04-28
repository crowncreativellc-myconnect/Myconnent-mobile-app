import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
} from 'react-native';
import { Avatar } from './Avatar';
import { TrustBadge, TrustScoreBar } from './TrustBadge';
import type { ContactCard } from '../types';

interface ContactCardModalProps {
  contactCard: ContactCard;
  visible: boolean;
  onSave: (card: ContactCard) => void;
  onClose: () => void;
}

const STUB_CARD: ContactCard = {
  user_id: 'stub-user',
  full_name: 'Priya Anand',
  email: 'priya@ventures.io',
  phone: '+1 (617) 555-0194',
  headline: 'CTO · Fintech Ventures',
  avatar_url: null,
  trust_tier: 'Founding',
  trust_score: 91,
  linkedin_url: 'https://linkedin.com/in/priyaanand',
};

export function ContactCardModal({
  contactCard = STUB_CARD,
  visible,
  onSave,
  onClose,
}: ContactCardModalProps) {
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <Animated.View
              className="bg-surface-card rounded-t-3xl border-t border-surface-border"
              style={{ transform: [{ translateY: slideAnim }] }}
            >
              {/* Handle bar */}
              <View className="items-center pt-3 pb-2">
                <View className="w-10 h-1 rounded-full bg-surface-border" />
              </View>

              <ScrollView
                className="px-6 pb-2"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Avatar + name block */}
                <View className="items-center py-5">
                  <Avatar
                    name={contactCard.full_name}
                    avatarUrl={contactCard.avatar_url}
                    trustTier={contactCard.trust_tier}
                    size="xl"
                    showTierRing
                  />
                  <Text className="text-text-primary text-xl font-bold mt-4 text-center">
                    {contactCard.full_name}
                  </Text>
                  <View className="mt-2">
                    <TrustBadge tier={contactCard.trust_tier} score={contactCard.trust_score} showScore />
                  </View>
                  <Text className="text-text-secondary text-sm mt-2 text-center">
                    {contactCard.headline}
                  </Text>
                </View>

                {/* Trust score bar */}
                <TrustScoreBar
                  score={contactCard.trust_score}
                  tier={contactCard.trust_tier}
                  className="mb-5"
                />

                {/* Contact details */}
                <View className="bg-surface-elevated rounded-2xl p-4 mb-4 border border-surface-border">
                  <DetailRow label="Email" value={contactCard.email} />
                  {contactCard.phone && (
                    <DetailRow label="Phone" value={contactCard.phone} />
                  )}
                  {contactCard.linkedin_url && (
                    <DetailRow label="LinkedIn" value={contactCard.linkedin_url} />
                  )}
                  {contactCard.website_url && (
                    <DetailRow label="Website" value={contactCard.website_url} />
                  )}
                </View>
              </ScrollView>

              {/* Actions */}
              <View className="px-6 pb-8 pt-2 gap-y-3">
                <TouchableOpacity
                  onPress={() => onSave(contactCard)}
                  className="bg-brand-accent rounded-2xl py-4 items-center"
                  activeOpacity={0.85}
                >
                  <Text className="text-white text-base font-bold">Save to Phone Contacts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="bg-surface-elevated border border-surface-border rounded-2xl py-3.5 items-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-text-secondary text-base font-medium">Close</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2.5 border-b border-surface-border last:border-b-0">
      <Text className="text-text-muted text-sm w-20">{label}</Text>
      <Text className="text-text-primary text-sm flex-1 text-right" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

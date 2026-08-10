import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Share,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge } from '../../src/components/TrustBadge';
import { Button } from '../../src/components/Button';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { CircleIcon } from '../../src/components/TabIcons';
import { EmptyState } from '../../src/components/EmptyState';
import { formatSkillTag, formatCompletionRate, useReduceMotion } from '../../src/utils';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/hooks/useTheme';
import type { UserProfile } from '../../src/types';

const STUB_CONNECTIONS: UserProfile[] = [
  {
    id: 'c1', email: 'marcus@firm.com', full_name: 'Marcus Webb', avatar_url: null,
    headline: 'Startup Founder · Series A', location: 'Boston, MA',
    bio: 'Building the next wave of B2B SaaS. Ex-Google, ex-Stripe.',
    skill_tags: ['fundraising', 'product_strategy', 'b2b_sales'],
    trust_score: 78, trust_tier: 'Trusted', konnect_points: 340, completion_rate: 0.91,
    response_time_median_hours: 2.4, total_completions: 14, status: 'active', is_premium: true,
    joined_at: '2024-09-01T00:00:00Z', last_active_at: new Date().toISOString(),
  },
  {
    id: 'c2', email: 'priya@ventures.io', full_name: 'Priya Anand', avatar_url: null,
    headline: 'CTO · Fintech Ventures', location: 'NYC',
    bio: 'Full-stack engineering leader. Love building distributed systems.',
    skill_tags: ['react_native', 'typescript', 'python', 'system_design'],
    trust_score: 91, trust_tier: 'Founding', konnect_points: 820, completion_rate: 0.97,
    response_time_median_hours: 1.1, total_completions: 31, status: 'active', is_premium: true,
    joined_at: '2024-07-15T00:00:00Z', last_active_at: new Date().toISOString(),
  },
  {
    id: 'c3', email: 'alex@realty.com', full_name: 'Alex Kimura', avatar_url: null,
    headline: 'Real Estate Attorney', location: 'Boston, MA',
    bio: 'Real estate law, contracts, and commercial leasing.',
    skill_tags: ['real_estate_law', 'contracts', 'commercial_leasing'],
    trust_score: 65, trust_tier: 'Connector', konnect_points: 175, completion_rate: 0.82,
    response_time_median_hours: 4.2, total_completions: 8, status: 'active', is_premium: false,
    joined_at: '2024-11-01T00:00:00Z', last_active_at: new Date().toISOString(),
  },
  {
    id: 'c4', email: 'dana@design.co', full_name: 'Dana Osei', avatar_url: null,
    headline: 'Senior UX Designer', location: 'Remote',
    bio: 'Designing digital products people actually want to use.',
    skill_tags: ['ux_design', 'figma', 'product_design', 'branding'],
    trust_score: 72, trust_tier: 'Connector', konnect_points: 210, completion_rate: 0.88,
    response_time_median_hours: 3.0, total_completions: 11, status: 'active', is_premium: false,
    joined_at: '2024-10-10T00:00:00Z', last_active_at: new Date().toISOString(),
  },
];

interface AnimatedConnectionCardProps {
  profile: UserProfile;
  onPress: (profile: UserProfile) => void;
  index: number;
}

function AnimatedConnectionCard({ profile, onPress, index }: AnimatedConnectionCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, index, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onPress(profile)}
        style={{
          backgroundColor: colors.bgCard,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.borderGlass,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Avatar
            name={profile.full_name}
            avatarUrl={profile.avatar_url}
            trustTier={profile.trust_tier}
            size="md"
            showTierRing
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 15 }}>
                {profile.full_name}
              </Text>
              <TrustBadge tier={profile.trust_tier} size="sm" />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{profile.headline}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{profile.location}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#F6C90E', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>⬡ {profile.trust_score}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {formatCompletionRate(profile.completion_rate)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {profile.skill_tags.slice(0, 4).map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: colors.bgElevated,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{formatSkillTag(tag)}</Text>
            </View>
          ))}
          {profile.skill_tags.length > 4 && (
            <View style={{ backgroundColor: colors.bgElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>+{profile.skill_tags.length - 4}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function InviteModal({
  visible,
  onClose,
  inviterName,
  inviteCode,
}: {
  visible: boolean;
  onClose: () => void;
  inviterName: string;
  inviteCode: string | null;
}) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { colors } = useTheme();

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSend = async () => {
    if (!isValidEmail || !inviteCode) return;
    setIsSending(true);
    try {
      const inviteLink = `https://myconnect.app/join?ref=${inviteCode}`;
      await Share.share({
        message:
          `${inviterName} invited you to join MyKonnect — the professional trust network where every connection is vouched for.\n\n` +
          `Sign up here: ${inviteLink}\n\n` +
          `When asked for an invite code, paste: ${inviteCode}\n\n` +
          `You'll auto-connect to ${inviterName} and both earn +30 Konnect Points.`,
        title: `${inviterName} invited you to MyKonnect`,
      });
      setSent(true);
    } catch {
      // User dismissed
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSent(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 40,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View
            style={{
              width: 40, height: 4, backgroundColor: colors.border,
              borderRadius: 2, alignSelf: 'center', marginBottom: 20,
            }}
          />
          {!sent ? (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: 'Inter-Bold', marginBottom: 8 }}>
                Invite a Trusted Connection
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                Only invite people you've personally worked with or can genuinely vouch for. When they sign up with your code, you're auto-connected as a 1st-degree trusted pair.
              </Text>
              {inviteCode && (
                <View
                  style={{
                    backgroundColor: 'rgba(79,110,247,0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(79,110,247,0.25)',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                    Your invite code
                  </Text>
                  <Text style={{ color: '#4F6EF7', fontSize: 22, fontFamily: 'Inter-Bold', letterSpacing: 3 }}>
                    {inviteCode}
                  </Text>
                </View>
              )}
              <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Their email address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="colleague@company.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                style={{
                  backgroundColor: colors.bgCard,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: colors.textPrimary,
                  fontSize: 16,
                  marginBottom: 24,
                }}
              />
              <Button
                label={isSending ? 'Opening share…' : 'Send Invite'}
                onPress={handleSend}
                isLoading={isSending}
                fullWidth
                size="lg"
                disabled={!isValidEmail || !inviteCode}
              />
              <Button label="Cancel" onPress={handleClose} variant="ghost" fullWidth size="md" className="mt-2" />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>🎉</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: 'Inter-Bold', textAlign: 'center', marginBottom: 8 }}>
                Invite sent!
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
                When they join using your link, you'll both earn{' '}
                <Text style={{ color: '#F6C90E', fontFamily: 'Inter-SemiBold' }}>+30 Konnect Points</Text>.
              </Text>
              <Button label="Done" onPress={handleClose} fullWidth size="lg" />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FilterType = 'all' | 'trusted' | 'founding';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  trusted: 'Trusted+',
  founding: 'Founding',
};

export default function ConnectionsScreen() {
  const { profile } = useSession();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [inviteVisible, setInviteVisible] = useState(false);

  const filters: FilterType[] = ['all', 'trusted', 'founding'];

  const filtered = STUB_CONNECTIONS.filter((c) => {
    const matchSearch =
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.skill_tags.some((t) => t.includes(search.toLowerCase()));
    const matchFilter =
      filter === 'all' ||
      (filter === 'trusted' && (c.trust_tier === 'Trusted' || c.trust_tier === 'Founding')) ||
      (filter === 'founding' && c.trust_tier === 'Founding');
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader
        title="Circle of Trust"
        titleIcon={<CircleIcon size={40} active />}
        rightElement={
          <View style={{ backgroundColor: 'rgba(79,110,247,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: '#4F6EF7', fontSize: 13, fontFamily: 'Inter-SemiBold' }}>
              {STUB_CONNECTIONS.length} connections
            </Text>
          </View>
        }
      />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Search */}
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.textMuted, marginRight: 8 }}>🔍</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or skill…"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.textPrimary, fontSize: 14, backgroundColor: 'transparent' }}
            />
          </View>

          {/* Filter pills */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {filters.map((f) => {
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.75}
                  style={{ borderRadius: 999 }}
                >
                  {active ? (
                    <LinearGradient
                      colors={['#5B7CFA', '#4F6EF7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter-Medium' }}>
                        {FILTER_LABELS[f]}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 7,
                        backgroundColor: colors.bgCard,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: 'Inter-Medium' }}>
                        {FILTER_LABELS[f]}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          renderItem={({ item, index }) => (
            <View style={{ paddingHorizontal: 20 }}>
              <AnimatedConnectionCard
                profile={item}
                index={index}
                onPress={(p) =>
                  router.push({ pathname: '/(app)/connection-detail', params: { id: p.id } })
                }
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              emoji="🔗"
              title="No connections found"
              subtitle="No connections match your search."
            />
          }
          ListFooterComponent={
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 4,
                paddingBottom: 24,
              }}
            >
              <Button
                label="Invite a Trusted Connection"
                onPress={() => setInviteVisible(true)}
                fullWidth
                size="md"
                variant="secondary"
              />
            </View>
          }
          contentContainerStyle={{ paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <InviteModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        inviterName={profile?.full_name ?? 'Someone'}
        inviteCode={profile?.invite_code ?? null}
      />
    </SafeAreaView>
  );
}

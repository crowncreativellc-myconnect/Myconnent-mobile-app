import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Animated, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge, TrustScoreBar } from '../../src/components/TrustBadge';
import { KonnectPointsBadge } from '../../src/components/KonnectPointsBadge';
import { Card, CardHeader } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { ProfileIcon } from '../../src/components/TabIcons';
import { useSession } from '../../src/hooks/useSession';
import { useAuth } from '../../src/hooks/useAuth';
import { formatSkillTag, formatCompletionRate, formatDate, useReduceMotion } from '../../src/utils';
import { useTheme } from '../../src/hooks/useTheme';
import type { ThemeMode } from '../../src/store/themeStore';

export default function ProfileScreen() {
  const { profile } = useSession();
  const { signOut } = useAuth();
  const reduceMotion = useReduceMotion();
  const { colors, mode, setMode } = useTheme();

  const skillAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    if (!profile || reduceMotion) return;
    const anims = profile.skill_tags.map((_, i) => {
      const anim = new Animated.Value(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 250,
        delay: 400 + i * 40,
        useNativeDriver: true,
      }).start();
      return anim;
    });
    skillAnims.splice(0, skillAnims.length, ...anims);
  }, [profile?.skill_tags.length, reduceMotion]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!profile) {
    return <LoadingSpinner label="Loading profile…" />;
  }

  const stats = [
    { label: 'Completions', value: profile.total_completions.toString() },
    { label: 'Completion Rate', value: formatCompletionRate(profile.completion_rate) },
    {
      label: 'Avg Response',
      value: profile.response_time_median_hours != null
        ? `${profile.response_time_median_hours.toFixed(1)}h`
        : '—',
    },
    { label: 'Trust Score', value: `${profile.trust_score}/100` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader
        title="Profile"
        titleIcon={<ProfileIcon size={40} active />}
        rightElement={
          <TouchableOpacity onPress={() => router.push('/(app)/settings')}>
            <Text style={{ color: '#4F6EF7', fontSize: 16 }}>Settings</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Gradient identity card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 20 }}>
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#4F6EF7',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <LinearGradient
              colors={colors.gradientIdentity}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ padding: 24 }}
            >

              <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
                <Avatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  trustTier={profile.trust_tier}
                  size="xl"
                  showTierRing
                />
                <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold', marginTop: 16 }}>
                  {profile.full_name}
                </Text>
                {profile.headline && (
                  <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 4 }}>
                    {profile.headline}
                  </Text>
                )}
                {profile.location && (
                  <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>
                    📍 {profile.location}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <TrustBadge tier={profile.trust_tier} score={profile.trust_score} showScore />
                  <KonnectPointsBadge points={profile.konnect_points} size="sm" />
                </View>

                {profile.is_premium && (
                  <View
                    style={{
                      marginTop: 12,
                      backgroundColor: 'rgba(124,58,237,0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(124,58,237,0.3)',
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: '#7C3AED', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>
                      ✦ Premium Member
                    </Text>
                  </View>
                )}
              </View>

              {profile.bio && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingTop: 16,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
                    {profile.bio}
                  </Text>
                </View>
              )}

              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: 16,
                  marginTop: 16,
                }}
              >
                <Button
                  label="Edit Profile"
                  variant="secondary"
                  fullWidth
                  size="sm"
                  onPress={() => router.push('/(app)/profile-edit')}
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Trust score bar */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Card variant="bordered">
            <CardHeader>
              <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 16 }}>Trust & Reputation</Text>
            </CardHeader>
            <TrustScoreBar score={profile.trust_score} tier={profile.trust_tier} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 18 }}>
              Your score is calculated from completion rate, review quality, response time, peer vouching, and recent activity.
            </Text>
          </Card>
        </View>

        {/* Stats grid — glass morphism */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 12 }}>Activity</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {stats.map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.glassStat,
                  {
                    flex: 1,
                    minWidth: '40%',
                    alignItems: 'center',
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: colors.glassSurface,
                    borderColor: colors.glassBorder,
                  },
                ]}
              >
                <View style={[styles.glassHighlight, { backgroundColor: colors.glassHighlight }]} />
                <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold' }}>{stat.value}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Skills — staggered entrance */}
        {profile.skill_tags.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 12 }}>Skills</Text>
            <Card variant="bordered">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.skill_tags.map((tag, i) => {
                  const anim = skillAnims[i] ?? new Animated.Value(1);
                  return (
                    <Animated.View
                      key={tag}
                      style={{ opacity: anim, transform: [{ scale: anim }] }}
                    >
                      <View
                        style={{
                          backgroundColor: 'rgba(79,110,247,0.1)',
                          borderWidth: 1,
                          borderColor: 'rgba(79,110,247,0.2)',
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#4F6EF7', fontSize: 14, fontFamily: 'Inter-Medium' }}>
                          {formatSkillTag(tag)}
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </Card>
          </View>
        )}

        {/* Member since */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
            Member since {formatDate(profile.joined_at)}
          </Text>
        </View>

        {/* Appearance */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 12 }}>
            Appearance
          </Text>
          <Card variant="bordered">
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>Theme</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['light', 'system', 'dark'] as ThemeMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: mode === m ? '#4F6EF7' : colors.glassSurface,
                    borderWidth: 1,
                    borderColor: mode === m ? '#4F6EF7' : colors.border,
                  }}
                >
                  <Text style={{ color: mode === m ? '#FFFFFF' : colors.textMuted, fontSize: 13, fontFamily: 'Inter-SemiBold' }}>
                    {m === 'system' ? 'Auto' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* Sign Out */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <TouchableOpacity onPress={handleSignOut} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: '#EF4444', fontSize: 16, fontFamily: 'Inter-SemiBold' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassStat: {
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});

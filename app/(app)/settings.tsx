import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { useSession } from '../../src/hooks/useSession';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/lib/supabase';
import type { ThemeColors } from '../../src/theme';

interface SettingRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  colors: ThemeColors;
}

function SettingRow({ label, value, onPress, rightElement, destructive, colors }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.65 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ flex: 1, fontSize: 16, color: destructive ? '#EF4444' : colors.textPrimary }}>
        {label}
      </Text>
      {value && (
        <Text style={{ color: colors.textMuted, fontSize: 14, marginRight: 8 }}>{value}</Text>
      )}
      {rightElement}
      {onPress && !rightElement && (
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { profile } = useSession();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState({
    shoutMatched: true,
    shoutAccepted: true,
    reviewReceived: true,
    connectionRequest: true,
    pointsEarned: false,
    digest: true,
  });

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of MyConnect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: 'myconnect://reset-password',
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your inbox', `A password reset link has been sent to ${profile.email}.`);
    }
  };

  const handleChangeEmail = () => {
    Alert.prompt(
      'Change Email',
      'Enter your new email address:',
      async (newEmail) => {
        if (!newEmail?.trim()) return;
        const { error } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() });
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert(
            'Confirm your new email',
            `A confirmation link has been sent to ${newEmail.trim()}. Click it to complete the change.`,
          );
        }
      },
      'plain-text',
      profile?.email ?? '',
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your profile, trust score, and all Konnect Points. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: () => {} },
      ],
    );
  };

  const SectionLabel = ({ title }: { title: string }) => (
    <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
      {title}
    </Text>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Text style={{ color: '#4F6EF7', fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold' }}>Settings</Text>
        </View>

        {/* Profile summary */}
        {profile && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Card variant="bordered">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  trustTier={profile.trust_tier}
                  size="md"
                  showTierRing
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 16 }}>{profile.full_name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 2 }}>{profile.email}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Account */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <SectionLabel title="Account" />
          <Card variant="bordered">
            <SettingRow colors={colors} label="Edit Profile" onPress={() => router.push('/(app)/profile-edit')} />
            <SettingRow colors={colors} label="Change Email" onPress={handleChangeEmail} />
            <SettingRow colors={colors} label="Change Password" onPress={handleChangePassword} />
            <SettingRow colors={colors} label="Subscription" value={profile?.is_premium ? 'Premium' : 'Free'} onPress={() => {}} />
          </Card>
        </View>

        {/* Notifications */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <SectionLabel title="Notifications" />
          <Card variant="bordered">
            {(
              [
                { key: 'shoutMatched', label: 'Shout-out matched to me' },
                { key: 'shoutAccepted', label: 'My shout-out accepted' },
                { key: 'reviewReceived', label: 'Review received' },
                { key: 'connectionRequest', label: 'Connection requests' },
                { key: 'pointsEarned', label: 'Points earned' },
                { key: 'digest', label: 'Weekly digest email' },
              ] as const
            ).map(({ key, label }) => (
              <SettingRow
                key={key}
                colors={colors}
                label={label}
                rightElement={
                  <Switch
                    value={notifications[key]}
                    onValueChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                    trackColor={{ false: colors.border, true: '#4F6EF7' }}
                    thumbColor="#ffffff"
                  />
                }
              />
            ))}
          </Card>
        </View>

        {/* Privacy & Trust */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <SectionLabel title="Privacy & Trust" />
          <Card variant="bordered">
            <SettingRow colors={colors} label="Who can see my trust score" value="Circle only" onPress={() => {}} />
            <SettingRow colors={colors} label="Who can shout-out to me" value="My circle" onPress={() => {}} />
            <SettingRow colors={colors} label="Review visibility" value="Score only" onPress={() => {}} />
            <SettingRow colors={colors} label="Data & Privacy Policy" onPress={() => {}} />
          </Card>
        </View>

        {/* Support */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <SectionLabel title="Support" />
          <Card variant="bordered">
            <SettingRow colors={colors} label="Help Center" onPress={() => {}} />
            <SettingRow colors={colors} label="Contact Support" onPress={() => {}} />
            <SettingRow colors={colors} label="Terms of Service" onPress={() => {}} />
            <SettingRow colors={colors} label="App version" value="1.0.0" />
          </Card>
        </View>

        {/* Danger zone */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Card variant="bordered">
            <SettingRow colors={colors} label="Sign Out" onPress={handleSignOut} destructive />
            <SettingRow colors={colors} label="Delete Account" onPress={handleDeleteAccount} destructive />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { useSession } from '../../src/hooks/useSession';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/lib/supabase';

interface SettingRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

function SettingRow({ label, value, onPress, rightElement, destructive }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.65 : 1}
      className="flex-row items-center py-3.5 border-b border-surface-border last:border-b-0"
    >
      <Text className={`flex-1 text-base ${destructive ? 'text-brand-danger' : 'text-text-primary'}`}>
        {label}
      </Text>
      {value && <Text className="text-text-muted text-sm mr-2">{value}</Text>}
      {rightElement}
      {onPress && !rightElement && (
        <Text className="text-text-muted text-base">›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { profile } = useSession();
  const { signOut, isLoading } = useAuth();
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
      Alert.alert(
        'Check your inbox',
        `A password reset link has been sent to ${profile.email}.`,
      );
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

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-center px-5 pt-4 mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Text className="text-brand-primary text-base">← Back</Text>
          </TouchableOpacity>
          <Text className="text-text-primary text-2xl font-bold">Settings</Text>
        </View>

        {profile && (
          <View className="px-5 mb-6">
            <Card variant="bordered">
              <View className="flex-row items-center">
                <Avatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  trustTier={profile.trust_tier}
                  size="md"
                  showTierRing
                />
                <View className="ml-3">
                  <Text className="text-text-primary font-semibold">{profile.full_name}</Text>
                  <Text className="text-text-muted text-sm">{profile.email}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        <View className="px-5 mb-5">
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">Account</Text>
          <Card variant="bordered">
            <SettingRow label="Edit Profile" onPress={() => router.push('/(app)/profile-edit')} />
            <SettingRow label="Change Email" onPress={handleChangeEmail} />
            <SettingRow label="Change Password" onPress={handleChangePassword} />
            <SettingRow label="Subscription" value={profile?.is_premium ? 'Premium' : 'Free'} onPress={() => {}} />
          </Card>
        </View>

        <View className="px-5 mb-5">
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">Notifications</Text>
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
                label={label}
                rightElement={
                  <Switch
                    value={notifications[key]}
                    onValueChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                    trackColor={{ false: '#2A3060', true: '#4F6EF7' }}
                    thumbColor="#ffffff"
                  />
                }
              />
            ))}
          </Card>
        </View>

        <View className="px-5 mb-5">
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">Privacy & Trust</Text>
          <Card variant="bordered">
            <SettingRow label="Who can see my trust score" value="Circle only" onPress={() => {}} />
            <SettingRow label="Who can shout-out to me" value="My circle" onPress={() => {}} />
            <SettingRow label="Review visibility" value="Score only" onPress={() => {}} />
            <SettingRow label="Data & Privacy Policy" onPress={() => {}} />
          </Card>
        </View>

        <View className="px-5 mb-5">
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">Support</Text>
          <Card variant="bordered">
            <SettingRow label="Help Center" onPress={() => {}} />
            <SettingRow label="Contact Support" onPress={() => {}} />
            <SettingRow label="Terms of Service" onPress={() => {}} />
            <SettingRow label="App version" value="1.0.0" />
          </Card>
        </View>

        <View className="px-5 mb-5">
          <Card variant="bordered">
            <SettingRow label="Sign Out" onPress={handleSignOut} destructive />
            <SettingRow label="Delete Account" onPress={handleDeleteAccount} destructive />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

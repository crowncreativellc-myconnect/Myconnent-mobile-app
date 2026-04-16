import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Avatar } from '../../src/components/Avatar';
import { useSession } from '../../src/hooks/useSession';
import { useAuthStore } from '../../src/store/authStore';
import { db } from '../../src/lib/supabase';
import { formatSkillTag } from '../../src/utils';
import type { UserProfile } from '../../src/types';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View className="mb-4">
      <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-1.5">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#4A5578"
        multiline={multiline}
        maxLength={maxLength}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-text-primary text-base"
        style={multiline ? { minHeight: 96 } : undefined}
      />
      {maxLength && (
        <Text className="text-text-muted text-xs text-right mt-1">
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

export default function ProfileEditScreen() {
  const { profile } = useSession();
  const setProfile = useAuthStore((s) => s.setProfile);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [skillTags, setSkillTags] = useState<string[]>(profile?.skill_tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!tag || skillTags.includes(tag) || skillTags.length >= 10) return;
    setSkillTags((prev) => [...prev, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setSkillTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    if (!fullName.trim()) {
      Alert.alert('Required', 'Full name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        full_name: fullName.trim(),
        headline: headline.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        skill_tags: skillTags,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await db
        .profiles()
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      // Sync updated profile into Zustand store
      setProfile({ ...profile, ...(data as UserProfile) });

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-surface-border">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-text-secondary text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-text-primary font-bold text-base">Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text className={`text-base font-semibold ${isSaving ? 'text-text-muted' : 'text-brand-primary'}`}>
              {isSaving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <View className="px-5 pt-5">
            {/* Avatar (display only) */}
            <View className="items-center mb-6">
              <Avatar
                name={fullName || profile.full_name}
                avatarUrl={profile.avatar_url}
                trustTier={profile.trust_tier}
                size="xl"
                showTierRing
              />
              <Text className="text-text-muted text-xs mt-2">
                Avatar upload coming soon
              </Text>
            </View>

            {/* Fields */}
            <Card variant="bordered" className="mb-4">
              <Field
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                maxLength={60}
              />
              <Field
                label="Headline"
                value={headline}
                onChangeText={setHeadline}
                placeholder="e.g. Startup Founder · Series A"
                maxLength={80}
              />
              <Field
                label="Location"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. New York, NY"
                maxLength={60}
              />
              <View className="mb-0">
                <Field
                  label="Bio"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell your circle what you're about…"
                  multiline
                  maxLength={300}
                />
              </View>
            </Card>

            {/* Skill tags */}
            <Card variant="bordered">
              <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-3">
                Skills ({skillTags.length}/10)
              </Text>

              {/* Existing tags */}
              {skillTags.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {skillTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => handleRemoveTag(tag)}
                      className="flex-row items-center bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-2.5 py-1 gap-x-1.5"
                    >
                      <Text className="text-brand-primary text-xs font-medium">
                        {formatSkillTag(tag)}
                      </Text>
                      <Text className="text-brand-primary text-xs">✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Add tag input */}
              {skillTags.length < 10 && (
                <View className="flex-row items-center gap-x-2">
                  <TextInput
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleAddTag}
                    placeholder="Add a skill (e.g. contract_law)"
                    placeholderTextColor="#4A5578"
                    returnKeyType="done"
                    autoCapitalize="none"
                    className="flex-1 bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                  />
                  <TouchableOpacity
                    onPress={handleAddTag}
                    disabled={!tagInput.trim()}
                    className="bg-brand-primary rounded-xl px-4 py-2.5"
                    style={{ opacity: tagInput.trim() ? 1 : 0.4 }}
                  >
                    <Text className="text-white text-sm font-semibold">Add</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text className="text-text-muted text-xs mt-2">
                Tap a skill to remove it. Spaces become underscores.
              </Text>
            </Card>

            <Button
              label={isSaving ? 'Saving…' : 'Save Changes'}
              onPress={handleSave}
              isLoading={isSaving}
              fullWidth
              size="lg"
              className="mt-5"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

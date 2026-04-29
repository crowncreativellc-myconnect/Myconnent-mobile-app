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
import { useShoutStore } from '../../src/store/shoutStore';
import { useTheme } from '../../src/hooks/useTheme';
import { db } from '../../src/lib/supabase';
import { useAvatarUpload } from '../../src/hooks/useAvatarUpload';
import { useModeration } from '../../src/hooks/useModeration';
import { formatSkillTag } from '../../src/utils';
import { runLocalModeration, normaliseInput } from '../../src/utils/moderationPatterns';
import type { UserProfile } from '../../src/types';

// Words that have legit professional meaning in a sentence (e.g. "sex therapist"
// in a broadcast) but never as a standalone skill tag. Kept here rather than in
// shared patterns so the broadcast composer doesn't false-positive on them.
const SKILL_BARE_WORD_DENYLIST = new Set([
  'sex', 'sexy', 'nude', 'nudes', 'naked',
]);

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        maxLength={maxLength}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          {
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: colors.textPrimary,
            fontSize: 16,
            fontFamily: 'Inter',
          },
          multiline ? { minHeight: 96 } : undefined,
        ]}
      />
      {maxLength && (
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 4 }}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

export default function ProfileEditScreen() {
  const { profile } = useSession();
  const setProfile = useAuthStore((s) => s.setProfile);
  const patchAuthorInShouts = useShoutStore((s) => s.patchAuthorInShouts);
  const { colors } = useTheme();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [skillTags, setSkillTags] = useState<string[]>(profile?.skill_tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { pickAndUpload, isUploading } = useAvatarUpload();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const { runPreScreen, isScreening: isScreeningTag } = useModeration();

  const handleAvatarPress = async () => {
    const url = await pickAndUpload();
    if (url) setAvatarUrl(url);
  };

  const handleAddTag = async () => {
    const raw = tagInput.trim().toLowerCase();
    const tag = raw.replace(/\s+/g, '_');
    if (!tag || skillTags.includes(tag) || skillTags.length >= 10) return;

    // Skill-specific bare-word denylist — catches single-word skills that the
    // shared sentence-context patterns let through (e.g. "sex" alone).
    if (SKILL_BARE_WORD_DENYLIST.has(raw)) {
      Alert.alert(
        'Skill not allowed',
        'This is not appropriate as a professional skill on MyKonnect.',
      );
      return;
    }

    // Screen against explicit / illegal / sexual terms before adding.
    // Use the spaced form so \b word boundaries work (underscore is a word char).
    const screenResult = await runPreScreen(raw);
    if (!screenResult.passed) {
      Alert.alert(
        'Skill not allowed',
        screenResult.reason ??
          'This skill contains content that is not permitted on MyKonnect.',
      );
      return;
    }

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

    // Local-pattern moderation on the free-text fields before save.
    // Layer 1 only (no API call) keeps this fast and avoids three round-trips.
    const fieldsToScreen: Array<{ label: string; value: string }> = [
      { label: 'Full Name', value: fullName },
      { label: 'Headline', value: headline },
      { label: 'Bio', value: bio },
    ];
    for (const { label, value } of fieldsToScreen) {
      if (!value.trim()) continue;
      const local = runLocalModeration(normaliseInput(value));
      if (!local.passed) {
        Alert.alert(
          `${label} not allowed`,
          local.reason ??
            'This field contains content that is not permitted on MyKonnect.',
        );
        return;
      }
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

      const updated = data as UserProfile;
      setProfile({ ...profile, ...updated });
      patchAuthorInShouts(profile.id, {
        full_name: updated.full_name,
        headline: updated.headline,
        avatar_url: updated.avatar_url,
        skill_tags: updated.skill_tags,
        trust_tier: updated.trust_tier,
        trust_score: updated.trust_score,
      });

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 16 }}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: isSaving ? colors.textMuted : '#4F6EF7' }}>
              {isSaving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            {/* Avatar */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity
                onPress={handleAvatarPress}
                disabled={isUploading}
                activeOpacity={0.75}
                style={{ position: 'relative' }}
              >
                <Avatar
                  name={fullName || profile.full_name}
                  avatarUrl={avatarUrl}
                  trustTier={profile.trust_tier}
                  size="xl"
                  showTierRing
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: '#4F6EF7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: colors.bg,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>📷</Text>
                </View>
              </TouchableOpacity>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
                {isUploading ? 'Uploading…' : 'Tap to change photo'}
              </Text>
            </View>

            {/* Fields */}
            <Card variant="bordered" style={{ marginBottom: 16 }}>
              <Field label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your full name" maxLength={60} colors={colors} />
              <Field label="Headline" value={headline} onChangeText={setHeadline} placeholder="e.g. Startup Founder · Series A" maxLength={80} colors={colors} />
              <Field label="Location" value={location} onChangeText={setLocation} placeholder="e.g. New York, NY" maxLength={60} colors={colors} />
              <View style={{ marginBottom: 0 }}>
                <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell your circle what you're about…" multiline maxLength={300} colors={colors} />
              </View>
            </Card>

            {/* Skill tags */}
            <Card variant="bordered">
              <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Skills ({skillTags.length}/10)
              </Text>

              {skillTags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {skillTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => handleRemoveTag(tag)}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79,110,247,0.1)', borderWidth: 1, borderColor: 'rgba(79,110,247,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, gap: 6 }}
                    >
                      <Text style={{ color: '#4F6EF7', fontSize: 12, fontFamily: 'Inter-Medium' }}>
                        {formatSkillTag(tag)}
                      </Text>
                      <Text style={{ color: '#4F6EF7', fontSize: 12 }}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {skillTags.length < 10 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleAddTag}
                    placeholder="Add a skill (e.g. contract_law)"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    autoCapitalize="none"
                    style={{ flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, fontFamily: 'Inter' }}
                  />
                  <TouchableOpacity
                    onPress={handleAddTag}
                    disabled={!tagInput.trim() || isScreeningTag}
                    style={{ backgroundColor: '#4F6EF7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, opacity: tagInput.trim() && !isScreeningTag ? 1 : 0.4 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter-SemiBold' }}>
                      {isScreeningTag ? 'Checking…' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
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

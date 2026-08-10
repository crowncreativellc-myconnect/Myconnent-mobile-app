import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { Button } from '../../src/components/Button';
import { useTheme } from '../../src/hooks/useTheme';
import { useSession } from '../../src/hooks/useSession';
import { useAuth } from '../../src/hooks';
import { supabase, db } from '../../src/lib/supabase';
import { hashContactBatch } from '../../src/lib/contactHashing';

type Stage = 'intro' | 'working' | 'done' | 'skipped';

export default function OnboardingContactsScreen() {
  const { colors } = useTheme();
  const { profile } = useSession();
  const { refreshProfile } = useAuth();
  const [stage, setStage] = useState<Stage>('intro');
  const [progressMsg, setProgressMsg] = useState('');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [bridgeCount, setBridgeCount] = useState(0);

  async function markOnboardedAndContinue() {
    if (!profile?.id) return;
    await db.profiles().update({ contacts_onboarded: true }).eq('id', profile.id);
    await refreshProfile();
    router.replace('/(app)');
  }

  async function handleSkip() {
    setStage('skipped');
    await markOnboardedAndContinue();
  }

  async function handleImport() {
    if (!profile?.id) return;
    setStage('working');

    // 1. Permission
    setProgressMsg('Requesting contacts permission…');
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Contacts Permission Needed',
        'MyKonnect needs your contacts to find silent bridges with other testers. You can grant this later in Settings.',
        [
          { text: 'Skip for now', style: 'cancel', onPress: () => void handleSkip() },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      setStage('intro');
      return;
    }

    // 2. Read
    setProgressMsg('Reading your address book…');
    const { data: rawContacts } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });

    // 3. Collect + normalize + hash on device
    setProgressMsg('Hashing on your device…');
    const emails: string[] = [];
    const phones: string[] = [];
    for (const c of rawContacts) {
      if (c.emails) for (const e of c.emails) if (e.email) emails.push(e.email);
      if (c.phoneNumbers) for (const p of c.phoneNumbers) if (p.number) phones.push(p.number);
    }
    const hashedRows = await hashContactBatch({ emails, phones });

    if (hashedRows.length === 0) {
      Alert.alert('No usable contacts', 'We couldn\'t find any usable phone numbers or emails in your address book.');
      setStage('intro');
      return;
    }

    // 4. Upload in chunks (upsert is idempotent by unique (user_id, hash, hash_type))
    setProgressMsg(`Uploading ${hashedRows.length} hashes…`);
    const CHUNK = 500;
    const payload = hashedRows.map((row) => ({ ...row, user_id: profile.id }));
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const { error } = await db.hashed_contacts().upsert(slice, {
        onConflict: 'user_id,hash,hash_type',
        ignoreDuplicates: true,
      });
      if (error) {
        console.error('[onboarding-contacts] upload error:', error.message);
        Alert.alert('Upload failed', error.message);
        setStage('intro');
        return;
      }
    }
    setUploadedCount(hashedRows.length);

    // 5. Query bridges — the immediate value moment
    setProgressMsg('Finding your silent 2nd-degree bridges…');
    const { data: bridges, error: bridgeErr } = await supabase.rpc('get_contact_bridged_users', {
      start_user_id: profile.id,
    });
    if (bridgeErr) {
      console.error('[onboarding-contacts] bridge lookup error:', bridgeErr.message);
    }
    setBridgeCount(bridges?.length ?? 0);

    // 6. Mark onboarded so we don't nag again — but stay on-screen so user sees the result.
    await db.profiles().update({ contacts_onboarded: true }).eq('id', profile.id);
    await refreshProfile();
    setStage('done');
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={colors.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
            <View
              style={{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: 'rgba(79,110,247,0.12)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 40 }}>{stage === 'done' ? '✨' : '🤝'}</Text>
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontFamily: 'Inter-Bold', textAlign: 'center' }}>
              {stage === 'done' ? 'You\'re bridged in' : 'Grow your trust network'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {stage === 'done'
                ? `We uploaded ${uploadedCount} on-device hashes and found ${bridgeCount} silent 2nd-degree ${bridgeCount === 1 ? 'connection' : 'connections'} already.`
                : 'MyKonnect can find silent 2nd-degree connections through people you both know — even if that shared person hasn\'t signed up yet.'}
            </Text>
          </View>

          {stage === 'intro' && (
            <>
              <View
                style={{
                  backgroundColor: colors.bgCard,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Row emoji="🔐" title="Your contacts never leave your phone as plain text" body="Phone numbers and emails are hashed on-device with SHA-256. Only the hashes reach our servers." />
                <Row emoji="🕸️" title="Shared contacts bridge you silently" body="When another tester's address book contains the same person you do, you both quietly become 2nd-degree — no one has to sign up." />
                <Row emoji="⬡" title="First shout-out finds real matches" body="Density from day one so your first Broadcast pulls someone useful instead of returning empty." last />
              </View>

              <Button label="Import & hash my contacts" onPress={handleImport} fullWidth size="lg" />
              <TouchableOpacity onPress={handleSkip} style={{ marginTop: 12, paddingVertical: 12 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
                  Skip for now
                </Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'working' && (
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                {progressMsg}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                {Platform.OS === 'ios' ? 'iOS may take a few seconds for large address books.' : ''}
              </Text>
            </View>
          )}

          {stage === 'done' && (
            <>
              <View
                style={{
                  backgroundColor: 'rgba(79,110,247,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(79,110,247,0.25)',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#4F6EF7', fontSize: 13, fontFamily: 'Inter-SemiBold', marginBottom: 4 }}>
                  Silent bridges: {bridgeCount}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                  These are testers you share at least one hashed contact with. Your next shout-out will see them at 2nd-degree without either of you doing anything.
                </Text>
              </View>
              <Button label="Continue to MyKonnect" onPress={() => router.replace('/(app)')} fullWidth size="lg" />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ emoji, title, body, last }: { emoji: string; title: string; body: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', marginBottom: last ? 0 : 14 }}>
      <Text style={{ fontSize: 20, marginRight: 12 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Inter-SemiBold', marginBottom: 2 }}>
          {title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{body}</Text>
      </View>
    </View>
  );
}

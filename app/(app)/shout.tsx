import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge } from '../../src/components/TrustBadge';
import { useShouts } from '../../src/hooks/useShouts';
import { useModeration } from '../../src/hooks/useModeration';
import { formatSkillTag, URGENCY_LABELS, URGENCY_COLORS, useReduceMotion } from '../../src/utils';
import { useTheme } from '../../src/hooks/useTheme';
import { ShoutIcon } from '../../src/components/ShoutIcon';
import { formatDegreeLabel } from '../../src/lib/degreeMatching';
import { db } from '../../src/lib/supabase';
import type { DegreeExpansionResult, ShoutParseResult, UserProfile } from '../../src/types';

type ScreenStep = 'compose' | 'preview' | 'sent';

const MAX_CHARS = 500;

const EXAMPLE_PROMPTS = [
  'Need a contract lawyer to review an NDA — quick turnaround',
  'Looking for a senior React Native developer for a 2-week sprint',
  'Need a financial advisor to help structure my equity package',
  'Looking for a UX designer to improve my onboarding flow',
];

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Character Progress Ring ──────────────────────────────────────────────────
function CharacterProgressRing({ count, max }: { count: number; max: number }) {
  const { colors } = useTheme();
  if (count < 10) return null;

  const size = 36;
  const bw = 3;
  const pct = Math.min(count / max, 1.05);
  const over = count > max;
  const near = count > max * 0.8;
  const color = over ? '#EF4444' : near ? '#F59E0B' : '#4F6EF7';

  // Half-circle fill technique
  // Phase 1 (0–50%): fill right half by rotating from -180 → 0
  // Phase 2 (50–100%): fill left half by rotating from -180 → 0
  const phase1 = Math.min(pct, 0.5) / 0.5; // 0→1 over first half
  const phase2 = pct > 0.5 ? (pct - 0.5) / 0.5 : 0; // 0→1 over second half
  const rot1Deg = (phase1 - 1) * 180; // -180 → 0
  const rot2Deg = (phase2 - 1) * 180; // -180 → 0

  return (
    <View style={{ width: size, height: size }}>
      {/* Background track */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0,
          width: size, height: size, borderRadius: size / 2,
          borderWidth: bw, borderColor: colors.border,
        }}
      />

      {/* Right fill (first 180°) */}
      <View style={{ position: 'absolute', top: 0, left: size / 2, width: size / 2, height: size, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute', top: 0, right: 0,
            width: size, height: size, borderRadius: size / 2,
            borderWidth: bw, borderColor: color,
            transform: [{ rotate: `${rot1Deg}deg` }],
          }}
        />
      </View>

      {/* Left fill (second 180°, only when > 50%) */}
      {pct > 0.5 && (
        <View style={{ position: 'absolute', top: 0, left: 0, width: size / 2, height: size, overflow: 'hidden' }}>
          <View
            style={{
              position: 'absolute', top: 0, left: 0,
              width: size, height: size, borderRadius: size / 2,
              borderWidth: bw, borderColor: color,
              transform: [{ rotate: `${rot2Deg}deg` }],
            }}
          />
        </View>
      )}

      {/* Center indicator */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0,
          width: size, height: size,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 9, fontFamily: 'Inter-Bold', color, lineHeight: 11 }}>
          {over ? `+${count - max}` : `${max - count}`}
        </Text>
      </View>
    </View>
  );
}

// ─── Animated Example Prompt ──────────────────────────────────────────────────
function PromptChip({ prompt, onPress }: { prompt: string; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.97, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(borderAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(borderAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, 'rgba(79,110,247,0.4)'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={{
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>"{prompt}"</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ShoutScreen() {
  const { parseInput, createShout, draftParse, isParsing, isCreating, clearDraft } = useShouts();
  const { runPreScreen, moderationResult, isScreening, clearModeration } = useModeration();
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();

  const [step, setStep] = useState<ScreenStep>('compose');
  const [rawText, setRawText] = useState('');
  const [localParse, setLocalParse] = useState<ShoutParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  // Match previews resolved to full profiles, for the "Who will see this" row
  const [matchProfiles, setMatchProfiles] = useState<
    Array<{ match: DegreeExpansionResult; profile: UserProfile }>
  >([]);

  // AI confidence pulse animation
  const confidencePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step !== 'preview' || reduceMotion) return;
    Animated.sequence([
      Animated.spring(confidencePulse, { toValue: 1.1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.spring(confidencePulse, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [step, reduceMotion, confidencePulse]);

  // Hydrate match previews (profile lookups) when entering the preview step.
  useEffect(() => {
    if (step !== 'preview') return;
    const parse = localParse ?? draftParse;
    const matches = parse?.matches ?? [];
    if (matches.length === 0) {
      setMatchProfiles([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ids = matches.map((m) => m.matched_user_id);
        const { data, error } = await db.profiles().select('*').in('id', ids);
        if (error || !data || cancelled) return;
        const profileById = new Map<string, UserProfile>(
          (data as UserProfile[]).map((p) => [p.id, p]),
        );
        const resolved = matches
          .map((m) => {
            const profile = profileById.get(m.matched_user_id);
            return profile ? { match: m, profile } : null;
          })
          .filter((x): x is { match: DegreeExpansionResult; profile: UserProfile } => x !== null);
        setMatchProfiles(resolved);
      } catch (err) {
        console.error('[shout] match hydration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, localParse, draftParse]);

  // Debounced pre-screen
  useEffect(() => {
    if (rawText.trim().length < 10) {
      clearModeration();
      return;
    }
    const timer = setTimeout(() => {
      runPreScreen(rawText);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawText]);

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (moderationResult !== null) clearModeration();
  };

  const isButtonDisabled =
    rawText.trim().length < 10 ||
    isScreening ||
    (moderationResult !== null && !moderationResult.passed);

  const buttonLabel = isParsing
    ? 'Analyzing with AI…'
    : isScreening
    ? 'Checking content…'
    : 'Analyze & Preview';

  const handleParse = async () => {
    if (!rawText.trim() || rawText.trim().length < 10) {
      setParseError('Please describe what you need in a bit more detail.');
      return;
    }

    let currentResult = moderationResult;
    if (currentResult === null) {
      currentResult = await runPreScreen(rawText);
    }

    if (currentResult && !currentResult.passed) {
      setParseError('Please revise your shout-out before continuing.');
      return;
    }

    setParseError(null);

    const result = await parseInput(rawText);
    if (result.error) {
      const fallback: ShoutParseResult = {
        skill_tags: ['professional_services'],
        urgency: 'routine',
        complexity: 'simple_task',
        format: 'async',
        draft_text: rawText.trim(),
        confidence: 0.7,
      };
      setLocalParse(fallback);
    } else if (result.data) {
      setLocalParse(result.data);
    }
    setStep('preview');
  };

  const handleSend = async () => {
    const parse = localParse ?? draftParse;
    if (!parse) return;
    const result = await createShout(parse, rawText);
    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }
    setStep('sent');
  };

  const handleReset = () => {
    setRawText('');
    setLocalParse(null);
    setParseError(null);
    setStep('compose');
    clearDraft();
    clearModeration();
  };

  const parse = localParse ?? draftParse;

  // ─── Compose ─────────────────────────────────────────────────────────────────
  if (step === 'compose') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: 'Inter-Bold' }}>Broadcast</Text>
                <ShoutIcon size={44} active={true} />
              </View>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 16 }}>
              Describe what you need. Our AI reads it, finds the right people in your circle, and routes it silently.
            </Text>

            {/* Text input */}
            <View
              style={{
                backgroundColor: colors.bgCard,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                minHeight: 140,
              }}
            >
              <TextInput
                value={rawText}
                onChangeText={handleTextChange}
                placeholder="e.g. Need a contract lawyer to review an NDA — quick turnaround…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24, flex: 1, minHeight: 110 }}
              />
            </View>

            {/* Moderation feedback */}
            {moderationResult !== null && !moderationResult.passed && (
              <View style={{ marginBottom: 16, gap: 12 }}>
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 18 }}>🚫</Text>
                    <Text style={{ color: '#EF4444', fontFamily: 'Inter-Bold', fontSize: 16, flex: 1 }}>
                      This shout-out is not allowed
                    </Text>
                  </View>
                  <Text style={{ color: '#EF4444', fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
                    {moderationResult.reason}
                  </Text>
                  {moderationResult.category && (
                    <View
                      style={{
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        alignSelf: 'flex-start',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>
                        {formatCategoryLabel(moderationResult.category)}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: 'rgba(239,68,68,0.65)', fontSize: 11, fontFamily: 'Inter-Medium' }}>
                    Repeated violations may result in account suspension.
                  </Text>
                </View>

                {moderationResult.suggestion && (
                  <View
                    style={{
                      backgroundColor: colors.bgElevated,
                      borderRadius: 16,
                      padding: 16,
                      borderLeftWidth: 3,
                      borderLeftColor: '#4F6EF7',
                    }}
                  >
                    <Text style={{ color: '#4F6EF7', fontSize: 11, fontFamily: 'Inter-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      Try rephrasing as:
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                      {moderationResult.suggestion}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {parseError && !moderationResult && (
              <Text style={{ color: '#EF4444', fontSize: 14, marginBottom: 16 }}>{parseError}</Text>
            )}

            {/* Analyze button + character ring */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={buttonLabel}
                  onPress={handleParse}
                  isLoading={isParsing || isScreening}
                  fullWidth
                  size="lg"
                  disabled={isButtonDisabled}
                  activeOpacity={isButtonDisabled ? 1 : 0.75}
                />
              </View>
              <CharacterProgressRing count={rawText.length} max={MAX_CHARS} />
            </View>

            {/* Character count */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Be specific — better input = better matches</Text>
              <Text style={{ color: rawText.length > 400 ? '#F59E0B' : colors.textMuted, fontSize: 12 }}>
                {rawText.length}/{MAX_CHARS}
              </Text>
            </View>

            {/* Example prompts */}
            <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Example shout-outs
            </Text>
            <View style={{ gap: 8 }}>
              {EXAMPLE_PROMPTS.map((prompt) => (
                <PromptChip
                  key={prompt}
                  prompt={prompt}
                  onPress={() => handleTextChange(prompt)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Preview ─────────────────────────────────────────────────────────────────
  if (step === 'preview' && parse) {
    const urgencyColor = URGENCY_COLORS[parse.urgency];

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold' }}>Preview</Text>
              <TouchableOpacity onPress={() => setStep('compose')}>
                <Text style={{ color: '#4F6EF7', fontSize: 16 }}>← Edit</Text>
              </TouchableOpacity>
            </View>

            {/* AI confidence banner */}
            <View
              style={{
                backgroundColor: 'rgba(16,185,129,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(16,185,129,0.2)',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#10B981', fontSize: 14, fontFamily: 'Inter-SemiBold', marginRight: 8 }}>✓ AI parsed</Text>
              <Animated.Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  transform: [{ scale: confidencePulse }],
                }}
              >
                {Math.round(parse.confidence * 100)}% confidence
              </Animated.Text>
            </View>

            {/* Drafted shout */}
            <Card variant="elevated" className="mb-5">
              <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Your Shout-Out
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24 }}>{parse.draft_text}</Text>
            </Card>

            {/* Extracted attributes */}
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: 'Inter-SemiBold', marginBottom: 12 }}>
              What AI detected
            </Text>

            <View style={{ gap: 12, marginBottom: 20 }}>
              {/* Skill tags */}
              <Card variant="bordered">
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Skills needed</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {parse.skill_tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: 'rgba(79,110,247,0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(79,110,247,0.2)',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: '#4F6EF7', fontSize: 12, fontFamily: 'Inter-Medium' }}>
                        {formatSkillTag(tag)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              {/* Meta row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { label: 'Urgency', value: URGENCY_LABELS[parse.urgency], color: urgencyColor },
                  { label: 'Complexity', value: parse.complexity.replace('_', ' '), color: colors.textPrimary },
                  { label: 'Format', value: parse.format.replace('_', ' '), color: colors.textPrimary },
                ].map(({ label, value, color }) => (
                  <Card key={label} variant="bordered" style={{ flex: 1 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{label}</Text>
                    <Text style={{ color, fontFamily: 'Inter-SemiBold', fontSize: 14, textTransform: 'capitalize' }}>{value}</Text>
                  </Card>
                ))}
              </View>
            </View>

            {/* Who will see this — real match previews from the AI engine */}
            {matchProfiles.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    fontFamily: 'Inter-SemiBold',
                    marginBottom: 12,
                  }}
                >
                  {matchProfiles.every((m) => m.match.degree === 1)
                    ? 'Best matches in your circle'
                    : 'Best matches — including 2nd degree'}
                </Text>
                <View style={{ gap: 10 }}>
                  {matchProfiles.slice(0, 3).map(({ match, profile: p }) => (
                    <Card key={p.id} variant="bordered">
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Avatar
                          name={p.full_name}
                          avatarUrl={p.avatar_url}
                          trustTier={p.trust_tier}
                          size="xs"
                          showTierRing
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
                              {p.full_name}
                            </Text>
                            <TrustBadge tier={p.trust_tier} size="sm" />
                          </View>
                          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                            {formatDegreeLabel(match.degree)} · Trust {p.trust_score}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {/* Matching note */}
            <View
              style={{
                backgroundColor: colors.bgCard,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 16,
                marginBottom: 32,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                🎯 The AI Matching Engine will silently route this to the{' '}
                <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold' }}>2–3 best-fit connections</Text>{' '}
                in your circle — not a broadcast to everyone.
              </Text>
            </View>

            {/* CTA — dominant primary action */}
            <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
              <TouchableOpacity onPress={handleSend} disabled={isCreating} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#5B7CFA', '#4F6EF7', '#4460E8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 20,
                    shadowColor: '#4F6EF7',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Inter-Bold' }}>
                    {isCreating ? 'Broadcasting…' : 'Broadcast to My Circle'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Button
              label="Edit Shout-Out"
              onPress={() => setStep('compose')}
              variant="ghost"
              fullWidth
              size="md"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Sent ─────────────────────────────────────────────────────────────────────
  if (step === 'sent') {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        edges={['top']}
      >
        <View style={{ marginBottom: 24 }}>
          <ShoutIcon size={80} active />
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold', textAlign: 'center', marginBottom: 12 }}>
          Broadcast sent!
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 }}>
          The AI matched your request to the best-fit connections in your circle.
          When your match responds and both of you confirm, a private chat will open here in the app.
        </Text>
        <View
          style={{
            backgroundColor: 'rgba(246,201,14,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(246,201,14,0.25)',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 16,
            marginBottom: 40,
            width: '100%',
          }}
        >
          <Text style={{ color: '#F6C90E', fontSize: 14, textAlign: 'center', fontFamily: 'Inter-SemiBold' }}>
            ⬡ You'll earn +50 Konnect Points once both parties mark the job complete inside the chat.
          </Text>
        </View>
        <Button
          label="Back to Feed"
          onPress={() => { handleReset(); router.replace('/(app)'); }}
          fullWidth
          size="lg"
        />
        <Button
          label="Broadcast Another"
          onPress={handleReset}
          variant="ghost"
          fullWidth
          size="md"
          className="mt-3"
        />
      </SafeAreaView>
    );
  }

  return <LoadingSpinner label="Loading…" />;
}

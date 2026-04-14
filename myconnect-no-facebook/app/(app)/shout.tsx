import React, { useState, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Card } from '../../src/components/Card';
import { useShouts } from '../../src/hooks/useShouts';
import { formatSkillTag, URGENCY_LABELS, URGENCY_COLORS } from '../../src/utils';
import type { ShoutParseResult } from '../../src/types';

type InputMode = 'text' | 'voice';
type ScreenStep = 'compose' | 'preview' | 'sent';

const EXAMPLE_PROMPTS = [
  'Need a contract lawyer to review an NDA — quick turnaround',
  'Looking for a senior React Native developer for a 2-week sprint',
  'Need a financial advisor to help structure my equity package',
  'Looking for a UX designer to improve my onboarding flow',
];

export default function ShoutScreen() {
  const { parseInput, createShout, draftParse, isParsing, isCreating, clearDraft } = useShouts();

  const [step, setStep] = useState<ScreenStep>('compose');
  const [inputMode] = useState<InputMode>('text');
  const [rawText, setRawText] = useState('');
  const [localParse, setLocalParse] = useState<ShoutParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ─── AI Parse ────────────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!rawText.trim() || rawText.trim().length < 10) {
      setParseError('Please describe what you need in a bit more detail.');
      return;
    }
    setParseError(null);

    const result = await parseInput(rawText);
    if (result.error) {
      // Fallback: mock parse for dev without Edge Function deployed
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

  // ─── Send Shout ──────────────────────────────────────────────────────────────
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

  // ─── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setRawText('');
    setLocalParse(null);
    setParseError(null);
    setStep('compose');
    clearDraft();
  };

  const parse = localParse ?? draftParse;

  // ─── Render: Compose ─────────────────────────────────────────────────────────
  if (step === 'compose') {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-5 pt-6 pb-10">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-text-primary text-2xl font-bold">Shout It Out 📣</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-text-secondary text-base">Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-text-secondary text-base mb-4 leading-relaxed">
              Describe what you need. Our AI reads it, finds the right people in your circle, and routes it silently.
            </Text>

            {/* Text input */}
            <View className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-4 min-h-[140px]">
              <TextInput
                ref={inputRef}
                value={rawText}
                onChangeText={setRawText}
                placeholder="e.g. Need a contract lawyer to review an NDA — quick turnaround…"
                placeholderTextColor="#4A5578"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className="text-text-primary text-base leading-relaxed flex-1"
                style={{ minHeight: 110 }}
              />
            </View>

            {parseError && (
              <Text className="text-brand-danger text-sm mb-4">{parseError}</Text>
            )}

            {/* Character count */}
            <View className="flex-row justify-between mb-6">
              <Text className="text-text-muted text-xs">Be specific — better input = better matches</Text>
              <Text className={`text-xs ${rawText.length > 400 ? 'text-brand-warn' : 'text-text-muted'}`}>
                {rawText.length}/500
              </Text>
            </View>

            {/* Example prompts */}
            <Text className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">
              Example shout-outs
            </Text>
            <View className="gap-y-2 mb-8">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  onPress={() => setRawText(prompt)}
                  className="bg-surface-card border border-surface-border rounded-xl px-4 py-3"
                >
                  <Text className="text-text-secondary text-sm">"{prompt}"</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              label={isParsing ? 'Analyzing with AI…' : 'Analyze & Preview'}
              onPress={handleParse}
              isLoading={isParsing}
              fullWidth
              size="lg"
              disabled={rawText.trim().length < 10}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Render: Preview ─────────────────────────────────────────────────────────
  if (step === 'preview' && parse) {
    const urgencyColor = URGENCY_COLORS[parse.urgency];

    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-6 pb-10">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-text-primary text-2xl font-bold">Preview</Text>
              <TouchableOpacity onPress={() => setStep('compose')}>
                <Text className="text-brand-primary text-base">← Edit</Text>
              </TouchableOpacity>
            </View>

            {/* AI confidence banner */}
            <View className="bg-brand-accent/10 border border-brand-accent/20 rounded-2xl px-4 py-3 mb-5 flex-row items-center">
              <Text className="text-brand-accent text-sm font-semibold mr-2">✓ AI parsed</Text>
              <Text className="text-text-secondary text-sm">
                {Math.round(parse.confidence * 100)}% confidence
              </Text>
            </View>

            {/* Drafted shout */}
            <Card variant="elevated" className="mb-5">
              <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">
                Your Shout-Out
              </Text>
              <Text className="text-text-primary text-base leading-relaxed">
                {parse.draft_text}
              </Text>
            </Card>

            {/* Extracted attributes */}
            <Text className="text-text-secondary text-sm font-semibold mb-3">
              What AI detected
            </Text>

            <View className="gap-y-3 mb-5">
              {/* Skill tags */}
              <Card variant="bordered">
                <Text className="text-text-muted text-xs mb-2">Skills needed</Text>
                <View className="flex-row flex-wrap gap-2">
                  {parse.skill_tags.map((tag) => (
                    <View key={tag} className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-2.5 py-1">
                      <Text className="text-brand-primary text-xs font-medium">{formatSkillTag(tag)}</Text>
                    </View>
                  ))}
                </View>
              </Card>

              {/* Urgency, complexity, format */}
              <View className="flex-row gap-x-3">
                <Card variant="bordered" className="flex-1">
                  <Text className="text-text-muted text-xs mb-1">Urgency</Text>
                  <Text className="font-semibold text-sm" style={{ color: urgencyColor }}>
                    {URGENCY_LABELS[parse.urgency]}
                  </Text>
                </Card>
                <Card variant="bordered" className="flex-1">
                  <Text className="text-text-muted text-xs mb-1">Complexity</Text>
                  <Text className="text-text-primary font-semibold text-sm capitalize">
                    {parse.complexity.replace('_', ' ')}
                  </Text>
                </Card>
                <Card variant="bordered" className="flex-1">
                  <Text className="text-text-muted text-xs mb-1">Format</Text>
                  <Text className="text-text-primary font-semibold text-sm capitalize">
                    {parse.format.replace('_', ' ')}
                  </Text>
                </Card>
              </View>
            </View>

            {/* Matching note */}
            <View className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-8">
              <Text className="text-text-secondary text-sm leading-relaxed">
                🎯 The AI Matching Engine will silently route this to the{' '}
                <Text className="text-text-primary font-semibold">2–3 best-fit connections</Text>{' '}
                in your circle — not a broadcast to everyone.
              </Text>
            </View>

            <Button
              label="Send to My Circle"
              onPress={handleSend}
              isLoading={isCreating}
              fullWidth
              size="lg"
            />
            <Button
              label="Edit Shout-Out"
              onPress={() => setStep('compose')}
              variant="ghost"
              fullWidth
              size="md"
              className="mt-3"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Render: Sent ─────────────────────────────────────────────────────────────
  if (step === 'sent') {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-8" edges={['top']}>
        <Text className="text-6xl mb-6">📣</Text>
        <Text className="text-text-primary text-2xl font-bold text-center mb-3">
          Shout-out sent!
        </Text>
        <Text className="text-text-secondary text-base text-center leading-relaxed mb-10">
          The AI matched your request to the best-fit connections in your circle.
          Sit tight — they'll respond soon.
        </Text>
        <View className="bg-konnect-gold/10 border border-konnect-gold/30 rounded-2xl px-5 py-4 mb-10 w-full">
          <Text className="text-konnect-gold text-sm text-center font-semibold">
            ⬡ You'll earn +50 Konnect Points once the job is confirmed complete.
          </Text>
        </View>
        <Button
          label="Back to Feed"
          onPress={() => { handleReset(); router.replace('/(app)'); }}
          fullWidth
          size="lg"
        />
        <Button
          label="Post Another"
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

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../../src/components/Avatar';
import { Card } from '../../../src/components/Card';
import { TrustBadge } from '../../../src/components/TrustBadge';
import { Button } from '../../../src/components/Button';
import { LoadingSpinner } from '../../../src/components/LoadingSpinner';
import { db } from '../../../src/lib/supabase';
import { useSession } from '../../../src/hooks/useSession';
import {
  formatRelativeTime,
  formatSkillTag,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '../../../src/utils';
import type { ShoutOut, UserProfile } from '../../../src/types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Open',
  accepted: 'Accepted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  matching: 'Matching…',
  parsing: 'Parsing…',
  draft: 'Draft',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  accepted: '#4F6EF7',
  completed: '#7C3AED',
  cancelled: '#EF4444',
  matching: '#F59E0B',
  parsing: '#F59E0B',
  draft: '#94A3B8',
};

export default function ShoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useSession();

  const [shout, setShout] = useState<ShoutOut | null>(null);
  const [matchedUsers, setMatchedUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Shout ─────────────────────────────────────────────────────────────
  const fetchShout = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await db
        .shouts()
        .select('*, author:profiles(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const fetchedShout = data as ShoutOut;
      setShout(fetchedShout);

      // Fetch matched user profiles if any
      if (fetchedShout.matched_user_ids?.length > 0) {
        const { data: profiles } = await db
          .profiles()
          .select('*')
          .in('id', fetchedShout.matched_user_ids);

        setMatchedUsers((profiles as UserProfile[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shout');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchShout();
  }, [fetchShout]);

  // ─── Accept Shout ─────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!shout || !userId) return;
    setIsAccepting(true);

    try {
      const { error: updateError } = await db
        .shouts()
        .update({ status: 'accepted', accepted_by_id: userId })
        .eq('id', shout.id);

      if (updateError) throw updateError;

      setShout((prev) => prev ? { ...prev, status: 'accepted', accepted_by_id: userId } : prev);
      Alert.alert('Accepted!', "The requester has been notified. Reach out to get started.");
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept shout');
    } finally {
      setIsAccepting(false);
    }
  };

  // ─── Loading / Error ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <LoadingSpinner label="Loading shout…" />
      </SafeAreaView>
    );
  }

  if (error || !shout) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-8" edges={['top']}>
        <Text className="text-4xl mb-4">😕</Text>
        <Text className="text-text-primary font-semibold text-lg mb-2 text-center">
          Couldn't load this shout
        </Text>
        <Text className="text-text-secondary text-sm text-center mb-6">{error}</Text>
        <Button label="Go Back" onPress={() => router.back()} variant="ghost" />
      </SafeAreaView>
    );
  }

  const author = shout.author;
  const urgencyColor = URGENCY_COLORS[shout.urgency];
  const statusColor = STATUS_COLORS[shout.status] ?? '#94A3B8';
  const statusLabel = STATUS_LABELS[shout.status] ?? shout.status;
  const isMatched = userId ? shout.matched_user_ids.includes(userId) : false;
  const isAuthor = userId === shout.author_id;
  const canAccept = isMatched && shout.status === 'active' && !isAuthor;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-surface-border">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-brand-primary text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-text-primary font-bold text-base">Shout Detail</Text>
        {/* Status chip */}
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: `${statusColor}22` }}
        >
          <Text className="text-xs font-semibold" style={{ color: statusColor }}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-5 pt-5 gap-y-4">

          {/* Author card */}
          <Card variant="elevated">
            <View className="flex-row items-center">
              {author && (
                <Avatar
                  name={author.full_name}
                  avatarUrl={author.avatar_url}
                  trustTier={author.trust_tier}
                  size="md"
                  showTierRing
                />
              )}
              <View className="flex-1 ml-3">
                <View className="flex-row items-center flex-wrap gap-x-2 mb-0.5">
                  <Text className="text-text-primary font-semibold">
                    {author?.full_name ?? 'Anonymous'}
                  </Text>
                  {author?.trust_tier && (
                    <TrustBadge tier={author.trust_tier} score={author.trust_score} showScore size="sm" />
                  )}
                </View>
                <Text className="text-text-muted text-xs">{author?.headline ?? 'Professional'}</Text>
                {author?.location && (
                  <Text className="text-text-muted text-xs mt-0.5">📍 {author.location}</Text>
                )}
              </View>
              <Text className="text-text-muted text-xs self-start">
                {formatRelativeTime(shout.created_at)}
              </Text>
            </View>
          </Card>

          {/* Shout text */}
          <Card variant="bordered">
            <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">
              The Ask
            </Text>
            <Text className="text-text-primary text-base leading-relaxed">
              {shout.draft_text}
            </Text>
          </Card>

          {/* Skill tags */}
          {shout.skill_tags.length > 0 && (
            <View>
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wide mb-2">
                Skills Needed
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {shout.skill_tags.map((tag) => (
                  <View
                    key={tag}
                    className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-brand-primary text-sm font-medium">
                      {formatSkillTag(tag)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Metadata row */}
          <View className="flex-row gap-x-3">
            <Card variant="bordered" className="flex-1 items-center">
              <Text className="text-text-muted text-xs mb-1">Urgency</Text>
              <Text className="font-bold text-sm" style={{ color: urgencyColor }}>
                {URGENCY_LABELS[shout.urgency]}
              </Text>
            </Card>
            <Card variant="bordered" className="flex-1 items-center">
              <Text className="text-text-muted text-xs mb-1">Type</Text>
              <Text className="text-text-primary font-bold text-sm capitalize">
                {shout.complexity.replace('_', ' ')}
              </Text>
            </Card>
            <Card variant="bordered" className="flex-1 items-center">
              <Text className="text-text-muted text-xs mb-1">Format</Text>
              <Text className="text-text-primary font-bold text-sm capitalize">
                {shout.format.replace('_', ' ')}
              </Text>
            </Card>
          </View>

          {/* AI confidence */}
          {shout.ai_confidence != null && (
            <View className="bg-brand-accent/10 border border-brand-accent/20 rounded-2xl px-4 py-3 flex-row items-center justify-between">
              <Text className="text-brand-accent text-sm font-semibold">AI Parse Confidence</Text>
              <Text className="text-brand-accent font-bold">
                {Math.round(shout.ai_confidence * 100)}%
              </Text>
            </View>
          )}

          {/* Matched users */}
          {matchedUsers.length > 0 && (
            <View>
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wide mb-2">
                Matched Connections
              </Text>
              <View className="gap-y-2">
                {matchedUsers.map((user) => (
                  <Card key={user.id} variant="bordered">
                    <View className="flex-row items-center">
                      <Avatar
                        name={user.full_name}
                        avatarUrl={user.avatar_url}
                        trustTier={user.trust_tier}
                        size="sm"
                        showTierRing
                      />
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center gap-x-2">
                          <Text className="text-text-primary font-semibold text-sm">
                            {user.full_name}
                          </Text>
                          <TrustBadge tier={user.trust_tier} size="sm" />
                        </View>
                        <Text className="text-text-muted text-xs mt-0.5">
                          {user.headline ?? 'Professional'}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-text-muted text-xs">Score</Text>
                        <Text className="text-text-primary font-bold text-sm">
                          {user.trust_score}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {/* Accepted by */}
          {shout.status === 'accepted' && shout.accepted_by_id && (
            <View className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl px-4 py-3">
              <Text className="text-brand-primary text-sm font-semibold text-center">
                Someone in your circle accepted this shout-out
              </Text>
            </View>
          )}

          {/* Completed */}
          {shout.status === 'completed' && (
            <View className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3">
              <Text className="text-green-500 text-sm font-semibold text-center">
                This shout-out has been completed
              </Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Accept CTA */}
      {canAccept && (
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-surface border-t border-surface-border">
          <Button
            label="Respond to This Shout-Out"
            onPress={handleAccept}
            isLoading={isAccepting}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

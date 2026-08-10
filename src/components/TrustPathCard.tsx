import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from './Avatar';
import { TrustBadge } from './TrustBadge';
import type { SecondDegreeMatch } from '../types';

interface TrustPathCardProps {
  match: SecondDegreeMatch;
}

function ordinal(n: number): string {
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export function TrustPathCard({ match }: TrustPathCardProps) {
  const { bridge_contact, recommended_user, final_score, degree, ghost_bridge_count } = match;
  const degreeLabel = ordinal(degree ?? 2);
  const isGhostBridge = !!ghost_bridge_count && ghost_bridge_count > 0;

  return (
    <View className="mt-3 bg-brand-primary/8 border border-brand-primary/20 rounded-2xl px-4 py-3">
      {/* Label */}
      <View className="flex-row items-center mb-3">
        <View className="w-1.5 h-1.5 rounded-full bg-brand-primary mr-2" />
        <Text className="text-brand-primary text-xs font-semibold uppercase tracking-wide">
          {degreeLabel}-degree match · {isGhostBridge ? 'via shared contacts' : 'via your circle'}
        </Text>
        <View className="ml-auto bg-brand-primary/15 rounded-full px-2 py-0.5">
          <Text className="text-brand-primary text-xs font-bold">
            {Math.round(final_score * 100)}% match
          </Text>
        </View>
      </View>

      {/* Trust path row */}
      <View className="flex-row items-center">
        {/* You */}
        <View className="items-center">
          <View className="w-8 h-8 rounded-full bg-surface-elevated border border-surface-border items-center justify-center">
            <Text className="text-text-muted text-xs font-semibold">You</Text>
          </View>
        </View>

        {/* Arrow */}
        <View className="flex-1 flex-row items-center mx-1">
          <View className="flex-1 h-px bg-brand-primary/30" />
          <Text className="text-brand-primary/60 text-xs mx-0.5">›</Text>
        </View>

        {/* Bridge — real member OR ghost bridge */}
        {isGhostBridge ? (
          <View className="items-center">
            <View className="w-8 h-8 rounded-full bg-surface-elevated border border-dashed border-brand-primary/40 items-center justify-center">
              <Text className="text-brand-primary text-xs font-bold">
                {ghost_bridge_count}
              </Text>
            </View>
            <Text className="text-text-muted text-[10px] mt-1 max-w-[64px] text-center" numberOfLines={2}>
              shared {ghost_bridge_count === 1 ? 'contact' : 'contacts'}
            </Text>
          </View>
        ) : bridge_contact ? (
          <View className="items-center">
            <Avatar
              name={bridge_contact.full_name}
              avatarUrl={bridge_contact.avatar_url}
              trustTier={bridge_contact.trust_tier}
              size="sm"
              showTierRing
            />
            <Text className="text-text-muted text-xs mt-1 max-w-[56px] text-center" numberOfLines={1}>
              {bridge_contact.full_name.split(' ')[0]}
            </Text>
            <TrustBadge tier={bridge_contact.trust_tier} size="sm" />
          </View>
        ) : null}

        {/* Arrow */}
        <View className="flex-1 flex-row items-center mx-1">
          <View className="flex-1 h-px bg-brand-primary/30" />
          <Text className="text-brand-primary/60 text-xs mx-0.5">›</Text>
        </View>

        {/* Recommended user */}
        <View className="items-center">
          <Avatar
            name={recommended_user.full_name}
            avatarUrl={recommended_user.avatar_url}
            trustTier={recommended_user.trust_tier}
            size="sm"
            showTierRing
          />
          <Text className="text-text-muted text-xs mt-1 max-w-[56px] text-center" numberOfLines={1}>
            {recommended_user.full_name.split(' ')[0]}
          </Text>
          <TrustBadge tier={recommended_user.trust_tier} size="sm" />
        </View>
      </View>

      {/* Caption */}
      <Text className="text-text-muted text-xs mt-3 leading-relaxed">
        {isGhostBridge ? (
          <>
            <Text className="text-text-secondary font-medium">
              {ghost_bridge_count} shared {ghost_bridge_count === 1 ? 'contact' : 'contacts'}
            </Text>
            <Text> silently bridge you to </Text>
            <Text className="text-text-secondary font-medium">{recommended_user.full_name}</Text>
          </>
        ) : bridge_contact ? (
          <>
            <Text className="text-text-secondary font-medium">{bridge_contact.full_name}</Text>
            {(degree ?? 2) === 2 ? ' knows ' : ' is connected to '}
            {(degree ?? 2) > 2 && <Text>someone who knows </Text>}
            {(degree ?? 2) > 3 && <Text>someone who knows </Text>}
            {(degree ?? 2) > 4 && <Text>someone who knows </Text>}
            <Text className="text-text-secondary font-medium">{recommended_user.full_name}</Text>
          </>
        ) : null}
        {recommended_user.trust_score != null && (
          <Text> · Trust score {recommended_user.trust_score}/100</Text>
        )}
      </Text>
    </View>
  );
}

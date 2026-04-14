import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { TrustBadge } from './TrustBadge';
import { cn, formatRelativeTime, formatSkillTag, URGENCY_LABELS, URGENCY_COLORS } from '../utils';
import type { ShoutOut } from '../types';

interface ShoutCardProps {
  shout: ShoutOut;
  onPress?: (shout: ShoutOut) => void;
  onAccept?: (shoutId: string) => void;
  isMatched?: boolean;
  className?: string;
}

export function ShoutCard({
  shout,
  onPress,
  onAccept,
  isMatched = false,
  className,
}: ShoutCardProps) {
  const author = shout.author;
  const urgencyColor = URGENCY_COLORS[shout.urgency];
  const urgencyLabel = URGENCY_LABELS[shout.urgency];

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={() => onPress?.(shout)}
    >
      <Card
        variant={isMatched ? 'elevated' : 'bordered'}
        className={cn('', className)}
      >
        {/* Matched indicator */}
        {isMatched && (
          <View className="flex-row items-center mb-3 -mt-1">
            <View className="w-2 h-2 rounded-full bg-brand-accent mr-2" />
            <Text className="text-brand-accent text-xs font-semibold tracking-wide uppercase">
              Matched for you
            </Text>
          </View>
        )}

        {/* Header */}
        <View className="flex-row items-start mb-3">
          {author && (
            <Avatar
              name={author.full_name}
              avatarUrl={author.avatar_url}
              trustTier={author.trust_tier}
              size="sm"
              showTierRing
            />
          )}
          <View className="flex-1 ml-3">
            <View className="flex-row items-center flex-wrap gap-x-2">
              <Text className="text-text-primary font-semibold text-sm">
                {author?.full_name ?? 'Anonymous'}
              </Text>
              {author?.trust_tier && (
                <TrustBadge tier={author.trust_tier} size="sm" />
              )}
            </View>
            <Text className="text-text-muted text-xs mt-0.5">
              {author?.headline ?? 'Professional'} · {formatRelativeTime(shout.created_at)}
            </Text>
          </View>

          {/* Urgency chip */}
          <View
            className="rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: `${urgencyColor}22` }}
          >
            <Text className="text-xs font-semibold" style={{ color: urgencyColor }}>
              {urgencyLabel}
            </Text>
          </View>
        </View>

        {/* Shout text */}
        <Text className="text-text-primary text-base leading-relaxed mb-3">
          {shout.draft_text}
        </Text>

        {/* Skill tags */}
        {shout.skill_tags.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-3">
            {shout.skill_tags.slice(0, 5).map((tag) => (
              <View
                key={tag}
                className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-2.5 py-1"
              >
                <Text className="text-brand-primary text-xs font-medium">
                  {formatSkillTag(tag)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-x-3">
            <Text className="text-text-muted text-xs capitalize">{shout.format.replace('_', ' ')}</Text>
            <Text className="text-text-muted text-xs">·</Text>
            <Text className="text-text-muted text-xs capitalize">{shout.complexity.replace('_', ' ')}</Text>
          </View>

          {isMatched && onAccept && shout.status === 'active' && (
            <TouchableOpacity
              onPress={() => onAccept(shout.id)}
              className="bg-brand-accent rounded-xl px-4 py-1.5"
            >
              <Text className="text-white text-sm font-semibold">Respond</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

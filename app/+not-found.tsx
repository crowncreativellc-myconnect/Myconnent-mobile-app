import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center px-8">
      <Text className="text-6xl mb-6">🔗</Text>
      <Text className="text-text-primary text-2xl font-bold text-center mb-3">
        Connection not found
      </Text>
      <Text className="text-text-secondary text-base text-center leading-relaxed mb-10">
        This page doesn't exist in your circle. It may have been removed or the link is incorrect.
      </Text>
      <Button
        label="Back to Home"
        onPress={() => router.replace('/(app)')}
        fullWidth
        size="lg"
      />
    </SafeAreaView>
  );
}

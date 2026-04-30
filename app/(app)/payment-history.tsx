import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { useTheme } from '../../src/hooks/useTheme';

export default function PaymentHistoryScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 16,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Text style={{ color: '#4F6EF7', fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          <Text
            style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold' }}
          >
            Payment History
          </Text>
        </View>

        <EmptyState
          emoji="💳"
          title="Coming soon"
          subtitle="Your past payments and payouts will appear here once payment history is enabled."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

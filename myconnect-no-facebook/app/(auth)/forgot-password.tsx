import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useAuth } from '../../src/hooks';

type ScreenState = 'form' | 'sent';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>('form');

  const handleReset = async () => {
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email);
    setIsLoading(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      setScreenState('sent');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-6 pt-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-10">
          <Text className="text-brand-primary text-base">← Back</Text>
        </TouchableOpacity>

        {screenState === 'form' ? (
          <>
            <Text className="text-text-primary text-2xl font-bold mb-2">
              Reset your password
            </Text>
            <Text className="text-text-secondary text-base mb-8 leading-relaxed">
              Enter the email tied to your MyConnect account and we'll send you a reset link.
            </Text>

            {error && (
              <View className="bg-brand-danger/10 border border-brand-danger/30 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-brand-danger text-sm">{error}</Text>
              </View>
            )}

            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Button
              label="Send Reset Link"
              onPress={handleReset}
              isLoading={isLoading}
              fullWidth
              size="lg"
              className="mt-6"
            />
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-5xl mb-6">✉️</Text>
            <Text className="text-text-primary text-2xl font-bold mb-3 text-center">
              Check your inbox
            </Text>
            <Text className="text-text-secondary text-base text-center leading-relaxed mb-8">
              We sent a password reset link to{'\n'}
              <Text className="text-text-primary font-semibold">{email}</Text>
            </Text>
            <Button
              label="Back to Sign In"
              onPress={() => router.replace('/(auth)/login')}
              variant="secondary"
              fullWidth
              size="lg"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

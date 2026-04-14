import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useAuth } from '../../src/hooks';

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setErrors({});
    const result = await signIn(form.email, form.password);
    if (result.error) {
      setErrors({ general: result.error.message });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Wordmark */}
            <View className="mb-12">
              <Text className="text-brand-primary text-4xl font-bold tracking-tight">
                MyConnect
              </Text>
              <Text className="text-text-secondary text-base mt-2">
                Hired through a friend, not a stranger.
              </Text>
            </View>

            <Text className="text-text-primary text-2xl font-bold mb-6">
              Welcome back
            </Text>

            {errors.general && (
              <View className="bg-brand-danger/10 border border-brand-danger/30 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-brand-danger text-sm">{errors.general}</Text>
              </View>
            )}

            <View className="gap-y-4">
              <Input
                label="Email"
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
              />

              <Input
                label="Password"
                value={form.password}
                onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                error={errors.password}
                rightIcon={
                  <Text className="text-brand-primary text-sm">
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                }
                onRightIconPress={() => setShowPassword((s) => !s)}
              />

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                className="self-end -mt-1"
              >
                <Text className="text-brand-primary text-sm">Forgot password?</Text>
              </TouchableOpacity>

              <Button
                label="Sign In"
                onPress={handleSignIn}
                isLoading={isLoading}
                fullWidth
                size="lg"
                className="mt-2"
              />
            </View>

            <View className="bg-surface-card border border-surface-border rounded-2xl p-4 mt-8 mb-6">
              <Text className="text-text-secondary text-sm text-center leading-relaxed">
                🔒 Every connection on MyConnect is vouched for.{'\n'}Your network. Your trust.
              </Text>
            </View>

            <View className="flex-row justify-center mt-auto">
              <Text className="text-text-secondary">New to MyConnect? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text className="text-brand-primary font-semibold">Join the network</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

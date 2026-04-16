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
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const SKILL_SUGGESTIONS = [
  'Contract Law', 'Product Design', 'Python Dev', 'Financial Planning',
  'Real Estate', 'Copywriting', 'iOS Dev', 'Marketing Strategy',
];

export default function RegisterScreen() {
  const { signUp, signInWithFacebook, isLoading } = useAuth();
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.fullName.trim() || form.fullName.trim().split(' ').length < 2) {
      newErrors.fullName = 'Enter your full name';
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setErrors({});
    const result = await signUp(form.email, form.password, form.fullName.trim());
    if (result.error) {
      setErrors({ general: result.error.message });
    }
  };

  const handleFacebookSignIn = async () => {
    setErrors({});
    const result = await signInWithFacebook();
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
          <View className="flex-1 px-6 pt-8 pb-8">
            <TouchableOpacity onPress={() => router.back()} className="mb-8">
              <Text className="text-brand-primary text-base">← Back</Text>
            </TouchableOpacity>

            <Text className="text-text-primary text-2xl font-bold mb-1">
              Join the network
            </Text>
            <Text className="text-text-secondary text-sm mb-8">
              Build your professional trust circle from day one.
            </Text>

            {errors.general && (
              <View className="bg-brand-danger/10 border border-brand-danger/30 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-brand-danger text-sm">{errors.general}</Text>
              </View>
            )}

            <View className="gap-y-4">
              <Input
                label="Full Name"
                value={form.fullName}
                onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
                placeholder="Jordan Taylor"
                autoCapitalize="words"
                autoComplete="name"
                error={errors.fullName}
              />
              <Input
                label="Work Email"
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="jordan@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
              />
              <Input
                label="Password"
                value={form.password}
                onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                placeholder="Min. 8 characters"
                secureTextEntry={!showPassword}
                error={errors.password}
                rightIcon={
                  <Text className="text-brand-primary text-sm">
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                }
                onRightIconPress={() => setShowPassword((s) => !s)}
              />
              <Input
                label="Confirm Password"
                value={form.confirmPassword}
                onChangeText={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
                placeholder="Re-enter your password"
                secureTextEntry={!showPassword}
                error={errors.confirmPassword}
              />
            </View>

            <View className="mt-6 mb-6">
              <Text className="text-text-secondary text-sm font-medium mb-3">
                What do you offer? (optional — helps AI matching)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map((skill) => {
                  const selected = selectedSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      onPress={() => toggleSkill(skill)}
                      className={`rounded-xl px-3 py-1.5 border ${
                        selected
                          ? 'bg-brand-primary border-brand-primary'
                          : 'bg-surface-card border-surface-border'
                      }`}
                    >
                      <Text className={`text-sm ${selected ? 'text-white font-semibold' : 'text-text-secondary'}`}>
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="bg-konnect-gold/10 border border-konnect-gold/30 rounded-2xl p-4 mb-6">
              <Text className="text-konnect-gold text-sm font-semibold mb-1">
                ⬡ Early access — Founding Member status
              </Text>
              <Text className="text-text-secondary text-xs leading-relaxed">
                Join now and receive a permanent Founding badge — a signal of credibility early members carry forever.
              </Text>
            </View>

            <Button
              label="Create Account"
              onPress={handleSignUp}
              isLoading={isLoading}
              fullWidth
              size="lg"
            />

            {/* Divider */}
            <View className="flex-row items-center gap-x-3 my-5">
              <View className="flex-1 h-px bg-surface-border" />
              <Text className="text-text-muted text-sm">or</Text>
              <View className="flex-1 h-px bg-surface-border" />
            </View>

            {/* Facebook OAuth */}
            <TouchableOpacity
              onPress={handleFacebookSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-x-3 bg-[#1877F2] rounded-2xl py-4 px-6"
              style={{ opacity: isLoading ? 0.6 : 1 }}
            >
              <Text className="text-white text-lg font-bold">f</Text>
              <Text className="text-white font-semibold text-base">Continue with Facebook</Text>
            </TouchableOpacity>

            <Text className="text-text-muted text-xs text-center mt-4">
              By joining, you agree to our Terms of Service and Privacy Policy.
            </Text>

            <View className="flex-row justify-center mt-6">
              <Text className="text-text-secondary">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text className="text-brand-primary font-semibold">Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useAuth } from '../../src/hooks';
import { Logo } from '../../src/components/Logo';
import { useTheme } from '../../src/hooks/useTheme';

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

// Purely decorative step dots — three steps, first is active
function StepDots({ active }: { active: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === active ? '#4F6EF7' : '#2A3060',
          }}
        />
      ))}
    </View>
  );
}

export default function RegisterScreen() {
  const { signUp, signInWithFacebook, isLoading } = useAuth();
  const { colors } = useTheme();
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

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
    } else if (!result.data) {
      setConfirmationEmail(form.email.trim().toLowerCase());
    }
  };

  const handleFacebookSignIn = async () => {
    setErrors({});
    const result = await signInWithFacebook();
    if (result.error) {
      setErrors({ general: result.error.message });
    }
  };

  if (confirmationEmail) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={colors.gradientBg}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 24 }}>📬</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold', textAlign: 'center', marginBottom: 12 }}>
            Check your inbox
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 8 }}>
            We sent a confirmation link to:
          </Text>
          <Text style={{ color: '#4F6EF7', fontFamily: 'Inter-SemiBold', fontSize: 16, textAlign: 'center', marginBottom: 32 }}>
            {confirmationEmail}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
            Click the link in the email to activate your account, then come back and sign in.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={{ color: '#4F6EF7', fontFamily: 'Inter-SemiBold', fontSize: 16 }}>Back to Sign In</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={colors.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Decorative circle */}
      <View
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: 'rgba(79,110,247,0.06)',
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
                <Text style={{ color: '#4F6EF7', fontSize: 16 }}>← Back</Text>
              </TouchableOpacity>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Logo variant="compact" size="md" />
              </View>

              <StepDots active={0} />

              <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 4 }}>
                Join the network
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 32 }}>
                Build your professional trust circle from day one.
              </Text>

              {errors.general && (
                <View
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.3)',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 14 }}>{errors.general}</Text>
                </View>
              )}

              <View style={{ gap: 16 }}>
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
                    <Text style={{ color: '#4F6EF7', fontSize: 14 }}>
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

              {/* Skill selection */}
              <View style={{ marginTop: 24, marginBottom: 24 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: 'Inter-Medium', marginBottom: 12 }}>
                  What do you offer? (optional — helps AI matching)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SKILL_SUGGESTIONS.map((skill) => {
                    const selected = selectedSkills.includes(skill);
                    return (
                      <TouchableOpacity
                        key={skill}
                        onPress={() => toggleSkill(skill)}
                        activeOpacity={0.75}
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                      >
                        {selected ? (
                          <LinearGradient
                            colors={['#5B7CFA', '#4F6EF7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter-SemiBold' }}>
                              {skill}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              borderWidth: 1,
                              borderColor: 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{skill}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Founding badge promo */}
              <View
                style={{
                  backgroundColor: 'rgba(246,201,14,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(246,201,14,0.25)',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <Text style={{ color: '#F6C90E', fontSize: 14, fontFamily: 'Inter-SemiBold', marginBottom: 4 }}>
                  ⬡ Early access — Founding Member status
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
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

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#2A3060' }} />
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#2A3060' }} />
              </View>

              <TouchableOpacity
                onPress={handleFacebookSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
                style={{ borderRadius: 16, overflow: 'hidden', opacity: isLoading ? 0.6 : 1 }}
              >
                <LinearGradient
                  colors={['#1E7CF0', '#1877F2', '#1560CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Inter-Bold' }}>f</Text>
                  <Text style={{ color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 }}>
                    Continue with Facebook
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 }}>
                By joining, you agree to our Terms of Service and Privacy Policy.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={{ color: '#4F6EF7', fontFamily: 'Inter-SemiBold' }}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

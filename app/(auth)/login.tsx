import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useAuth } from '../../src/hooks';
import { useReduceMotion } from '../../src/utils';
import { Logo } from '../../src/components/Logo';
import { useTheme } from '../../src/hooks/useTheme';

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
  const { signIn, signInWithFacebook, isLoading } = useAuth();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();

  const wordmarkFade = useRef(new Animated.Value(0)).current;
  const wordmarkSlide = useRef(new Animated.Value(-20)).current;
  const formFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      wordmarkFade.setValue(1);
      wordmarkSlide.setValue(0);
      formFade.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.parallel([
        Animated.timing(wordmarkFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(formFade, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, wordmarkFade, wordmarkSlide, formFade]);

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

  const handleFacebookSignIn = async () => {
    setErrors({});
    const result = await signInWithFacebook();
    if (result.error) {
      setErrors({ general: result.error.message });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={colors.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Decorative blurred circles */}
      <View
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(79,110,247,0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(124,58,237,0.06)',
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
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}>
              {/* Logo */}
              <Animated.View
                style={{
                  marginBottom: 48,
                  alignItems: 'center',
                  opacity: wordmarkFade,
                  transform: [{ translateY: wordmarkSlide }],
                }}
              >
                <Logo variant="full" size="lg" />
              </Animated.View>

              <Animated.View style={{ opacity: formFade }}>
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
                      <Text style={{ color: '#4F6EF7', fontSize: 14 }}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    }
                    onRightIconPress={() => setShowPassword((s) => !s)}
                  />

                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    style={{ alignSelf: 'flex-end', marginTop: -4 }}
                  >
                    <Text style={{ color: '#4F6EF7', fontSize: 14 }}>Forgot password?</Text>
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


                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: 16,
                    marginTop: 24,
                    marginBottom: 24,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                    🔒 Every connection on MyKonnect is vouched for.{'\n'}Your network. Your trust.
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginTop: 'auto',
                  }}
                >
                  <Text style={{ color: colors.textSecondary }}>New to MyKonnect? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                    <Text style={{ color: '#4F6EF7', fontFamily: 'Inter-SemiBold' }}>Join the network</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

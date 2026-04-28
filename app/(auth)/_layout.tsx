import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useSession } from '../../src/hooks';
import { useTheme } from '../../src/hooks/useTheme';

export default function AuthLayout() {
  const { isAuthenticated, isInitialized } = useSession();
  const { colors } = useTheme();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isInitialized]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}

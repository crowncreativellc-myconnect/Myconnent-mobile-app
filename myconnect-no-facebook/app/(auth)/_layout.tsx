import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useSession } from '../../src/hooks';

export default function AuthLayout() {
  const { isAuthenticated, isInitialized } = useSession();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isInitialized]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0E27' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}

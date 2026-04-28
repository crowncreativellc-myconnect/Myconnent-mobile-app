import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { db } from '../lib/supabase';
import { useSession } from './useSession';

// Show notifications as banners while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MyConnect',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F6EF7',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function usePushNotifications() {
  const { userId } = useSession();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!userId) return;

    // Register and save token to profile
    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      await db
        .profiles()
        .update({ expo_push_token: token })
        .eq('id', userId);
    });

    // Handle notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Notification received in foreground — the handler above shows the banner
      },
    );

    // Handle tap on a notification (foreground or background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;

        // Navigate based on notification type
        if (data?.type === 'shout_match' && typeof data.shout_id === 'string') {
          router.push({ pathname: '/(app)/shout/[id]', params: { id: data.shout_id } });
        } else if (data?.type === 'shout_accepted' && typeof data.shout_id === 'string') {
          router.push({ pathname: '/(app)/shout/[id]', params: { id: data.shout_id } });
        } else if (
          data?.type === 'connection_request' ||
          data?.type === 'connection_accepted'
        ) {
          router.push('/(app)/connections');
        } else if (data?.type === 'points_earned') {
          router.push('/(app)/points');
        }
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);
}

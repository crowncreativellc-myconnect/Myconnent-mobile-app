import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs, router, usePathname, type Href } from 'expo-router';
import { useSession } from '../../src/hooks';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { TabIcon, ChatsIcon } from '../../src/components/TabIcons';
import { ShoutIcon } from '../../src/components/ShoutIcon';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/lib/supabase';

function UnreadDot() {
  return (
    <View
      style={{
        position: 'absolute',
        top: -2,
        right: -4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
      }}
    />
  );
}

export default function AppLayout() {
  const { isAuthenticated, isInitialized, profile } = useSession();
  const { colors } = useTheme();
  const [hasUnread, setHasUnread] = useState(false);
  const pathname = usePathname();
  usePushNotifications();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isInitialized]);

  // First-run contact-import gate: profile.contacts_onboarded is false for
  // users who haven't seen (or skipped) the onboarding screen yet.
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !profile) return;
    const hasOnboarded = profile.contacts_onboarded ?? false;
    if (!hasOnboarded && pathname !== '/onboarding-contacts') {
      router.replace('/(app)/onboarding-contacts' as Href);
    }
  }, [isInitialized, isAuthenticated, profile, pathname]);

  // Live unread message count via Realtime
  useEffect(() => {
    if (!profile?.id) return;

    const checkUnread = async () => {
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', profile.id);
      setHasUnread((count ?? 0) > 0);
    };

    checkUnread();

    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => checkUnread(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        () => checkUnread(),
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [profile?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 82,
          paddingBottom: 16,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: 'Inter-SemiBold',
          marginTop: 3,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon tab="home" size={26} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="shout"
        options={{
          title: 'Konnect',
          tabBarIcon: ({ focused }) => <ShoutIcon size={26} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Circle',
          tabBarIcon: ({ focused }) => <TabIcon tab="circle" size={26} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => (
            <View>
              <ChatsIcon size={26} active={focused} />
              {hasUnread && <UnreadDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="points"
        options={{
          title: 'Points',
          tabBarIcon: ({ focused }) => <TabIcon tab="points" size={26} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon tab="profile" size={26} active={focused} />,
        }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="shout/[id]" options={{ href: null }} />
      <Tabs.Screen name="shout-detail" options={{ href: null }} />
      <Tabs.Screen name="profile-edit" options={{ href: null }} />
      <Tabs.Screen name="connection-detail" options={{ href: null }} />
      <Tabs.Screen name="payment-history" options={{ href: null }} />
      <Tabs.Screen name="onboarding-contacts" options={{ href: null }} />
    </Tabs>
  );
}

import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { initializeUserId } from '../utils/userStorage';
import { AuthProvider, useAuth } from '../utils/authContext';
import { ToastProvider } from '../utils/toastContext';
import { NotificationProvider } from '../utils/notificationContext';
import ToastContainer from '../components/ToastContainer';
import { OfflineBanner } from '../components/OfflineBanner';
import PastDueWarningBanner from '../components/PastDueWarningBanner';
import '../utils/i18n';

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { user, isGuest, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabs = segments[0] === '(tabs)';

    console.log('🔐 Auth State:', {
      user: !!user,
      isGuest,
      segments,
      inAuthGroup,
      inTabs
    });

    if (!user && !isGuest && !inAuthGroup) {
      console.log('🔐 Not authenticated - redirecting to welcome');
      router.replace('/auth/welcome');
    } else if ((user || isGuest) && inAuthGroup) {
      console.log('🔐 Authenticated - redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [user, isGuest, segments, loading]);

  useEffect(() => {
    // Only enable deep linking on native platforms
    // Web navigation is handled by the browser/router directly
    if (Platform.OS === 'web') {
      console.log('🔗 Deep linking disabled on web platform');
      return;
    }

    let isInitialLoad = true;

    const handleDeepLink = (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);

      console.log('🔗 Deep link received:', { path, queryParams });

      // Ignore deep links to tabs or regular navigation during normal app usage
      const internalPaths = ['', 'explore', 'events', 'profile', 'map', 'live', 'create', 'index', '(tabs)'];
      if (internalPaths.includes(path || '') && !queryParams?.id && !queryParams?.eventId) {
        console.log('🔗 Ignoring internal navigation');
        return;
      }

      if (path === 'event' && queryParams?.id) {
        router.push(`/(tabs)/events` as any);
      } else if (path === 'profile' && queryParams?.id) {
        router.push(`/profile/${queryParams.id}` as any);
      } else if (path === 'live' && queryParams?.eventId) {
        router.push(`/(tabs)/live?eventId=${queryParams.eventId}` as any);
      } else if (path === 'notifications') {
        router.push('/notifications' as any);
      }
    };

    Linking.getInitialURL().then(url => {
      if (url && isInitialLoad) {
        console.log('🔗 Initial URL:', url);
        handleDeepLink({ url });
        isInitialLoad = false;
      }
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/welcome" />
      <Stack.Screen name="auth/register" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/forgot-password" />
      <Stack.Screen name="auth/reset-password" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="followers" />
      <Stack.Screen name="following" />
      <Stack.Screen name="rewards" />
      <Stack.Screen name="create-event" />
      <Stack.Screen name="edit-event" />
      <Stack.Screen name="profile/change-password" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="profile/payouts" />
      <Stack.Screen name="profile/two-factor" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="admin/moderation" />
      <Stack.Screen name="admin/reports" />
      <Stack.Screen name="admin/analytics" />
      <Stack.Screen name="admin/finances" />
      <Stack.Screen name="admin/support" />
      <Stack.Screen name="admin/alerts" />
      <Stack.Screen name="admin/ai-moderation" />
      <Stack.Screen name="admin/spam-detection" />
      <Stack.Screen name="admin/ticketmaster-simple" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    initializeUserId();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const initializeAdMob = async () => {
        try {
          const mobileAds = (await import('react-native-google-mobile-ads')).default;
          const adapterStatuses = await mobileAds().initialize();
          console.log('AdMob initialized:', adapterStatuses);
        } catch (error) {
          console.error('AdMob initialization error:', error);
        }
      };
      initializeAdMob();
    }
  }, []);


  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <View style={{ flex: 1 }}>
            <OfflineBanner />
            <PastDueWarningBanner />
            <RootLayoutNav />
            <ToastContainer />
            <StatusBar style="auto" />
          </View>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
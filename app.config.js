module.exports = {
  expo: {
    name: "JETZZ",
    slug: "jetzz-app",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "jetzz",
    userInterfaceStyle: "automatic",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    newArchEnabled: false,
    platforms: ["ios", "android", "web"],
    extra: {
      eas: {
        projectId: "1fae93d9-401e-4699-97dc-a244a23ecc1d"
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vhhfztpijdemocghpwqj.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaGZ6dHBpamRlbW9jZ2hwd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTg1MzUsImV4cCI6MjA3NTQ5NDUzNX0.BxIBpS3rXM0qrfpcJQzXSdJ4zxHQOAnbC46p15PcIBM",
      EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID || "ca-app-pub-2926786303702425/9469635836",
      EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID || "ca-app-pub-2926786303702425/1028324443",
      EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID || "ca-app-pub-2926786303702425/8080532549",
      EXPO_PUBLIC_ADMOB_NATIVE_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID_ANDROID || "ca-app-pub-2926786303702425/9679063984",
      EXPO_PUBLIC_ADMOB_BANNER_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS || "ca-app-pub-2926786303702425/2411782206",
      EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS || "ca-app-pub-2926786303702425/6948533831",
      EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS || "ca-app-pub-2926786303702425/7132081250",
      EXPO_PUBLIC_ADMOB_NATIVE_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID_IOS || "ca-app-pub-2926786303702425/7028424886",
    },
    ios: {
      bundleIdentifier: "com.jetzz.app",
      supportsTablet: true,
      config: {
        googleMobileAdsAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || "ca-app-pub-2926786303702425~7774530341",
      },
    },
    android: {
      package: "com.jetzz.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      config: {
        googleMobileAdsAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || "ca-app-pub-2926786303702425~2800571116",
      },
    },
    web: {
      bundler: "metro",
      output: "single"
    },
    plugins: [
      "expo-router",
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || "ca-app-pub-2926786303702425~2800571116",
          iosAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || "ca-app-pub-2926786303702425~7774530341",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};

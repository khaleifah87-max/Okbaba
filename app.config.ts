import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: "khaleifah87",
  slug: "okbaba",
  name: "Ok Baba",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "okbaba",
  description: "Ok Baba - Find trusted home service technicians in the UAE",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  newArchEnabled: false,
  extra: {
    ...(config.extra ?? {}),
    eas: {
      projectId: "130cc294-a25d-4d6b-9147-ad17d2975782",
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.okbaba.app",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "Ok Baba uses your location to show customers where you are.",
      NSLocationAlwaysUsageDescription:
        "Ok Baba uses your location to track your route to customers.",
    },
  },
  android: {
    package: "com.okbaba.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Ok Baba needs your location to show your position to customers.",
        locationWhenInUsePermission:
          "Ok Baba needs your location to show your position to customers.",
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      "expo-notifications",
      {
        color: "#F5A623",
        sounds: [],
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 280,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
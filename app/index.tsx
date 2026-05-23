import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_KEY } from "./onboarding";

export default function Index() {
  const { session, profile, loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingSeen(val === "true");
      setOnboardingChecked(true);
    });
  }, []);

  if (loading || !onboardingChecked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F7FA" }}>
        <ActivityIndicator size="large" color="#1A3A6B" />
      </View>
    );
  }

  // Show onboarding on first launch
  if (!onboardingSeen) {
    return <Redirect href="/onboarding" />;
  }

  if (session && profile) {
    if (profile.user_type === "technician") {
      return <Redirect href="/(technician)" />;
    }
    if (profile.user_type === "admin") {
      return <Redirect href="/(admin)" />;
    }
    return <Redirect href="/(customer)" />;
  }

  return <Redirect href="/auth/welcome" />;
}
import React from "react";
import { Stack } from "expo-router";
import ThemeProvider from "./theme/ThemeProvider";
import AnimatedSplashScreen from "./AnimatedSplashSreen";
import { AuthProvider } from "./AuthContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AnimatedSplashScreen>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
            }}
          />
        </AnimatedSplashScreen>
      </AuthProvider>
    </ThemeProvider>
  );
}

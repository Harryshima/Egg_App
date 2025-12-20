import React from "react";
import { Stack } from "expo-router";
import ThemeProvider from "./theme/ThemeProvider";
import AnimatedSplashScreen from "./AnimatedSplashScreen";

export default function RootLayout() {
  return (
    <ThemeProvider>
        <AnimatedSplashScreen>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
            }}
          />
        </AnimatedSplashScreen>
    </ThemeProvider>
  );
}

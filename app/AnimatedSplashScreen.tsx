import React, { useEffect, useRef, useState } from "react";
import { View, Animated, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

interface RotatingSplashProps {
  children: React.ReactNode;
}

export default function RotatingSplash({ children }: RotatingSplashProps) {
  const [isAppReady, setIsAppReady] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation animation
    const rotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    rotation.start();

    // Simulate loading, then hide splash
    const timer = setTimeout(async () => {
      setIsAppReady(true);
      await SplashScreen.hideAsync();
    }, 3000);

    return () => {
      rotation.stop();
      clearTimeout(timer);
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!isAppReady) {
    return (
      <View style={styles.container}>
        <Animated.Image
          source={require("../assets/eggicon.png")}
          style={[styles.logo, { transform: [{ rotate }] }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
});

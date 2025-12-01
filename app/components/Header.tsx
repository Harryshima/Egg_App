import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useFonts, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { useTheme } from "../theme/ThemeProvider";

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const { darkMode, toggleTheme, colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={[
          styles.header,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  const handleToggle = (): void => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    toggleTheme();
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <MaterialCommunityIcons name="egg-easter" size={32} color={colors.text} />
        <Text style={[styles.headerText, { color: colors.text }]}>
          {title || "EGG-CELLENT"}
        </Text>
      </View>

      <TouchableOpacity onPress={handleToggle} style={styles.themeToggle}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {darkMode ? (
            <Ionicons name="moon" size={22} color={colors.accent} />
          ) : (
            <Ionicons name="sunny" size={22} color={colors.accent} />
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 40,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    marginLeft: 8,
    letterSpacing: 1,
  },
  themeToggle: {
    padding: 6,
    borderRadius: 20,
  },
});

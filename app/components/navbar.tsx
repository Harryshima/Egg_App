import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeProvider";

interface NavBarProps {
  currentTab: string;
}

interface Tab {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
}

export default function NavBar({ currentTab }: NavBarProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  const tabs: Tab[] = [
    { name: "Dashboard", icon: "grid-outline", path: "/" },
    { name: "History", icon: "time-outline", path: "/history" },
    { name: "Notifications", icon: "notifications-outline", path: "/notifications" },
    { name: "Settings", icon: "settings-outline", path: "/settings" },
  ];

  return (
    <View style={[styles.navBar, { backgroundColor: colors.card }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.navItem}
          onPress={() => router.push(tab.path)}
        >
          <Ionicons
            name={tab.icon}
            size={20}
            color={currentTab === tab.name ? colors.accent : colors.text}
          />
          <Text
            style={[
              styles.navText,
              { color: currentTab === tab.name ? colors.accent : colors.text },
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 10,
    marginTop: 2,
  },
});

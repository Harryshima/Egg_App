import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./theme/ThemeProvider";
import NavBar from "./components/navbar";
import Header from "./components/Header";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

// Firebase imports
import { database } from "./lib/firebase";
import { ref, set, onValue } from "firebase/database";

export default function Settings() {
  const { colors, toggleTheme, darkMode, animatedOpacity } = useTheme();
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);

  // Listen to Firebase for notification setting
  useEffect(() => {
    const settingRef = ref(database, "settings/notificationsEnabled");
    const unsubscribe = onValue(settingRef, (snapshot) => {
      if (snapshot.exists()) {
        setNotificationsEnabled(snapshot.val());
      } else {
        // Default to true if not set
        setNotificationsEnabled(true);
        set(settingRef, true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Request notification permissions from the system
  const requestNotificationPermissions = async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  };

  // Toggle Notifications with optimistic UI update
  const handleNotificationToggle = async (value: boolean) => {
    // Prevent multiple toggles at once
    if (isTogglingNotifications) return;

    // Optimistic update - change UI immediately
    setNotificationsEnabled(value);
    setIsTogglingNotifications(true);

    try {
      if (value) {
        const granted = await requestNotificationPermissions();

        if (!granted) {
          // Revert on failure
          setNotificationsEnabled(false);
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to receive alerts.",
            [{ text: "OK" }]
          );
          setIsTogglingNotifications(false);
          return;
        }
      }

      await set(ref(database, "settings/notificationsEnabled"), value);
    } catch (error) {
      console.error("Failed to update notification setting:", error);
      // Revert on error
      setNotificationsEnabled(!value);
      Alert.alert("Error", "Failed to update notification setting. Please try again.");
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.background,
          opacity: animatedOpacity 
        }
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header />

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Appearance</Text>
          <View style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={22} color={colors.accent} />
              <Text style={[styles.itemText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={darkMode ? colors.card : colors.background}
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Notifications</Text>
          <View style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.accent} />
              <Text style={[styles.itemText, { color: colors.text }]}>Enable Notifications</Text>
            </View>
            <View style={styles.switchContainer}>
              {isTogglingNotifications && (
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                  style={styles.loadingIndicator}
                />
              )}
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={notificationsEnabled ? colors.card : colors.background}
                ios_backgroundColor={colors.border}
                disabled={isTogglingNotifications}
              />
            </View>
          </View>
        </View>

        {/* About Us */}
        <TouchableOpacity
          style={[styles.section, { backgroundColor: colors.card }]}
          onPress={() => router.push("/About_Us")}
          activeOpacity={0.7}
        >
          <View style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="people-outline" size={22} color={colors.accent} />
              <Text style={[styles.itemText, { color: colors.text }]}>About Us</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.subtext} />
          </View>
        </TouchableOpacity>

        {/* How It Works */}
        <TouchableOpacity
          style={[styles.section, { backgroundColor: colors.card }]}
          onPress={() => router.push("/HowItWorks")}
          activeOpacity={0.7}
        >
          <View style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={22} color={colors.accent} />
              <Text style={[styles.itemText, { color: colors.text }]}>
                How the Device Works
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.subtext} />
          </View>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.subtext }]}>
          App ver 2.0.1
        </Text>
      </ScrollView>

      <NavBar currentTab="Settings" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  section: {
    marginTop: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    paddingVertical: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 20,
    marginBottom: 5,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemText: {
    fontSize: 15,
    marginLeft: 12,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingIndicator: {
    marginRight: 4,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 20,
    marginBottom: 30,
  },
});
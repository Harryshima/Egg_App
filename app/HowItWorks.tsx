import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./theme/ThemeProvider";
import Header from "./components/Header";

export default function How_It_Works() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header />

        <Text style={[styles.title, { color: colors.text }]}>
          How the Device Works
        </Text>

        <View style={styles.section}>
          <Ionicons
            name="radio-outline"
            size={30}
            color={colors.accent}
            style={styles.icon}
          />
          <Text style={[styles.sectionText, { color: colors.subtext }]}>
            The ESP32 captures sensor data in real-time and processes it.
          </Text>
        </View>

        <View style={styles.section}>
          <Ionicons
            name="cloud-upload-outline"
            size={30}
            color={colors.accent}
            style={styles.icon}
          />
          <Text style={[styles.sectionText, { color: colors.subtext }]}>
            Data is sent wirelessly to the mobile app for display.
          </Text>
        </View>

        <View style={styles.section}>
          <Ionicons
            name="phone-portrait-outline"
            size={30}
            color={colors.accent}
            style={styles.icon}
          />
          <Text style={[styles.sectionText, { color: colors.subtext }]}>
            The user can monitor device status and results directly from the app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
    alignItems: "center",
  },
  icon: {
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    width: "90%",
  },
});

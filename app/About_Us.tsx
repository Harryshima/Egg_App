import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "./theme/ThemeProvider";
import Header from "./components/Header";
import NavBar from "./components/navbar";

export default function About_Us() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header title="About Us" />

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Who We Are</Text>
          <Text style={[styles.paragraph, { color: colors.subtext }]}>
            We are a team dedicated to creating smart and accessible solutions 
            through technology. Our goal is to provide tools that help improve 
            everyday tasks, making them more efficient, reliable, and easy to use.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Our Mission</Text>
          <Text style={[styles.paragraph, { color: colors.subtext }]}>
            Our mission is to develop innovative systems that combine hardware 
            and software to offer practical, real-world solutions. We aim to 
            deliver high-quality user experiences through simplicity, accuracy, 
            and thoughtful design.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Developers</Text>
          <Text style={[styles.paragraph, { color: colors.subtext }]}>
            This project was built with dedication and collaboration by a team of 
            passionate developers committed to creating impactful technology.
          </Text>
        </View>

        <Text style={[styles.versionText, { color: colors.subtext }]}>
          App ver 2.0.1
        </Text>
      </ScrollView>

      <NavBar currentTab="Settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    padding: 15,
    paddingBottom: 100,
  },

  card: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },

  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 10,
    marginBottom: 25,
  },
});

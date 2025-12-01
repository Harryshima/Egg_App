import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./theme/ThemeProvider";
import NavBar from "./components/navbar";
import Header from "./components/Header";

export default function Settings() {
  const { colors } = useTheme();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header />

        {/* Guest Section */}
        <TouchableOpacity
          style={[styles.profileSection, { backgroundColor: colors.card }]}
          onPress={() => router.push("/login")}
        >
          <View
            style={[styles.blankAvatar, { backgroundColor: colors.subtext + "22" }]}
          >
            <Ionicons name="person-outline" size={28} color={colors.subtext} />
          </View>

          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              Guest User
            </Text>
            <Text style={[styles.profileSub, { color: colors.subtext }]}>
              Sign up or log in to continue
            </Text>
          </View>

          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={colors.accent}
          />
        </TouchableOpacity>

        {/* Profile Settings */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
            Profile
          </Text>

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="person-circle-outline"
                size={22}
                color={colors.accent}
              />
              <Text style={[styles.itemText, { color: colors.text }]}>
                Edit Profile
              </Text>
            </View>
            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color={colors.subtext}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="lock-closed-outline"
                size={22}
                color={colors.accent}
              />
              <Text style={[styles.itemText, { color: colors.text }]}>
                Change Password
              </Text>
            </View>
            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color={colors.subtext}
            />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
            Notifications
          </Text>

          <View style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.accent}
              />
              <Text style={[styles.itemText, { color: colors.text }]}>
                Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
          </View>
        </View>

        {/* Account */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
            Account
          </Text>

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
              <Text style={[styles.itemText, { color: "#e74c3c" }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.subtext }]}>
          App ver 2.0.1
        </Text>
      </ScrollView>

      <NavBar currentTab="Settings" />
    </View>
  );
}

const styles = StyleSheet.create({

  container: { 
    flex: 1 
},

  scrollContent: { 
    paddingBottom: 100 
  },

  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    elevation: 2,
    marginTop: 10,
  },
  blankAvatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  profileText: { 
    flex: 1 
},

  profileName: { 
    fontSize: 16, 
    fontWeight: "600" 
},

  profileSub: { 
    fontSize: 13 
},

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
    alignItems: "center" 
  },

  itemText: { 
    fontSize: 15, 
    marginLeft: 12 },

  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 20,
    marginBottom: 30,
  },
});

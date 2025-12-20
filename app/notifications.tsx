import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "./components/Header";
import NavBar from "./components/navbar";
import { useTheme } from "./theme/ThemeProvider";

// Firebase imports
import { database } from "./lib/firebase";
import { ref, onValue, remove, update } from "firebase/database";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "status" | "error" | "update";
  status?: "Stable" | "Moderate" | "Critical";
  read: boolean;
}

export default function Notifications(): React.ReactElement {
  const { colors } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Listen for user setting
  useEffect(() => {
    const settingRef = ref(database, "settings/notificationsEnabled");
    const unsubscribe = onValue(settingRef, (snapshot) => {
      if (snapshot.exists()) setNotificationsEnabled(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // Fetch notifications dynamically and filter out invalid ones
  useEffect(() => {
    if (!notificationsEnabled) {
      setNotifications([]);
      return;
    }

    const notificationsRef = ref(database, "notifications");
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const array: Notification[] = Object.keys(data)
          .map((key) => ({
            id: data[key].id || key,
            title: data[key].title || "Notification",
            description: data[key].description || "",
            time: data[key].time || new Date().toISOString(),
            type: data[key].type || "status",
            status: data[key].status,
            read: data[key].read ?? false,
          }))
          .filter((notification) => {
            // Extract weight from description if it exists
            const weightMatch = notification.description.match(/(\d+\.?\d*)g/);
            if (weightMatch) {
              const weight = parseFloat(weightMatch[1]);
              // Filter out notifications for weights less than 5g (invalid readings)
              if (weight < 5) {
                // Delete these invalid notifications from Firebase
                remove(ref(database, `notifications/${notification.id}`));
                return false;
              }
              // Keep Peewee warnings (5g - 50g) and Jumbo errors (>75g)
              // These are valid notifications
            }
            return true;
          })
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        
        setNotifications(array);
      } else {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, [notificationsEnabled]);

  const statusColors: Record<"Stable" | "Moderate" | "Critical", { bg: string; text: string }> = {
    Stable: { bg: colors.successBg, text: colors.success },
    Moderate: { bg: colors.warningBg, text: colors.warning },
    Critical: { bg: colors.errorBg, text: colors.error },
  };

  const getIconName = (item: Notification) => {
    if (item.status === "Critical") return "warning";
    if (item.type === "error") return "alert-circle-outline";
    if (item.type === "update") return "information-circle-outline";
    return "checkmark-circle-outline";
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      await remove(ref(database, `notifications/${id}`));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await update(ref(database, `notifications/${id}`), { read: true });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // Clear all invalid notifications (weights < 5g)
  const clearInvalidNotifications = async () => {
    Alert.alert(
      "Clear Invalid Notifications",
      "This will remove all notifications for eggs weighing less than 5g. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const notificationsRef = ref(database, "notifications");
              const snapshot = await new Promise<any>((resolve) => {
                onValue(notificationsRef, resolve, { onlyOnce: true });
              });

              const data = snapshot.val();
              if (data) {
                let deleteCount = 0;
                for (const key in data) {
                  const description = data[key].description || "";
                  const weightMatch = description.match(/(\d+\.?\d*)g/);
                  if (weightMatch) {
                    const weight = parseFloat(weightMatch[1]);
                    if (weight < 5) {
                      await remove(ref(database, `notifications/${key}`));
                      deleteCount++;
                    }
                  }
                }
                Alert.alert("Success", `Cleared ${deleteCount} invalid notification(s).`);
              }
            } catch (error) {
              console.error("Failed to clear invalid notifications:", error);
              Alert.alert("Error", "Failed to clear notifications. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      
      {/* Clear Invalid Button */}
      {notifications.some((n) => {
        const weightMatch = n.description.match(/(\d+\.?\d*)g/);
        return weightMatch && parseFloat(weightMatch[1]) < 5;
      }) && (
        <TouchableOpacity 
          style={[styles.clearButton, { backgroundColor: colors.card }]}
          onPress={clearInvalidNotifications}
        >
          <Ionicons name="trash-outline" size={16} color="#F44336" style={{ marginRight: 6 }} />
          <Text style={{ color: "#F44336", fontWeight: "600", fontSize: 13 }}>
            Clear Invalid Notifications
          </Text>
        </TouchableOpacity>
      )}

      {!notificationsEnabled && (
        <Text style={{ textAlign: "center", marginTop: 20, color: colors.subtext }}>
          Notifications are disabled.
        </Text>
      )}
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={
          notificationsEnabled ? (
            <Text style={{ textAlign: "center", marginTop: 20, color: colors.subtext }}>
              No notifications yet
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => !item.read && markAsRead(item.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.card,
                {
                  borderLeftColor: item.status ? statusColors[item.status].text : colors.border,
                  backgroundColor: colors.card,
                  opacity: item.read ? 0.6 : 1,
                },
              ]}
            >
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}

              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons
                  name={getIconName(item)}
                  size={24}
                  color={item.status ? statusColors[item.status].text : colors.accent}
                  style={{ marginRight: 10, marginTop: 3 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: item.read ? "400" : "600" }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 2 }}>
                    {item.description}
                  </Text>
                  <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 4 }}>
                    {new Date(item.time).toLocaleString()}
                  </Text>
                </View>
                {/* Trash Icon */}
                <TouchableOpacity 
                  onPress={() => deleteNotification(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.subtext} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <NavBar currentTab="Notifications" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "./components/Header";
import NavBar from "./components/navbar";
import { useTheme } from "./theme/ThemeProvider";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "status" | "error" | "update";
  status?: "Stable" | "Moderate" | "Critical";
  read: boolean;
}

interface RecentlyDeleted {
  type: "single" | "all";
  data: Notification | Notification[];
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "Device Status",
    description: "Critical error detected!",
    time: "2 mins ago",
    type: "status",
    status: "Critical",
    read: false,
  },
  {
    id: "2",
    title: "Device Status",
    description: "Moderate issue detected.",
    time: "10 mins ago",
    type: "status",
    status: "Moderate",
    read: false,
  },
  {
    id: "3",
    title: "Device Status",
    description: "System stable.",
    time: "1 hr ago",
    type: "status",
    status: "Stable",
    read: true,
  },
];

export default function Notifications(): React.ReactElement {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [recentlyDeleted, setRecentlyDeleted] = useState<RecentlyDeleted | null>(null);

  const statusColors: Record<"Stable" | "Moderate" | "Critical", { bg: string; text: string }> = {
    Stable: { bg: colors.successBg, text: colors.success },
    Moderate: { bg: colors.warningBg, text: colors.warning },
    Critical: { bg: colors.errorBg, text: colors.error },
  };

  // Dynamic icon based on type/status
  const getIconName = (item: Notification) => {
    if (item.type === "error") return "alert-circle";
    if (item.type === "update") return "checkmark-circle";
    if (item.type === "status") {
      switch (item.status) {
        case "Critical":
          return "warning";
        case "Moderate":
          return "ellipse-outline";
        case "Stable":
          return "checkmark-circle-outline";
        default:
          return "information-circle-outline";
      }
    }
    return "notifications-outline";
  };

  const getIconColor = (item: Notification) => {
    if (item.type === "error") return colors.error;
    if (item.type === "update") return colors.success;
    if (item.type === "status" && item.status) {
      switch (item.status) {
        case "Critical":
          return colors.error;
        case "Moderate":
          return colors.warning;
        case "Stable":
          return colors.success;
        default:
          return colors.info;
      }
    }
    return colors.accent;
  };

  // Clear a single notification
  const clearNotification = (id: string) => {
    const deleted = notifications.find((n) => n.id === id);
    if (!deleted) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setRecentlyDeleted({ type: "single", data: deleted });
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setRecentlyDeleted({ type: "all", data: notifications });
    setNotifications([]);
  };

  // Undo last delete
  const undoDelete = () => {
    if (!recentlyDeleted) return;
    if (recentlyDeleted.type === "single") {
      setNotifications((prev) => [recentlyDeleted.data as Notification, ...prev]);
    } else if (recentlyDeleted.type === "all") {
      setNotifications(recentlyDeleted.data as Notification[]);
    }
    setRecentlyDeleted(null);
  };

  const renderItem: ListRenderItem<Notification> = ({ item }) => {
    const borderColor =
      item.type === "status" && item.status ? statusColors[item.status].text : colors.border;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderLeftColor: borderColor }]}>
        <View style={styles.cardContent}>
          <Ionicons
            name={getIconName(item)}
            size={24}
            color={getIconColor(item)}
            style={{ marginRight: 10, marginTop: 3 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.description, { color: colors.subtext }]}>{item.description}</Text>
            <Text style={[styles.time, { color: colors.subtext }]}>{item.time}</Text>
          </View>
          <TouchableOpacity onPress={() => clearNotification(item.id)}>
            <Ionicons name="trash-outline" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />

      {/* Clear All Button */}
      {notifications.length > 0 && (
        <View style={styles.clearAllContainer}>
          <TouchableOpacity style={styles.clearAllButton} onPress={clearAllNotifications}>
            <Ionicons
              name="trash-outline"
              size={16}
              color={colors.accent}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.clearAllText, { color: colors.accent }]}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: colors.subtext, marginTop: 20 }}>
            No notifications.
          </Text>
        }
      />

      {/* Undo Banner */}
      {recentlyDeleted && (
        <View style={[styles.undoBanner, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, flex: 1 }}>
            {recentlyDeleted.type === "all" ? "All notifications cleared" : "Notification cleared"}
          </Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={{ color: colors.accent, fontWeight: "bold" }}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      <NavBar currentTab="Notifications" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    marginTop: 4,
  },
  clearAllContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: "flex-end",
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  undoBanner: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
});

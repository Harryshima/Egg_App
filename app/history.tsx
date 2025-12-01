import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { useTheme } from "./theme/ThemeProvider";
import Header from "./components/Header";
import NavBar from "./components/navbar";
import { Ionicons } from "@expo/vector-icons";

const sizeThresholds = {
  S: [0, 45],
  M: [45, 55],
  L: [56, 65],
  XL: [66, 75],
  J: [76, 999],
};

const sampleHistory = [
  { date: "2025-10-17", weights: [44, 50, 58, 68, 77, 52, 61, 40, 73, 80] },
  { date: "2025-10-16", weights: [45, 46, 55, 60, 65, 50, 47, 70, 95, 72, 89, 78, 90, 90, 93] },
  { date: "2025-10-15", weights: [42, 50, 55, 62, 68, 52, 60, 44, 75, 78, 100, 100] },
];

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function History(): React.ReactElement {
  const { colors, darkMode } = useTheme();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const processedHistory = useMemo(() => {
    return sampleHistory.map((item) => {
      const totalEggs = item.weights.length;

      const sizeCounts: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, J: 0 };
      item.weights.forEach((w) => {
        for (const size in sizeThresholds) {
          const [min, max] = sizeThresholds[size as keyof typeof sizeThresholds];
          if (w >= min && w <= max) {
            sizeCounts[size]++;
            break;
          }
        }
      });

      const estimatedErrors = item.weights.filter((w) => w < 30 || w > 90).length;
      const errorRate = (estimatedErrors / totalEggs) * 100;
      const avgWeight = item.weights.reduce((a, b) => a + b, 0) / totalEggs;

      let statusText = "Stable";
      let statusColor = "#4CAF50";
      if (errorRate > 10 && errorRate <= 15) {
        statusText = "Moderate";
        statusColor = "#FFC107";
      } else if (errorRate > 15) {
        statusText = "Critical";
        statusColor = "#F44336";
      }

      return {
        ...item,
        totalEggs,
        sizeCounts,
        estimatedErrors,
        errorRate,
        avgWeight,
        statusText,
        statusColor,
      };
    });
  }, []);

  const toggleExpand = (date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDate(expandedDate === date ? null : date);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: darkMode ? colors.background : "#f0f0f0" },
      ]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Header />

        {processedHistory.map((item) => {
          const isExpanded = expandedDate === item.date;

          const statusIcon =
            item.statusText === "Stable"
              ? "checkmark-circle-outline"
              : item.statusText === "Moderate"
              ? "alert-circle-outline"
              : "close-circle-outline";

          return (
            <View
              key={item.date}
              style={[
                styles.card,
                {
                  backgroundColor: darkMode ? colors.card : "#fff",
                  shadowColor: darkMode ? "#000" : "#aaa",
                },
              ]}
            >
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggleExpand(item.date)}
              >
                <Ionicons
                  name={statusIcon as any}
                  size={20}
                  color={item.statusColor}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.dateText, { color: colors.text }]}>{item.date}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.subtext}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.cardContent}>
                  {/* Total Eggs */}
                  <View
                    style={[
                      styles.infoRow,
                      { backgroundColor: darkMode ? "#333" : "#f9f9f9" },
                    ]}
                  >
                    <Ionicons
                      name="egg-outline"
                      size={18}
                      color={colors.subtext}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.infoTitle, { color: colors.subtext }]}>
                      Total Eggs
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {item.totalEggs}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.infoRow,
                      { backgroundColor: darkMode ? "#333" : "#f9f9f9" },
                    ]}
                  >
                    <Ionicons
                      name="speedometer-outline"
                      size={18}
                      color={colors.subtext}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.infoTitle, { color: colors.subtext }]}>
                      Average Weight
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {item.avgWeight.toFixed(1)} g
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.infoRow,
                      { backgroundColor: darkMode ? "#333" : "#f9f9f9" },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={item.statusColor}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.infoTitle, { color: colors.subtext }]}>
                      Error Rate
                    </Text>
                    <Text style={[styles.infoValue, { color: item.statusColor }]}>
                      {item.errorRate.toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.sizeBadgeRow}>
                    {Object.keys(item.sizeCounts).map((size) => (
                      <View
                        key={size}
                        style={[
                          styles.sizeBadge,
                          { backgroundColor: darkMode ? "#555" : "#eee" },
                        ]}
                      >
                        <Text style={{ color: colors.text, fontWeight: "600" }}>
                          {size}: {item.sizeCounts[size]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <NavBar currentTab="History" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },

  card: {
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 12,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },

  cardContent: { 
    marginTop: 10 
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  infoTitle: { 
    fontSize: 14 
  },

  infoValue: { 
    fontSize: 16, 
    fontWeight: "700" 
  },

  sizeBadgeRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    marginTop: 8 
  },

  sizeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
});

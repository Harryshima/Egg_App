import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "./theme/ThemeProvider";
import Header from "./components/Header";
import NavBar from "./components/navbar";
import { Ionicons } from "@expo/vector-icons";
import { database } from "./lib/firebase";
import { ref, onValue, set, push } from "firebase/database";
import { sendNotification, requestNotificationPermission } from "./lib/notification";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// SIZE THRESHOLDS 
const sizeThresholds = {
  Peewee: { min: 5, max: 49 },
  S: { min: 50, max: 54 },
  M: { min: 55, max: 60 },
  L: { min: 61, max: 64 },
  XL: { min: 65, max: 68 },
  Jumbo: { min: 69, max: 499 }, // Anything from 69g to 499g is Jumbo
};

const loadCellsCount = 16;
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// Helper to get size label from weight
const getSizeFromWeight = (weight: number) => {
  for (const size in sizeThresholds) {
    const { min, max } = sizeThresholds[size];
    if (weight >= min && weight <= max) return size;
  }
  return "-";
};

type FilterType = "all" | "active" | "errors" | "empty";

// Animated Counter Component
const AnimatedCounter = ({ value, style }: { value: number; style: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const displayValue = useRef(0);
  const [displayText, setDisplayText] = useState("0");

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value: animValue }) => {
      displayValue.current = Math.round(animValue);
      setDisplayText(displayValue.current.toString());
    });

    return () => animatedValue.removeListener(listener);
  }, [value]);

  return <Text style={style}>{displayText}</Text>;
};

export default function Dashboard(): React.ReactElement {
  const { colors } = useTheme();
  const [eggWeights, setEggWeights] = useState<number[]>(Array(loadCellsCount).fill(0));
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [expandedCell, setExpandedCell] = useState<number | null>(null);
  const [yesterdayStats, setYesterdayStats] = useState({ totalEggs: 0, errorRate: 0 });

  // Pulse animation for error cells
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Track last notification time per load cell
  const lastNotificationTime = useRef<Record<number, number>>({});

  // Request notification permission
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Listen for notifications enabled setting from Firebase
  useEffect(() => {
    const settingRef = ref(database, "settings/notificationsEnabled");
    const unsubscribe = onValue(settingRef, (snapshot) => {
      if (snapshot.exists()) {
        setNotificationsEnabled(snapshot.val());
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch yesterday's stats for comparison
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split("T")[0];

    const historyRef = ref(database, `history/${yesterdayDate}`);
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const weights: number[] = Object.values(data)
          .filter((item: any) => typeof item === 'object' && item.weight !== undefined)
          .map((item: any) => item.weight);
        const totalEggs = weights.filter((w) => w >= 5).length;
        const errors = weights.filter((w) => w >= 500).length;
        const errorRate = totalEggs ? (errors / totalEggs) * 100 : 0;
        setYesterdayStats({ totalEggs, errorRate });
      }
    });
    return () => unsubscribe();
  }, []);

  // Check if notification should be sent (cooldown)
  const shouldSendNotification = (index: number) => {
    const now = Date.now();
    const lastTime = lastNotificationTime.current[index];
    if (!lastTime || now - lastTime > NOTIFICATION_COOLDOWN) {
      lastNotificationTime.current[index] = now;
      return true;
    }
    return false;
  };

  // Save notification to Firebase
  const saveNotificationToFirebase = async (
    title: string,
    description: string,
    status: "Stable" | "Moderate" | "Critical"
  ) => {
    try {
      const notificationsRef = ref(database, "notifications");
      const newNotificationRef = push(notificationsRef);
      await set(newNotificationRef, {
        id: newNotificationRef.key,
        title,
        description,
        time: new Date().toISOString(),
        type: "error",
        status,
        read: false,
      });
    } catch (error) {
      console.error("Failed to save notification to Firebase:", error);
    }
  };

  // FETCH WEIGHTS FROM FIREBASE
  useEffect(() => {
    const eggsRef = ref(database, "eggs");

    const unsubscribe = onValue(
      eggsRef,
      (snapshot) => {
        setIsConnected(true);
        const data = snapshot.val();
        const weightsArray: number[] = [];

        for (let i = 0; i < loadCellsCount; i++) {
          const weight = data?.[i]?.weight ?? 0;
          weightsArray.push(weight);

          const isEggPresent = weight >= 5; 
          const isPeewee = isEggPresent && weight >= 5 && weight <= 49; 
          const isError = isEggPresent && weight >= 500;

          // Send notification for Peewee (warning) and overweight eggs (error >= 500g)
          if (notificationsEnabled && isEggPresent && (isPeewee || isError)) {
            if (shouldSendNotification(i)) {
              const title = `Load Cell ${i + 1} ${isPeewee ? 'Warning' : 'Alert'}`;
              const description = isPeewee 
                ? `Peewee egg detected: ${weight.toFixed(1)}g (below standard size)`
                : `Overweight egg detected: ${weight.toFixed(1)}g (exceeds 500g limit)!`;

              sendNotification(title, description);
              saveNotificationToFirebase(title, description, isPeewee ? "Moderate" : "Critical");
            }
          }
        }

        setEggWeights(weightsArray);
        setRefreshing(false);
      },
      (error) => {
        console.error("Firebase connection error:", error);
        setIsConnected(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [notificationsEnabled]);

  const onRefresh = () => {
    setRefreshing(true);
    // Firebase listener will update automatically
  };

  // -------- COUNT EGGS BY SIZE --------
  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, Jumbo: 0 };

    eggWeights.forEach((w) => {
      if (w >= 50 && w < 500) { // Only count standard sizes (S, M, L, XL, Jumbo)
        const size = getSizeFromWeight(w);
        if (size !== "-") {
          counts[size] = (counts[size] || 0) + 1;
        }
      }
    });

    return counts;
  }, [eggWeights]);

  // -------- SYSTEM SUMMARY --------
  // Only eggs between 50g - 499g are ACCURATE (sizes S, M, L, XL, Jumbo)
  // Peewee (5-49g) is a warning, NOT accurate and NOT error
  // >= 500g is an error
  const accurateEggs = eggWeights.filter((w) => w >= 50 && w < 500).length; // Only standard sizes
  const estimatedErrors = eggWeights.filter((w) => w >= 500).length; // Only >= 500g is error
  const totalEggs = eggWeights.filter((w) => w >= 5).length; // All eggs including warnings
  const errorRate = totalEggs ? (estimatedErrors / totalEggs) * 100 : 0;
  const avgWeight = totalEggs
    ? eggWeights.filter((w) => w >= 5).reduce((a, b) => a + b, 0) / totalEggs
    : 0;

  // Calculate trends
  const eggTrend = totalEggs - yesterdayStats.totalEggs;
  const errorTrend = errorRate - yesterdayStats.errorRate;

  // Filter load cells
  const filteredCells = useMemo(() => {
    return eggWeights
      .map((weight, index) => ({ weight, index }))
      .filter(({ weight }) => {
        if (filterType === "all") return true;
        if (filterType === "active") return weight >= 5; // Only show eggs >= 5g
        if (filterType === "errors") return weight >= 500; // Only >= 500g is error
        if (filterType === "empty") return weight < 5; // Less than 5g is empty
        return true;
      });
  }, [eggWeights, filterType]);

  const toggleFilter = (type: FilterType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilterType(type);
  };

  const toggleExpandCell = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCell(expandedCell === index ? null : index);
  };

  const saveToHistory = async () => {
    try {
      // Only save if there are eggs present (>= 5g)
      const validEggs = eggWeights.filter(w => w >= 5);
      
      if (validEggs.length === 0) {
        Alert.alert("No Data", "No eggs to save. Place eggs on load cells first.");
        return;
      }
      // Create unique batch ID using timestamp
      const timestamp = Date.now();
      const batchId = `batch_${timestamp}`;
      
      // Create batch data object
      const batchData: any = {
        timestamp: timestamp,
      };
      
      // Add all egg weights (including empty slots for accurate tracking)
      eggWeights.forEach((weight, index) => {
        // Calculate row and slot (2 rows, 8 slots each)
        const row = Math.floor(index / 8) + 1;
        const slot = (index % 8) + 1;
        batchData[`slot_${row}_${slot}`] = weight;
      });
      
      // Save to batches path (not history path)
      const batchRef = ref(database, `batches/${batchId}`);
      await set(batchRef, batchData);
      
      Alert.alert(
        "Success", 
        `Batch saved successfully!\n${validEggs.length} eggs recorded.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Failed to save batch:", error);
      Alert.alert("Error", "Failed to save batch. Please try again.");
    }
  };

  const clearErrors = async () => {
    Alert.alert(
      "Clear Errors",
      "This will reset all overweight load cells (≥500g). Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const eggsRef = ref(database, "eggs");
              const updatedEggs: any = {};
              
              eggWeights.forEach((weight, index) => {
                if (weight >= 500) {
                  updatedEggs[index] = { weight: 0 };
                } else {
                  updatedEggs[index] = { weight };
                }
              });

              await set(eggsRef, updatedEggs);
              Alert.alert("Success", "Error cells cleared!");
            } catch (error) {
              console.error("Failed to clear errors:", error);
              Alert.alert("Error", "Failed to clear errors. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        <Header />

        {/* Connection Status */}
        <View style={[styles.statusBanner, { backgroundColor: isConnected ? "#4CAF50" : "#F44336" }]}>
          <Ionicons
            name={isConnected ? "checkmark-circle" : "close-circle"}
            size={16}
            color="#fff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.statusText}>
            {isConnected ? "Connected to Firebase" : "Connection Lost"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={saveToHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="save-outline" size={20} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.text }]}>Save to History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={clearErrors}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={20} color="#F44336" />
            <Text style={[styles.actionText, { color: colors.text }]}>Clear Errors</Text>
          </TouchableOpacity>
        </View>

        {/* Total Eggs with Trends */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.subtext }]}>TOTAL EGGS GRADED</Text>
          <View style={styles.trendRow}>
            <AnimatedCounter value={totalEggs} style={[styles.totalEggs, { color: colors.accent }]} />
            {eggTrend !== 0 && (
              <View style={styles.trendBadge}>
                <Ionicons
                  name={eggTrend > 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color={eggTrend > 0 ? "#4CAF50" : "#F44336"}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: eggTrend > 0 ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {Math.abs(eggTrend)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.avgWeight, { color: colors.text }]}>
            Average Weight: {avgWeight.toFixed(1)} g
          </Text>

          {/* Size badges */}
          <View style={styles.sizeRow}>
            {Object.keys(sizeCounts).map((size) => (
              <View key={size} style={styles.sizeBadgeContainer}>
                <Text style={{ color: colors.text, fontWeight: "bold" }}>{size}</Text>
                <View style={styles.sizeBadge}>
                  <Text style={[styles.sizeBadgeText, { color: colors.text }]}>
                    {sizeCounts[size]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* System Summary with Trends */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.subtext }]}>SYSTEM SUMMARY</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBox, { backgroundColor: "#e6f9f0" }]}>
              <Text style={[styles.statusLabel, { color: "#4CAF50" }]}>ACCURATE</Text>
              <Text style={[styles.statusValue, { color: "#4CAF50" }]}>
                {accurateEggs}
              </Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: "#ffeaea" }]}>
              <Text style={[styles.statusLabel, { color: "#F44336" }]}>ERRORS</Text>
              <Text style={[styles.statusValue, { color: "#F44336" }]}>{estimatedErrors}</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: "#fff6e5" }]}>
              <Text style={[styles.statusLabel, { color: "#f5a623" }]}>ERROR RATE</Text>
              <View style={styles.trendRow}>
                <Text style={[styles.statusValue, { color: "#f5a623" }]}>
                  {errorRate.toFixed(1)}%
                </Text>
                {errorTrend !== 0 && (
                  <Ionicons
                    name={errorTrend < 0 ? "trending-down" : "trending-up"}
                    size={14}
                    color={errorTrend < 0 ? "#4CAF50" : "#F44336"}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.card },
              filterType === "all" && { backgroundColor: colors.accent },
            ]}
            onPress={() => toggleFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === "all" ? "#fff" : colors.text },
              ]}
            >
              All ({eggWeights.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.card },
              filterType === "active" && { backgroundColor: colors.accent },
            ]}
            onPress={() => toggleFilter("active")}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === "active" ? "#fff" : colors.text },
              ]}
            >
              Active ({totalEggs})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.card },
              filterType === "errors" && { backgroundColor: colors.accent },
            ]}
            onPress={() => toggleFilter("errors")}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === "errors" ? "#fff" : colors.text },
              ]}
            >
              Errors ({estimatedErrors})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.card },
              filterType === "empty" && { backgroundColor: colors.accent },
            ]}
            onPress={() => toggleFilter("empty")}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === "empty" ? "#fff" : colors.text },
              ]}
            >
              Empty ({eggWeights.filter((w) => w < 5).length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Load Cell Grid */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontWeight: "bold" }]}>
            LOAD CELLS
          </Text>

          {filteredCells.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No cells match this filter
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredCells.map(({ weight, index }) => {
                const isEggPresent = weight >= 5; // Only consider >= 5g as present
                const isPeewee = isEggPresent && weight >= 5 && weight <= 49; // Warning only
                const isError = isEggPresent && weight >= 500; // Actual error
                const sizeLabel = isEggPresent ? getSizeFromWeight(weight) : "-";
                const isExpanded = expandedCell === index;

                // Fixed: Use dark text on light warning/error backgrounds for better contrast
                const bgColor = isError ? "#ffeaea" : (isPeewee ? "#FFF9E6" : colors.successBg);
                const textColor = isError ? "#D32F2F" : (isPeewee ? "#E65100" : colors.success);
                // Always use dark text on light backgrounds (both error and warning states)
                const labelTextColor = (isPeewee || isError) ? "#1a1a1a" : colors.text;

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.loadCellCard,
                      {
                        backgroundColor: bgColor,
                        transform: isError ? [{ scale: pulseAnim }] : [], // Only pulse actual errors
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleExpandCell(index)}
                      activeOpacity={0.7}
                      style={{ width: "100%", alignItems: "center" }}
                    >
                      <View style={styles.cellHeader}>
                        <Text style={{ color: labelTextColor, fontWeight: "700", fontSize: 13 }}>
                          Load {index + 1}
                        </Text>
                        {(isError || isPeewee) && (
                          <View style={styles.iconBadge}>
                            {isError && (
                              <Ionicons name="alert-circle" size={16} color="#D32F2F" />
                            )}
                            {isPeewee && (
                              <Ionicons name="warning" size={16} color="#E65100" />
                            )}
                          </View>
                        )}
                      </View>
                      <Text
                        style={{
                          color: textColor,
                          fontWeight: "700",
                          fontSize: 18,
                        }}
                      >
                        {weight.toFixed(1)} g
                      </Text>
                      <Text
                        style={{ color: labelTextColor, fontWeight: "600", marginTop: 4, fontSize: 12 }}
                      >
                        Size: {sizeLabel}
                      </Text>

                      {isExpanded && (
                        <View style={styles.expandedInfo}>
                          <Text style={[styles.expandedText, { color: labelTextColor }]}>
                            Status: {isError ? "⚠️ Error" : isPeewee ? "⚠️ Warning" : "✓ Normal"}
                          </Text>
                          <Text style={[styles.expandedText, { color: labelTextColor }]}>
                            Range: {sizeThresholds[sizeLabel]?.min || 0}-
                            {sizeThresholds[sizeLabel]?.max || 0}g
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      <NavBar currentTab="Dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 90 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 15,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  card: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: "600", marginBottom: 5 },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalEggs: { fontSize: 40, fontWeight: "bold" },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  trendText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 4,
  },
  avgWeight: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  sizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sizeBadgeContainer: { alignItems: "center" },
  sizeBadge: {
    marginTop: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  sizeBadgeText: { fontSize: 12, fontWeight: "600" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statusBox: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statusLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  statusValue: { fontSize: 18, fontWeight: "bold" },
  filterScroll: {
    marginHorizontal: 15,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  loadCellCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cellHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 4,
    position: "relative",
  },
  iconBadge: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  expandedInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    width: "100%",
  },
  expandedText: {
    fontSize: 11,
    marginTop: 2,
  },
});
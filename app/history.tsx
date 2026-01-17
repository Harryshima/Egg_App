import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
} from "react-native";
import { useTheme } from "./theme/ThemeProvider";
import Header from "./components/Header";
import NavBar from "./components/navbar";
import { Ionicons } from "@expo/vector-icons";
import { database } from "./lib/firebase";
import { ref, onValue } from "firebase/database";

// -------- SIZE THRESHOLDS ---------
const sizeThresholds = {
  Peewee: [5, 49],
  S: [50, 54],
  M: [55, 60],
  L: [61, 64],
  XL: [65, 68],
  Jumbo: [69, 499],
};

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterType = "all" | "today" | "week" | "month";
type SortType = "timestamp" | "eggs" | "errorRate" | "avgWeight";

interface BatchData {
  batchId: string;
  timestamp: number;
  date: string;
  time: string;
  weights: number[];
  totalEggs: number;
  sizeCounts: Record<string, number>;
  estimatedErrors: number;
  peeweeCount: number;
  errorRate: number;
  avgWeight: number;
  statusText: string;
  statusColor: string;
}

export default function History(): React.ReactElement {
  const { colors, darkMode, animatedOpacity } = useTheme();
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("timestamp");
  const [sortAscending, setSortAscending] = useState(false);

  // Format timestamp to readable date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  // Get date string for filtering (YYYY-MM-DD)
  const getDateString = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toISOString().split("T")[0];
  };

  // Fetch batches from Firebase
  const fetchBatches = () => {
    const batchesRef = ref(database, "batches");
    const unsubscribe = onValue(batchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedBatches: BatchData[] = [];

        Object.entries(data).forEach(([batchId, batchData]: any) => {
          // Each batch should have a timestamp and weights
          const timestamp = batchData.timestamp || Date.now();
          
          // Get weights from the batch (filter out non-weight fields)
          const weights: number[] = Object.entries(batchData)
            .filter(([key]) => key !== 'timestamp' && key !== 'metadata')
            .map(([_, item]: any) => {
              if (typeof item === 'object' && item.weight !== undefined) {
                return item.weight;
              }
              return typeof item === 'number' ? item : 0;
            });
          
          // Count ALL eggs >= 5g (including Peewee, standard sizes)
          const totalEggs = weights.filter((w) => w >= 5).length;

          // Count all sizes
          const sizeCounts: Record<string, number> = {
            Peewee: 0,
            S: 0,
            M: 0,
            L: 0,
            XL: 0,
            Jumbo: 0,
          };

          weights.forEach((w) => {
            // Count ALL eggs >= 5g and < 500g
            if (w >= 5 && w < 500) {
              for (const size in sizeThresholds) {
                const [min, max] = sizeThresholds[size as keyof typeof sizeThresholds];
                if (w >= min && w <= max) {
                  sizeCounts[size]++;
                  break;
                }
              }
            }
          });

          // Count Peewee (warnings) and errors (>= 500g)
          const peeweeCount = weights.filter((w) => w >= 5 && w <= 49).length;
          const estimatedErrors = weights.filter((w) => w >= 500).length;
          
          // Error rate based on total eggs
          const errorRate = totalEggs ? (estimatedErrors / totalEggs) * 100 : 0;
          
          // Calculate average weight for ALL eggs >= 5g
          const validWeights = weights.filter((w) => w >= 5);
          const avgWeight = validWeights.length
            ? validWeights.reduce((a, b) => a + b, 0) / validWeights.length
            : 0;

          // Status based on error rate
          let statusText = "Stable";
          let statusColor = "#4CAF50";
          if (errorRate > 10 && errorRate <= 15) {
            statusText = "Moderate";
            statusColor = "#FFC107";
          } else if (errorRate > 15) {
            statusText = "Critical";
            statusColor = "#F44336";
          }

          formattedBatches.push({
            batchId,
            timestamp,
            date: formatDate(timestamp),
            time: formatTime(timestamp),
            weights,
            totalEggs,
            sizeCounts,
            estimatedErrors,
            peeweeCount,
            errorRate,
            avgWeight,
            statusText,
            statusColor,
          });
        });

        // Sort by timestamp (newest first by default)
        formattedBatches.sort((a, b) => b.timestamp - a.timestamp);
        setBatches(formattedBatches);
      } else {
        setBatches([]);
      }
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchBatches();
    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  // Filter by date range
  const filteredBatches = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    const getWeekAgo = () => {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString().split("T")[0];
    };
    
    const getMonthAgo = () => {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo.toISOString().split("T")[0];
    };

    let filtered = batches;

    // Apply date filter
    if (filterType === "today") {
      filtered = filtered.filter(batch => getDateString(batch.timestamp) === today);
    } else if (filterType === "week") {
      const weekAgo = getWeekAgo();
      filtered = filtered.filter(batch => getDateString(batch.timestamp) >= weekAgo);
    } else if (filterType === "month") {
      const monthAgo = getMonthAgo();
      filtered = filtered.filter(batch => getDateString(batch.timestamp) >= monthAgo);
    }

    // Apply search filter (search by date or batch ID)
    if (searchQuery) {
      filtered = filtered.filter(batch => 
        batch.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.time.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortType) {
        case "timestamp":
          comparison = a.timestamp - b.timestamp;
          break;
        case "eggs":
          comparison = a.totalEggs - b.totalEggs;
          break;
        case "errorRate":
          comparison = a.errorRate - b.errorRate;
          break;
        case "avgWeight":
          comparison = a.avgWeight - b.avgWeight;
          break;
      }

      return sortAscending ? comparison : -comparison;
    });

    return sorted;
  }, [batches, filterType, searchQuery, sortType, sortAscending]);

  const toggleExpand = (batchId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
  };

  const toggleSort = (type: SortType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (sortType === type) {
      setSortAscending(!sortAscending);
    } else {
      setSortType(type);
      setSortAscending(false);
    }
  };

  const exportToCSV = async () => {
    if (filteredBatches.length === 0) {
      Alert.alert("No Data", "There's no data to export.");
      return;
    }

    let csv = "Batch ID,Date,Time,Total Eggs,Average Weight (g),Peewee,Errors,Error Rate (%),Status,Peewee,S,M,L,XL,Jumbo,Overweight (>=500g)\n";
    
    filteredBatches.forEach(batch => {
      csv += `${batch.batchId},${batch.date},${batch.time},${batch.totalEggs},${batch.avgWeight.toFixed(1)},${batch.peeweeCount},${batch.estimatedErrors},${batch.errorRate.toFixed(1)},${batch.statusText},`;
      csv += `${batch.sizeCounts.Peewee},${batch.sizeCounts.S},${batch.sizeCounts.M},${batch.sizeCounts.L},${batch.sizeCounts.XL},${batch.sizeCounts.Jumbo},${batch.estimatedErrors}\n`;
    });

    try {
      await Share.share({
        message: csv,
        title: "Batch History Export",
      });
    } catch (error) {
      console.error("Export failed:", error);
      Alert.alert("Export Failed", "Could not export data. Please try again.");
    }
  };

  // Group batches by date for better organization
  const groupedBatches = useMemo(() => {
    const groups: Record<string, BatchData[]> = {};
    
    filteredBatches.forEach(batch => {
      const dateKey = getDateString(batch.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(batch);
    });
    
    return groups;
  }, [filteredBatches]);

  if (loading) {
    return (
      <Animated.View 
        style={[
          styles.container, 
          { 
            backgroundColor: darkMode ? colors.background : "#f0f0f0",
            opacity: animatedOpacity 
          }
        ]}
      >
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading batch history...</Text>
        </View>
        <NavBar currentTab="History" />
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: darkMode ? colors.background : "#f0f0f0",
          opacity: animatedOpacity 
        }
      ]}
    >
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }}
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

        {/* Stats Summary */}
        <View style={[styles.statsContainer, { backgroundColor: darkMode ? colors.card : "#fff" }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{filteredBatches.length}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Total Batches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {filteredBatches.reduce((sum, b) => sum + b.totalEggs, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Total Eggs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {filteredBatches.length > 0 
                ? (filteredBatches.reduce((sum, b) => sum + b.errorRate, 0) / filteredBatches.length).toFixed(1)
                : "0.0"}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Avg Error Rate</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: darkMode ? colors.card : "#fff" }]}>
          <Ionicons name="search-outline" size={20} color={colors.subtext} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by date, time, or batch ID..."
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: darkMode ? colors.card : "#fff" },
              filterType === "all" && { backgroundColor: colors.accent }
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setFilterType("all");
            }}
          >
            <Text style={[styles.filterText, { color: filterType === "all" ? "#fff" : colors.text }]}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: darkMode ? colors.card : "#fff" },
              filterType === "today" && { backgroundColor: colors.accent }
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setFilterType("today");
            }}
          >
            <Text style={[styles.filterText, { color: filterType === "today" ? "#fff" : colors.text }]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: darkMode ? colors.card : "#fff" },
              filterType === "week" && { backgroundColor: colors.accent }
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setFilterType("week");
            }}
          >
            <Text style={[styles.filterText, { color: filterType === "week" ? "#fff" : colors.text }]}>This Week</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: darkMode ? colors.card : "#fff" },
              filterType === "month" && { backgroundColor: colors.accent }
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setFilterType("month");
            }}
          >
            <Text style={[styles.filterText, { color: filterType === "month" ? "#fff" : colors.text }]}>This Month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: darkMode ? colors.card : "#fff" }]}
            onPress={exportToCSV}
          >
            <Ionicons name="download-outline" size={16} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.filterText, { color: colors.text }]}>Export</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={[styles.sortLabel, { color: colors.subtext }]}>Sort by:</Text>
          <TouchableOpacity style={styles.sortButton} onPress={() => toggleSort("timestamp")}>
            <Text style={[styles.sortText, { color: sortType === "timestamp" ? colors.accent : colors.text }]}>Time</Text>
            {sortType === "timestamp" && (
              <Ionicons 
                name={sortAscending ? "arrow-up" : "arrow-down"} 
                size={14} 
                color={colors.accent} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={() => toggleSort("eggs")}>
            <Text style={[styles.sortText, { color: sortType === "eggs" ? colors.accent : colors.text }]}>Eggs</Text>
            {sortType === "eggs" && (
              <Ionicons 
                name={sortAscending ? "arrow-up" : "arrow-down"} 
                size={14} 
                color={colors.accent} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={() => toggleSort("errorRate")}>
            <Text style={[styles.sortText, { color: sortType === "errorRate" ? colors.accent : colors.text }]}>Error</Text>
            {sortType === "errorRate" && (
              <Ionicons 
                name={sortAscending ? "arrow-up" : "arrow-down"} 
                size={14} 
                color={colors.accent} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {filteredBatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={64} color={colors.subtext} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No batches found</Text>
            <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
              {searchQuery || filterType !== "all" 
                ? "Try adjusting your filters" 
                : "Start processing batches to see history"}
            </Text>
          </View>
        ) : (
          // Render grouped batches by date
          Object.keys(groupedBatches).sort((a, b) => b.localeCompare(a)).map(dateKey => (
            <View key={dateKey}>
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <Text style={[styles.dateHeaderText, { color: colors.text }]}>
                  {formatDate(groupedBatches[dateKey][0].timestamp)}
                </Text>
                <Text style={[styles.dateHeaderCount, { color: colors.subtext }]}>
                  {groupedBatches[dateKey].length} {groupedBatches[dateKey].length === 1 ? 'batch' : 'batches'}
                </Text>
              </View>

              {/* Batches for this date */}
              {groupedBatches[dateKey].map((batch) => {
                const isExpanded = expandedBatch === batch.batchId;
                const statusIcon =
                  batch.statusText === "Stable"
                    ? "checkmark-circle-outline"
                    : batch.statusText === "Moderate"
                    ? "alert-circle-outline"
                    : "close-circle-outline";

                return (
                  <View
                    key={batch.batchId}
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
                      onPress={() => toggleExpand(batch.batchId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardHeaderLeft}>
                        <Ionicons name={statusIcon as any} size={20} color={batch.statusColor} style={{ marginRight: 8 }} />
                        <View>
                          <Text style={[styles.batchIdText, { color: colors.text }]}>Batch #{batch.batchId.slice(-8)}</Text>
                          <Text style={[styles.timeText, { color: colors.subtext }]}>{batch.time}</Text>
                        </View>
                      </View>
                      <View style={styles.cardHeaderRight}>
                        <Text style={[styles.eggCount, { color: colors.subtext }]}>{batch.totalEggs} eggs</Text>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.subtext} />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.cardContent}>
                        {/* Total Eggs */}
                        <View style={[styles.infoRow, { backgroundColor: darkMode ? "#333" : "#f9f9f9" }]}>
                          <Ionicons name="egg-outline" size={18} color={colors.subtext} style={{ marginRight: 6 }} />
                          <Text style={[styles.infoTitle, { color: colors.subtext }]}>Total Eggs</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{batch.totalEggs}</Text>
                        </View>

                        {/* Average Weight */}
                        <View style={[styles.infoRow, { backgroundColor: darkMode ? "#333" : "#f9f9f9" }]}>
                          <Ionicons name="speedometer-outline" size={18} color={colors.subtext} style={{ marginRight: 6 }} />
                          <Text style={[styles.infoTitle, { color: colors.subtext }]}>Average Weight</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{batch.avgWeight.toFixed(1)} g</Text>
                        </View>

                        {/* Peewee Count (Warnings) */}
                        {batch.peeweeCount > 0 && (
                          <View style={[styles.infoRow, { backgroundColor: darkMode ? "#333" : "#f9f9f9" }]}>
                            <Ionicons name="warning-outline" size={18} color="#f5a623" style={{ marginRight: 6 }} />
                            <Text style={[styles.infoTitle, { color: colors.subtext }]}>Peewee (Warnings)</Text>
                            <Text style={[styles.infoValue, { color: "#f5a623" }]}>{batch.peeweeCount}</Text>
                          </View>
                        )}

                        {/* Errors (>=500g) */}
                        {batch.estimatedErrors > 0 && (
                          <View style={[styles.infoRow, { backgroundColor: darkMode ? "#333" : "#f9f9f9" }]}>
                            <Ionicons name="alert-circle-outline" size={18} color="#F44336" style={{ marginRight: 6 }} />
                            <Text style={[styles.infoTitle, { color: colors.subtext }]}>Overweight (≥500g)</Text>
                            <Text style={[styles.infoValue, { color: "#F44336" }]}>{batch.estimatedErrors}</Text>
                          </View>
                        )}

                        {/* Error Rate */}
                        <View style={[styles.infoRow, { backgroundColor: darkMode ? "#333" : "#f9f9f9" }]}>
                          <Ionicons name="alert-circle-outline" size={18} color={batch.statusColor} style={{ marginRight: 6 }} />
                          <Text style={[styles.infoTitle, { color: colors.subtext }]}>Error Rate</Text>
                          <Text style={[styles.infoValue, { color: batch.statusColor }]}>{batch.errorRate.toFixed(1)}%</Text>
                        </View>

                        {/* Status */}
                        <View style={[styles.infoRow, { backgroundColor: darkMode ? "#333" : "#f9f9f9" }]}>
                          <Ionicons name="fitness-outline" size={18} color={batch.statusColor} style={{ marginRight: 6 }} />
                          <Text style={[styles.infoTitle, { color: colors.subtext }]}>Status</Text>
                          <Text style={[styles.infoValue, { color: batch.statusColor }]}>{batch.statusText}</Text>
                        </View>

                        {/* Size counts - Show ALL sizes */}
                        <View style={styles.sizeBadgeRow}>
                          {Object.keys(batch.sizeCounts).map((size) => {
                            const count = batch.sizeCounts[size];
                            if (count === 0) return null; // Hide sizes with 0 count
                            
                            // Color code by size
                            let badgeColor = darkMode ? "#555" : "#eee";
                            let textColor = colors.text;
                            
                            if (size === "Peewee") {
                              badgeColor = "#FFF9E6";
                              textColor = "#f5a623";
                            }
                            
                            return (
                              <View key={size} style={[styles.sizeBadge, { backgroundColor: badgeColor }]}>
                                <Text style={{ color: textColor, fontWeight: "600" }}>
                                  {size}: {count}
                                </Text>
                              </View>
                            );
                          })}
                          {/* Show overweight errors separately */}
                          {batch.estimatedErrors > 0 && (
                            <View style={[styles.sizeBadge, { backgroundColor: "#FFE5E5" }]}>
                              <Text style={{ color: "#F44336", fontWeight: "600" }}>
                                Error: {batch.estimatedErrors}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Full Batch ID */}
                        <View style={[styles.batchIdContainer, { backgroundColor: darkMode ? "#2a2a2a" : "#f5f5f5" }]}>
                          <Text style={[styles.batchIdLabel, { color: colors.subtext }]}>Full Batch ID:</Text>
                          <Text style={[styles.batchIdFull, { color: colors.text }]} selectable>
                            {batch.batchId}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <NavBar currentTab="History" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 15,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },

  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },

  statDivider: {
    width: 1,
    backgroundColor: "#ddd",
    marginHorizontal: 8,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },

  filterScroll: {
    marginHorizontal: 15,
    marginBottom: 12,
  },
 filterButton: {
    flexDirection: "row",
    alignItems: "center",
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

  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    marginBottom: 12,
  },

  sortLabel: {
    fontSize: 13,
    marginRight: 8,
  },

  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },

  sortText: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },

  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 16,
    marginBottom: 8,
  },

  dateHeaderText: {
    fontSize: 16,
    fontWeight: "700",
  },

  dateHeaderCount: {
    fontSize: 13,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
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

  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  eggCount: {
    fontSize: 13,
    marginRight: 8,
  },

  batchIdText: {
    fontSize: 16,
    fontWeight: "600",
  },

  timeText: {
    fontSize: 12,
    marginTop: 2,
  },

  cardContent: { marginTop: 10 },

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

  infoTitle: { fontSize: 14 },

  infoValue: { fontSize: 16, fontWeight: "700" },

  sizeBadgeRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    marginTop: 8,
    marginBottom: 8,
  },

  sizeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },

  batchIdContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },

  batchIdLabel: {
    fontSize: 11,
    marginBottom: 4,
  },

  batchIdFull: {
    fontSize: 10,
    fontFamily: "monospace",
  },
});
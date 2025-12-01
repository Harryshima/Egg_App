import React, { useMemo, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "./theme/ThemeProvider";
import Header from "./components/Header";
import NavBar from "./components/navbar";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const sizeThresholds = {
  S: [0, 45],
  M: [45, 55],
  L: [56, 65],
  XL: [66, 75],
  J: [76, 99],
};

export default function Dashboard(): React.ReactElement {
  const { colors } = useTheme();

  const totalEggs = 15;

  // Simulate eggs with ~10% errors
  const eggWeights = useMemo(() => {
    const weights: number[] = [];
    for (let i = 0; i < totalEggs; i++) {
      if (i < Math.floor(totalEggs * 0.1)) {
        weights.push(Math.random() < 0.5 ? 20 + Math.random() * 9 : 91 + Math.random() * 10);
      } else {
        weights.push(45 + Math.random() * 35);
      }
    }
    return weights.sort(() => Math.random() - 0.5);
  }, [totalEggs]);

  // Count eggs by size
  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, J: 0 };
    eggWeights.forEach((w) => {
      for (const size in sizeThresholds) {
        const [min, max] = sizeThresholds[size as keyof typeof sizeThresholds];
        if (w >= min && w <= max) {
          counts[size]++;
          break;
        }
      }
    });
    return counts;
  }, [eggWeights]);

  const estimatedErrors = useMemo(() => {
    return eggWeights.filter((w) => w < 30 || w > 90).length;
  }, [eggWeights]);

  const errorRate = (estimatedErrors / totalEggs) * 100;
  const systemConfidence = 100 - errorRate;

  const getStatus = (errorRate: number) => {
    if (errorRate <= 20) return { text: "Stable", color: "#4CAF50" };
    if (errorRate <= 25) return { text: "Moderate", color: "#FFC107" };
    return { text: "Critical", color: "#F44336" };
  };
  const status = getStatus(errorRate);

  const avgWeight = useMemo(() => {
    return eggWeights.reduce((a, b) => a + b, 0) / totalEggs;
  }, [eggWeights, totalEggs]);

  const radius = 50;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);
  const [displayedPercent, setDisplayedPercent] = useState(0);

  useEffect(() => {
    progress.value = withTiming(systemConfidence, { duration: 1200 });

    const interval = setInterval(() => {
      setDisplayedPercent(Math.round(progress.value));
    }, 16);

    return () => clearInterval(interval);
  }, [systemConfidence]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header />

        {/* Total Eggs */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.subtext }]}>TOTAL EGGS GRADED</Text>
          <Text style={[styles.totalEggs, { color: colors.accent }]}>{totalEggs}</Text>
          <Text style={[styles.avgWeight, { color: colors.text }]}>
            Average Weight: {avgWeight.toFixed(1)} g
          </Text>

          {/* Size badges */}
          <View style={styles.sizeRow}>
            {Object.keys(sizeCounts).map((size) => (
              <View key={size} style={styles.sizeBadgeContainer}>
                <Text style={{ color: colors.text, fontWeight: "bold" }}>{size}</Text>
                <View style={styles.sizeBadge}>
                  <Text style={[styles.sizeBadgeText, {color: colors.text}]}>{sizeCounts[size]}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* System Summary */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.subtext }]}>SYSTEM SUMMARY</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBox, { backgroundColor: "#e6f9f0" }]}>
              <Text style={[styles.statusLabel, { color: "#4CAF50" }]}>ACCURATE</Text>
              <Text style={[styles.statusValue, { color: "#4CAF50" }]}>{totalEggs - estimatedErrors}</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: "#ffeaea" }]}>
              <Text style={[styles.statusLabel, { color: "#F44336" }]}>ERRORS</Text>
              <Text style={[styles.statusValue, { color: "#F44336" }]}>{estimatedErrors}</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: "#fff6e5" }]}>
              <Text style={[styles.statusLabel, { color: "#f5a623" }]}>ERROR RATE</Text>
              <Text style={[styles.statusValue, { color: "#f5a623" }]}>{errorRate.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontWeight: "bold" }]}>DEVICE STATUS</Text>
          <View style={styles.statusContent}>
            <Svg width={radius * 2 + 20} height={radius * 2 + 20}>
              <G rotation="-90" origin={`${radius + 10},${radius + 10}`}>
                <Circle
                  cx={radius + 10}
                  cy={radius + 10}
                  r={radius}
                  stroke="#eee"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <AnimatedCircle
                  cx={radius + 10}
                  cy={radius + 10}
                  r={radius}
                  stroke={status.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={circumference - (progress.value / 100) * circumference}
                  strokeLinecap="round"
                  fill="none"
                />
              </G>
              <SvgText
                x={radius + 10}
                y={radius + 15}
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
                fill={status.color}
              >
                {displayedPercent}%
              </SvgText>
            </Svg>
            <Text style={[styles.statusLabelText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>
      </ScrollView>

      <NavBar currentTab="Dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },

  scrollContent: { 
    paddingBottom: 90 
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

  cardTitle: { 
    fontSize: 13, 
    fontWeight: "600", 
    marginBottom: 5 
  },

  totalEggs: { 
    fontSize: 40, 
    fontWeight: "bold" 
  },

  avgWeight: { 
    fontSize: 14, 
    fontWeight: "500", 
    marginBottom: 6 
  },

  sizeRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 6 
  },

  sizeBadgeContainer: { 
    alignItems: "center" 
  },

  sizeBadge: {
    marginTop: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },

  sizeBadgeText: { 
    color: "#000", 
    fontSize: 12, 
    fontWeight: "600" 
  },

  statusRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 10 
  },

  statusBox: { 
    flex: 1, 
    marginHorizontal: 5, 
    borderRadius: 12, 
    padding: 10, 
    alignItems: "center" 
  },

  statusLabel: { 
    fontSize: 11, 
    fontWeight: "600", 
    marginBottom: 4 
  },

  statusValue: { 
    fontSize: 18, 
    fontWeight: "bold" 
  },

  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: "center",
  },
  statusContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  statusLabelText: { 
    fontSize: 18, 
    fontWeight: "700", 
    marginTop: 10 
  },
  
});

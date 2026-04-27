import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

export default function LecturerDashboard({ navigation }) {
  const [stats, setStats] = useState({
    courses: 0,
    classes: 0,
    reports: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Try to get real stats from API
      const response = await api.get("/dashboard/lecturer");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      // If API fails, load stats from local data
      console.log("Using local stats fallback");
      await loadLocalStats();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStats = async () => {
    try {
      // Get courses count
      const coursesRes = await api.get("/courses");
      if (coursesRes.data.success) {
        const coursesCount = coursesRes.data.courses.length;
        
        // Get reports count
        const reportsRes = await api.get("/reports");
        const reportsCount = reportsRes.data.success ? reportsRes.data.reports.length : 0;
        
        setStats({
          courses: coursesCount,
          classes: coursesCount, // approximate
          reports: reportsCount,
        });
      }
    } catch (error) {
      console.log("Failed to load local stats");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const logout = async () => {
    await AsyncStorage.multiRemove(["auth_token", "user_role", "user_data"]);
    navigation.replace("Login");
  };

  const NavCard = ({ title, subtitle, route, accent }) => (
    <TouchableOpacity
      style={[styles.navCard, { borderLeftColor: accent, borderLeftWidth: 3 }]}
      onPress={() => navigation.navigate(route)}
      activeOpacity={0.7}
    >
      <View style={styles.navCardInner}>
        <Text style={styles.navCardTitle}>{title}</Text>
        <Text style={styles.navCardSub}>{subtitle}</Text>
      </View>
      <Text style={styles.navArrow}>›</Text>
    </TouchableOpacity>
  );

  const StatBox = ({ value, label, bg }) => (
    <View style={[styles.statBox, { backgroundColor: bg }]}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>L</Text>
          </View>

          <View>
            <Text style={styles.portalTitle}>Lecturer Portal</Text>
            <Text style={styles.portalSub}>My Teaching Dashboard</Text>
          </View>

          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <StatBox value={stats.courses} label="My Courses" bg="#E6F1FB" />
          <StatBox value={stats.classes} label="Classes" bg="#EEEDFE" />
          <StatBox value={stats.reports} label="Reports" bg="#E1F5EE" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NAVIGATION</Text>

        <NavCard
          title="Reports"
          subtitle="Submit lecture reports"
          route="LectureReportForm"
          accent="#2563eb"
        />

        <NavCard
          title="My Classes"
          subtitle="View assigned classes only"
          route="Classes"
          accent="#7c3aed"
        />

        <NavCard
          title="Attendance"
          subtitle="Mark student attendance"
          route="Attendance"
          accent="#16a34a"
        />

        <NavCard
          title="Ratings"
          subtitle="Student feedback"
          route="Ratings"
          accent="#d97706"
        />

        <NavCard
          title="Monitoring"
          subtitle="Performance overview"
          route="Monitoring"
          accent="#475569"
        />
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  header: {
    backgroundColor: "#111827",
    padding: 20,
    paddingTop: 54,
    paddingBottom: 22,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#93c5fd",
    fontSize: 14,
    fontWeight: "600",
  },
  portalTitle: {
    color: "#f1f5f9",
    fontSize: 17,
    fontWeight: "700",
  },
  portalSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    marginLeft: "auto",
    backgroundColor: "#14532d",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#166534",
  },
  activeBadgeText: {
    color: "#86efac",
    fontSize: 11,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 11,
    color: "#334155",
    marginTop: 3,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  navCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  navCardInner: {
    flex: 1,
  },
  navCardTitle: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "600",
  },
  navCardSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  navArrow: {
    color: "#475569",
    fontSize: 22,
  },
  logoutBtn: {
    backgroundColor: "#1c0a0a",
    borderWidth: 1,
    borderColor: "#7f1d1d",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 32,
    marginTop: 4,
  },
  logoutText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "600",
  },
});
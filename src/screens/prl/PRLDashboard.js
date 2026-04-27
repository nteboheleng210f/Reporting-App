import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";

export default function PRLDashboard({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    courses: 0,
    lecturers: 0,
    pendingReports: 0,
    reviewedReports: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Try to get real stats from API
      const response = await api.get("/prl/stats");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.log("PRL stats endpoint not available, loading local data");
      await loadLocalStats();
    } finally {
      setStatsLoading(false);
    }
  };

  const loadLocalStats = async () => {
    try {
      // Get courses count
      const coursesRes = await api.get("/courses");
      const coursesCount = coursesRes.data.success ? coursesRes.data.courses.length : 0;
      
      // Get unique lecturers from courses
      const lecturers = new Set();
      if (coursesRes.data.success) {
        coursesRes.data.courses.forEach(course => {
          if (course.lecturerId) lecturers.add(course.lecturerId);
        });
      }
      
      // Get reports
      const reportsRes = await api.get("/reports");
      const reports = reportsRes.data.success ? reportsRes.data.reports : [];
      const pending = reports.filter(r => r.status === "pending").length;
      const reviewed = reports.filter(r => r.status === "reviewed").length;
      
      setStats({
        courses: coursesCount,
        lecturers: lecturers.size,
        pendingReports: pending,
        reviewedReports: reviewed,
      });
    } catch (error) {
      console.log("Failed to load local stats");
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.multiRemove(["auth_token", "user_role", "user_data"]);
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const NavCard = ({ title, subtitle, route, accent, isLogout }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accent }, isLogout && styles.logoutCard]}
      onPress={isLogout ? logout : () => navigation.navigate(route)}
      activeOpacity={0.7}
    >
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, isLogout && styles.logoutTitle]}>{title}</Text>
        {subtitle ? (
          <Text style={styles.cardText}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={[styles.arrow, isLogout && styles.logoutArrow]}>›</Text>
    </TouchableOpacity>
  );

  if (statsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>PRL</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Principal Lecturer</Text>
            <Text style={styles.subtitle}>Supervisor Dashboard</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Supervisor</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.courses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.lecturers}</Text>
            <Text style={styles.statLabel}>Lecturers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#fbbf24" }]}>{stats.pendingReports}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4ade80" }]}>{stats.reviewedReports}</Text>
            <Text style={styles.statLabel}>Reviewed</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MODULES</Text>

        <NavCard
          title="Reports"
          subtitle="View lecturer reports & add feedback"
          route="PRLReports"
          accent="#16a34a"
        />
        <NavCard
          title="Courses"
          subtitle="View courses & lecturers"
          route="Courses"
          accent="#2563eb"
        />
        <NavCard
          title="Ratings"
          subtitle="View student ratings"
          route="Ratings"
          accent="#d97706"
        />
        <NavCard
          title="Monitoring"
          subtitle="Track lecturer performance"
          route="Monitoring"
          accent="#475569"
        />
      </View>

      <View style={styles.section}>
        <NavCard
          title="Logout"
          accent="#dc2626"
          isLogout
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b18",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#070b18",
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 10,
  },
  header: {
    backgroundColor: "#0f172a",
    padding: 20,
    paddingTop: 54,
    paddingBottom: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 0.5,
    borderColor: "#1e293b",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#14532d",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#86efac",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#f1f5f9",
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#052e16",
    borderWidth: 1,
    borderColor: "#166534",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#334155",
    marginVertical: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#0f172a",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderLeftWidth: 3,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "600",
  },
  cardText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  arrow: {
    color: "#334155",
    fontSize: 22,
    fontWeight: "300",
    marginLeft: 8,
  },
  logoutCard: {
    backgroundColor: "#1c0a0a",
    borderColor: "#7f1d1d",
    marginBottom: 36,
    marginTop: 4,
  },
  logoutTitle: {
    color: "#fca5a5",
  },
  logoutArrow: {
    color: "#7f1d1d",
  },
});
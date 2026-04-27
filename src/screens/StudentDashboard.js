import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const NavItem = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.navItem, active && styles.navItemActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const StatCard = ({ value, label, sub, color }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

const ActionCard = ({ label, onPress }) => (
  <TouchableOpacity
    style={styles.actionCard}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const UpcomingClassCard = ({ classData, loading }) => {
  if (loading) {
    return (
      <View style={styles.upcomingCard}>
        <ActivityIndicator size="small" color="#4f7cde" />
        <Text style={styles.upcomingLoading}>Loading next class...</Text>
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={styles.upcomingCard}>
        <Text style={styles.upcomingEmpty}>No upcoming classes today</Text>
      </View>
    );
  }

  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingLeft}>
        <Text style={styles.upcomingCourse}>
          {classData.courseName || classData.className} 
          {classData.courseCode ? ` (${classData.courseCode})` : ''}
        </Text>
        <Text style={styles.upcomingCode}>
          {classData.day} • {classData.time}
        </Text>
        <Text style={styles.upcomingVenue}>{classData.venue}</Text>
      </View>
    </View>
  );
};

export default function StudentDashboard({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [upcomingClass, setUpcomingClass] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const navItems = [
    { label: "Dashboard" },
    { label: "Attendance" },
    { label: "Ratings" },
    { label: "Monitoring" },
  ];

  const fetchStats = async () => {
    try {
      // Try to get attendance stats
      const attendanceRes = await api.get("/attendance/student");
      if (attendanceRes.data.success && attendanceRes.data.attendance) {
        const attendance = attendanceRes.data.attendance;
        const present = attendance.filter(a => a.status === "Present").length;
        const total = attendance.length;
        const percent = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        setAttendancePercent(percent);
      }
    } catch (error) {
      console.log("Failed to load attendance stats");
    }

    try {
      // Try to get ratings count
      const ratingsRes = await api.get("/ratings");
      if (ratingsRes.data.success) {
        setRatingsCount(ratingsRes.data.ratings.length);
      }
    } catch (error) {
      console.log("Failed to load ratings stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUpcomingClass = async () => {
    try {
      // Get all classes and find upcoming
      const response = await api.get("/classes");
      if (response.data.success && response.data.classes.length > 0) {
        // Just show first class as upcoming for demo
        setUpcomingClass(response.data.classes[0]);
      }
    } catch (error) {
      console.log("Upcoming class error:", error);
      setUpcomingClass(null);
    } finally {
      setClassLoading(false);
    }
  };

  const getUserData = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setUserEmail(user.email || "");
    }
  };

  useEffect(() => {
    getUserData();
    fetchStats();
    fetchUpcomingClass();
  }, []);

  const handleNav = (label) => {
    setActiveNav(label);
    if (label === "Attendance") navigation.navigate("Attendance");
    if (label === "Ratings") navigation.navigate("Ratings");
    if (label === "Monitoring") navigation.navigate("Monitoring");
  };

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

  if (statsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f7cde" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.layout}>
        <View style={styles.sidebar}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>IS</Text>
            </View>
          </View>

          {navItems.map((item) => (
            <NavItem
              key={item.label}
              label={item.label}
              active={activeNav === item.label}
              onPress={() => handleNav(item.label)}
            />
          ))}
        </View>

        <ScrollView
          style={styles.main}
          contentContainerStyle={styles.mainContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.pageTitle}>Your Dashboard</Text>
            </View>
            <View style={styles.userPill}>
              <View style={styles.pillAvatar}>
                <Text style={styles.pillAvatarText}>
                  {userEmail?.[0]?.toUpperCase() || "S"}
                </Text>
              </View>
              <Text style={styles.pillLabel}>Student</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <StatCard
              value={`${attendancePercent}%`}
              label="Attendance"
              sub="Present this term"
              color="#4f7cde"
            />
            <StatCard
              value={ratingsCount}
              label="Ratings Given"
              sub="Lecturer reviews"
              color="#2daa70"
            />
          </View>

          <Text style={styles.sectionTitle}>Upcoming Class</Text>
          <UpcomingClassCard
            classData={upcomingClass}
            loading={classLoading}
          />

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              label="Attendance"
              onPress={() => navigation.navigate("Attendance")}
            />
            <ActionCard
              label="Ratings"
              onPress={() => navigation.navigate("Ratings")}
            />
            <ActionCard
              label="Monitoring"
              onPress={() => navigation.navigate("Monitoring")}
            />
          </View>

          <TouchableOpacity
            style={[styles.logoutBtn, loading && { opacity: 0.6 }]}
            onPress={logout}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>
              {loading ? "Logging out..." : "Logout"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a2236",
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 10,
  },
  sidebar: {
    width: 72,
    backgroundColor: "#1a2236",
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: "center",
    borderRightWidth: 0.5,
    borderRightColor: "rgba(255,255,255,0.06)",
  },
  logoWrap: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.08)",
    width: "100%",
    alignItems: "center",
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4f7cde",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  navItem: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
    gap: 4,
  },
  navItemActive: {
    backgroundColor: "rgba(79,124,222,0.18)",
    borderLeftColor: "#4f7cde",
  },
  navLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  navLabelActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  main: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  mainContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  greeting: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
  },
  pillAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4f7cde",
    alignItems: "center",
    justifyContent: "center",
  },
  pillAvatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  pillLabel: { fontSize: 12, color: "#64748b" },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  statNumber: { fontSize: 24, fontWeight: "700", color: "#ffffff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  statSub: { fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 3 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: -4,
  },
  upcomingCard: {
    backgroundColor: "#1a2236",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 80,
  },
  upcomingLeft: { flex: 1 },
  upcomingCourse: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  upcomingCode: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  upcomingVenue: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
  },
  upcomingEmpty: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    flex: 1,
  },
  upcomingLoading: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginLeft: 10,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  logoutBtn: {
    backgroundColor: "rgba(241, 17, 17, 0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(220,38,38,0.3)",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  logoutText: {
    color: "#f10606",
    fontWeight: "700",
    fontSize: 14,
  },
});
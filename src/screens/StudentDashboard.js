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
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const C = {
  navy:   "#0f1f3d",
  navy2:  "#1a2f52",
  navy3:  "#253d66",
  gold:   "#c9a84c",
  white:  "#ffffff",
  bg:     "#f5f7fb",
  card:   "#ffffff",
  border: "#e4e8f0",
  text:   "#102040",
  muted:  "#6c7a96",
  badge:  "#edf0f7",
  empty:  "#f0f4ff",
};

function NavCard({ title, subtitle, route, navigation }) {
  return (
    <TouchableOpacity
      style={s.navCard}
      onPress={() => navigation.navigate(route)}
      activeOpacity={0.75}
    >
      <View style={s.navCardBody}>
        <Text style={s.navCardTitle}>{title}</Text>
        <Text style={s.navCardSub}>{subtitle}</Text>
      </View>
      <Text style={s.navArrow}>›</Text>
    </TouchableOpacity>
  );
}

function EmptyClassCard() {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyIcon}>📋</Text>
      <Text style={s.emptyTitle}>Not Assigned Yet</Text>
      <Text style={s.emptySubtitle}>
        Your program leader hasn't assigned you to a class yet. Check back soon.
      </Text>
    </View>
  );
}

export default function StudentDashboard({ navigation }) {
  const [loading, setLoading]                     = useState(false);
  const [statsLoading, setStatsLoading]           = useState(true);
  const [classLoading, setClassLoading]           = useState(true);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [ratingsCount, setRatingsCount]           = useState(0);
  const [upcomingClass, setUpcomingClass]         = useState(null);
  const [studentName, setStudentName]             = useState("");
  const [studentClass, setStudentClass]           = useState("");
  const [isAssigned, setIsAssigned]               = useState(false);

  const getStudentData = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setStudentName(user.username || user.email || "Student");
    }
  };

  // ✅ Fixed: was /dashboard/student → now /student/stats
  const fetchStats = async () => {
    try {
      const response = await api.get("/student/stats");
      if (response.data.success) {
        const { stats, user } = response.data;
        setAttendancePercent(stats.attendancePercent ?? 0);
        setRatingsCount(stats.ratingsCount ?? 0);
        setIsAssigned(!!user?.classId);
        setStudentClass(user?.className || "");
      }
    } catch (error) {
      console.log("Failed to load student stats:", error);
    }
  };

  // ✅ Fixed: was /dashboard/student/upcoming-class → now /student/upcoming-class
  const fetchUpcomingClass = async () => {
    try {
      const response = await api.get("/student/upcoming-class");
      if (response.data.success) {
        setUpcomingClass(response.data.upcomingClass || null);
      } else {
        setUpcomingClass(null);
      }
    } catch (error) {
      console.log("Upcoming class error:", error);
      setUpcomingClass(null);
    } finally {
      setClassLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await getStudentData();
      await fetchStats();
      await fetchUpcomingClass();
      setStatsLoading(false);
    };
    loadData();
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

  if (statsLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.eyebrow}>Student</Text>
          <Text style={s.headerTitle}>{studentName || "Dashboard"}</Text>
          <Text style={s.headerSub}>
            {studentClass ? `Class: ${studentClass}` : "Academic Portal"}
          </Text>

          <View style={s.statStrip}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{isAssigned ? `${attendancePercent}%` : "—"}</Text>
              <Text style={s.statMeta}>Attendance</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{isAssigned ? ratingsCount : "—"}</Text>
              <Text style={s.statMeta}>Ratings</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>
                {!isAssigned ? "—" : classLoading ? "..." : upcomingClass ? "1" : "0"}
              </Text>
              <Text style={s.statMeta}>Upcoming</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>

          <Text style={s.sectionLabel}>Next Class</Text>

          {classLoading ? (
            <View style={s.classCard}>
              <ActivityIndicator size="small" color={C.navy} />
            </View>
          ) : upcomingClass ? (
            <View style={s.classCard}>
              <Text style={s.className}>
                {upcomingClass.className || upcomingClass.courseName}
              </Text>
              <Text style={s.classMeta}>
                {upcomingClass.day} • {upcomingClass.time}
              </Text>
              <Text style={s.classVenue}>{upcomingClass.venue}</Text>
            </View>
          ) : (
            <EmptyClassCard />
          )}

          <Text style={s.sectionLabel}>Academic</Text>

          <NavCard
            title="View Attendance"
            subtitle="Check your attendance record"
            route="Attendance"
            navigation={navigation}
          />
          <NavCard
            title="Rate Lecturer"
            subtitle="Submit your lecturer ratings"
            route="Ratings"
            navigation={navigation}
          />
          <NavCard
            title="My Monitoring"
            subtitle="Track your academic progress"
            route="Monitoring"
            navigation={navigation}
          />

          <TouchableOpacity
            style={[s.logoutBtn, loading && { opacity: 0.6 }]}
            onPress={logout}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={s.logoutText}>
              {loading ? "Signing out..." : "Sign Out"}
            </Text>
            <Text style={s.logoutArrow}>›</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingText: { color: C.muted, fontSize: 14, marginTop: 10 },

  header: {
    backgroundColor: C.navy,
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  eyebrow: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1.2,
    color: C.gold, textTransform: "uppercase", marginBottom: 6,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28 },

  statStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingVertical: 16,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 22, fontWeight: "700", color: C.white, marginBottom: 2 },
  statMeta:    { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase", marginBottom: 10, marginTop: 4,
  },

  classCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  className:  { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 4 },
  classMeta:  { fontSize: 12, color: C.muted, marginBottom: 2 },
  classVenue: { fontSize: 12, color: C.muted },

  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 24, marginBottom: 16, alignItems: "center",
  },
  emptyIcon:     { fontSize: 32, marginBottom: 10 },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  navCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: "row", alignItems: "center",
  },
  navCardBody:  { flex: 1 },
  navCardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 3 },
  navCardSub:   { fontSize: 12, color: C.muted },
  navArrow:     { fontSize: 22, color: C.muted, marginLeft: 8 },

  logoutBtn: {
    backgroundColor: C.navy,
    borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 4, marginBottom: 16,
    flexDirection: "row", justifyContent: "space-between",
  },
  logoutText:  { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
  logoutArrow: { fontSize: 22, color: "#f3eeee" },
});
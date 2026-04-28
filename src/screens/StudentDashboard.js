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
  gold:   "#c9a84c",
  white:  "#ffffff",
  bg:     "#f5f7fb",
  card:   "#ffffff",
  border: "#e4e8f0",
  text:   "#102040",
  muted:  "#6c7a96",
  empty:  "#f0f4ff",
};

function NavCard({ title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={s.navCard} onPress={onPress} activeOpacity={0.75}>
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

  // ─── Load student info from local storage ───────────────────────────────────
  const getStudentData = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setStudentName(user.username || user.email || "Student");
      setStudentClass(user.className || "");
      setIsAssigned(!!user.classId);
    }
  };

  // ─── Attendance stats (only for this student) ────────────────────────────────
  const fetchAttendanceStats = async () => {
    try {
      const response = await api.get("/attendance/student");
      if (response.data.success && response.data.attendance) {
        const attendance = response.data.attendance;
        const present = attendance.filter((a) => a.status === "Present").length;
        const total   = attendance.length;
        const percent = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        setAttendancePercent(percent);
      }
    } catch (error) {
      console.log("Failed to load attendance stats");
    }
  };

  // ─── Ratings count (only for this student) ───────────────────────────────────
  const fetchRatingsCount = async () => {
    try {
      const response = await api.get("/ratings/mine");
      if (response.data.success) {
        setRatingsCount(response.data.ratings.length);
      }
    } catch (error) {
      console.log("Failed to load ratings count");
    }
  };

  // ─── Upcoming class — FIXED: no fallback to all classes ─────────────────────
  const fetchUpcomingClass = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      const user = userData ? JSON.parse(userData) : {};
      const studentClassId = user.classId;

      // If not assigned to any class, show nothing — do NOT fetch all classes
      if (!studentClassId) {
        setUpcomingClass(null);
        return;
      }

      const response = await api.get(`/classes/${studentClassId}`);
      if (response.data.success && response.data.class) {
        setUpcomingClass(response.data.class);
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
      await fetchAttendanceStats();
      await fetchRatingsCount();
      await fetchUpcomingClass();
      setStatsLoading(false);
    };
    loadData();
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
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

  // ─── Loading screen ──────────────────────────────────────────────────────────
  if (statsLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Student</Text>
          <Text style={s.headerTitle}>{studentName}</Text>
          <Text style={s.headerSub}>
            {studentClass ? `Class: ${studentClass}` : "Academic Portal"}
          </Text>

          {/* ── Stat strip ── */}
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
                {!isAssigned
                  ? "—"
                  : classLoading
                  ? "..."
                  : upcomingClass
                  ? "1"
                  : "0"}
              </Text>
              <Text style={s.statMeta}>Upcoming</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Upcoming class section ── */}
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
            // ✅ Shown when student has no classId assigned yet
            <EmptyClassCard />
          )}

          {/* ── Academic nav ── */}
          <Text style={s.sectionLabel}>Academic</Text>

          <NavCard
            title="View Attendance"
            subtitle="Check your attendance record"
            onPress={() => navigation.navigate("Attendance")}
          />
          <NavCard
            title="Rate Lecturer"
            subtitle="Submit your lecturer ratings"
            onPress={() => navigation.navigate("Ratings")}
          />
          <NavCard
            title="My Monitoring"
            subtitle="Track your academic progress"
            onPress={() => navigation.navigate("Monitoring")}
          />

          {/* ── Sign out ── */}
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
  loadingText: {
    color: C.muted,
    fontSize: 14,
    marginTop: 10,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.navy,
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: C.gold,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: C.white,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 28,
  },

  // ── Stat strip ──────────────────────────────────────────────────────────────
  statStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "700",
    color: C.white,
    marginBottom: 2,
  },
  statMeta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: {
    padding: 16,
    paddingBottom: 48,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Class card ───────────────────────────────────────────────────────────────
  classCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  className: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  classMeta: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 2,
  },
  classVenue: {
    fontSize: 12,
    color: C.muted,
  },

  // ── Empty state card ─────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.empty,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Nav cards ────────────────────────────────────────────────────────────────
  navCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  navCardBody: { flex: 1 },
  navCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 3,
  },
  navCardSub: {
    fontSize: 12,
    color: C.muted,
  },
  navArrow: {
    fontSize: 22,
    color: C.muted,
    marginLeft: 8,
  },

  // ── Logout button ────────────────────────────────────────────────────────────
  logoutBtn: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  logoutArrow: {
    fontSize: 22,
    color: "#dc2626",
  },
});
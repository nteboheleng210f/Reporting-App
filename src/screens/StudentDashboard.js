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

const DAY_COLORS = {
  Monday:    "#e0f2fe",
  Tuesday:   "#fce7f3",
  Wednesday: "#dcfce7",
  Thursday:  "#fef3c7",
  Friday:    "#ede9fe",
  Saturday:  "#fee2e2",
  Sunday:    "#f1f5f9",
};
const DAY_TEXT = {
  Monday:    "#0369a1",
  Tuesday:   "#9d174d",
  Wednesday: "#15803d",
  Thursday:  "#92400e",
  Friday:    "#6d28d9",
  Saturday:  "#b91c1c",
  Sunday:    "#475569",
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

// ✅ Single timetable row
function TimetableRow({ item }) {
  const dayBg   = DAY_COLORS[item.day] || C.badge;
  const dayText = DAY_TEXT[item.day]   || C.muted;
  return (
    <View style={s.timetableRow}>
      <View style={[s.dayBadge, { backgroundColor: dayBg }]}>
        <Text style={[s.dayText, { color: dayText }]}>
          {(item.day || "").slice(0, 3).toUpperCase()}
        </Text>
      </View>
      <View style={s.timetableBody}>
        <Text style={s.timetableCourse}>{item.courseName}</Text>
        <Text style={s.timetableMeta}>
          {[item.time, item.venue].filter(Boolean).join("  •  ")}
        </Text>
        {!!item.lecturerName && (
          <Text style={s.timetableLecturer}>👤 {item.lecturerName}</Text>
        )}
      </View>
      <View style={s.codeBadge}>
        <Text style={s.codeBadgeText}>{item.courseCode}</Text>
      </View>
    </View>
  );
}

function EmptyClassCard() {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyIcon}>📋</Text>
      <Text style={s.emptyTitle}>Not Assigned Yet</Text>
      <Text style={s.emptySubtitle}>
        Your program leader hasn't assigned you to a class yet.
      </Text>
    </View>
  );
}

function EmptyTimetable() {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyIcon}>🗓</Text>
      <Text style={s.emptyTitle}>No Timetable Yet</Text>
      <Text style={s.emptySubtitle}>
        Your courses will appear here once your programme leader adds them.
      </Text>
    </View>
  );
}

export default function StudentDashboard({ navigation }) {
  const [loading, setLoading]                 = useState(false);
  const [statsLoading, setStatsLoading]       = useState(true);
  const [timetableLoading, setTimetableLoading] = useState(true);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [ratingsCount, setRatingsCount]       = useState(0);
  const [timetable, setTimetable]             = useState([]);
  const [studentName, setStudentName]         = useState("");
  const [studentClass, setStudentClass]       = useState("");
  const [isAssigned, setIsAssigned]           = useState(false);

  const getStudentData = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setStudentName(user.username || user.email || "Student");
    }
  };

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

  // ✅ Fetch full timetable instead of just upcoming-class
  const fetchTimetable = async () => {
    try {
      const response = await api.get("/student/timetable");
      if (response.data.success) {
        setTimetable(response.data.timetable || []);
      }
    } catch (error) {
      console.log("Timetable error:", error);
      setTimetable([]);
    } finally {
      setTimetableLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await getStudentData();
      await fetchStats();
      await fetchTimetable();
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

        {/* ── Header ── */}
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
              <Text style={s.statNum}>{isAssigned ? timetable.length : "—"}</Text>
              <Text style={s.statMeta}>Courses</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>

     
          <Text style={s.sectionLabel}>My Timetable</Text>

          {!isAssigned ? (
            <EmptyClassCard />
          ) : timetableLoading ? (
            <View style={s.loadingCard}>
              <ActivityIndicator size="small" color={C.navy} />
            </View>
          ) : timetable.length === 0 ? (
            <EmptyTimetable />
          ) : (
            timetable.map(item => (
              <TimetableRow key={item.id} item={item} />
            ))
          )}

          {/* ── Academic nav ── */}
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
          <NavCard
            title="My Profile"
            subtitle="View your info and courses"
            route="Profile"
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  loadingText: { color: C.muted, fontSize: 14, marginTop: 10 },

  header: {
    backgroundColor: C.navy,
    paddingTop: 52, paddingHorizontal: 24, paddingBottom: 0,
  },
  eyebrow: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1.2,
    color: C.gold, textTransform: "uppercase", marginBottom: 6,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28 },

  statStrip:   { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingVertical: 16 },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 22, fontWeight: "700", color: C.white, marginBottom: 2 },
  statMeta:    { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase", marginBottom: 10, marginTop: 4,
  },

  loadingCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 20, marginBottom: 16, alignItems: "center",
  },

  // ✅ Timetable row
  timetableRow: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  dayBadge: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  dayText:          { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  timetableBody:    { flex: 1 },
  timetableCourse:  { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 3 },
  timetableMeta:    { fontSize: 12, color: C.muted, marginBottom: 2 },
  timetableLecturer:{ fontSize: 11, color: C.muted },
  codeBadge: {
    backgroundColor: C.badge, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0,
  },
  codeBadgeText: { fontSize: 10, fontWeight: "700", color: C.navy },

  // ── Empty states ──────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 24, marginBottom: 16, alignItems: "center",
  },
  emptyIcon:     { fontSize: 32, marginBottom: 10 },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  // ── Nav cards ─────────────────────────────────────────────────────────────────
  navCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: "row", alignItems: "center",
  },
  navCardBody:  { flex: 1 },
  navCardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 3 },
  navCardSub:   { fontSize: 12, color: C.muted },
  navArrow:     { fontSize: 22, color: C.muted, marginLeft: 8 },

  // ── Logout ────────────────────────────────────────────────────────────────────
  logoutBtn: {
    backgroundColor: C.navy, borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 4, marginBottom: 16,
    flexDirection: "row", justifyContent: "space-between",
  },
  logoutText:  { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
  logoutArrow: { fontSize: 22, color: "#f3eeee" },
});
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

import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";


const NavItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.navItem, active && styles.navItemActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.navIcon}>{icon}</Text>
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
const StatCard = ({ icon, value, label, sub, color }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

const ActionCard = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.actionCard}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={styles.actionIcon}>{icon}</Text>
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
        <Text style={styles.upcomingEmpty}>📭 No upcoming classes today</Text>
      </View>
    );
  }

  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingLeft}>
        <Text style={styles.upcomingBadge}>NEXT CLASS</Text>
        <Text style={styles.upcomingCourse}>{classData.courseName}</Text>
        <Text style={styles.upcomingCode}>{classData.courseCode}</Text>
      </View>
      <View style={styles.upcomingRight}>
        <Text style={styles.upcomingTime}>{classData.scheduledTime}</Text>
        <Text style={styles.upcomingVenue}>📍 {classData.venue}</Text>
      </View>
    </View>
  );
};
export default function StudentDashboard({ navigation }) {

  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("Dashboard");

  const [attendancePercent, setAttendancePercent] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [upcomingClass, setUpcomingClass] = useState(null);

  const navItems = [
    { icon: "⊞", label: "Dashboard"  },
    { icon: "📅", label: "Attendance" },
    { icon: "⭐", label: "Ratings"    },
    { icon: "📊", label: "Monitoring" },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // ATTENDANCE
        const attSnap = await getDocs(collection(db, "attendance"));
        const myAttendance = attSnap.docs
          .map((doc) => doc.data())
          .filter((a) => a.studentId === user.uid);

        const present = myAttendance.filter(
          (a) => a.status === "Present"
        ).length;
        const total = myAttendance.length;
        setAttendancePercent(
          total ? ((present / total) * 100).toFixed(1) : 0
        );

        // RATINGS
        const ratingSnap = await getDocs(collection(db, "ratings"));
        const myRatings = ratingSnap.docs
          .map((doc) => doc.data())
          .filter((r) => r.studentId === user.uid);
        setRatingsCount(myRatings.length);

      } catch (error) {
        Alert.alert("Error", error.message);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);
useEffect(() => {
  const fetchUpcomingClass = async () => {
    try {

      const studentClass = user?.className || user?.classId;

      const snap = await getDocs(collection(db, "classSchedules"));

      const allSchedules = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ ONLY STUDENT'S CLASS (ALL DAYS)
      const mySchedule = allSchedules.filter(item =>
        item.className === studentClass
      );

      // Optional: sort by day + time
      const dayOrder = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 7
      };

      const sorted = mySchedule.sort((a, b) => {
        if (dayOrder[a.day] !== dayOrder[b.day]) {
          return dayOrder[a.day] - dayOrder[b.day];
        }
        return (a.time || "").localeCompare(b.time || "");
      });

      // ✅ FIND NEXT CLASS (CURRENT DAY + TIME LOGIC)
      const now = new Date();
      const currentDay = Object.keys(dayOrder)[now.getDay() - 1] || "Monday";
      const currentTime = now.toTimeString().slice(0,5);

      let next = sorted.find(c =>
        dayOrder[c.day] > dayOrder[currentDay] ||
        (c.day === currentDay && c.time > currentTime)
      );

      // fallback (start of week)
      if (!next) next = sorted[0];

      setUpcomingClass(next || null);

    } catch (error) {
      console.log("Timetable error:", error);
      setUpcomingClass(null);
    } finally {
      setClassLoading(false);
    }
  };

  fetchUpcomingClass();
}, []);

  const handleNav = (label) => {
    setActiveNav(label);
    if (label === "Attendance") navigation.navigate("Attendance");
    if (label === "Ratings")    navigation.navigate("Ratings");
    if (label === "Monitoring") navigation.navigate("Monitoring");
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
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
              icon={item.icon}
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

          {/* TOP BAR */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.greeting}>Welcome back </Text>
              <Text style={styles.pageTitle}>Your Dashboard</Text>
            </View>
            <View style={styles.userPill}>
              <View style={styles.pillAvatar}>
                <Text style={styles.pillAvatarText}>
                  {user?.email?.[0]?.toUpperCase() || "S"}
                </Text>
              </View>
              <Text style={styles.pillLabel}>Student</Text>
            </View>
          </View>

          {/* STAT CARDS */}
          <View style={styles.statRow}>
            <StatCard
              icon="📅"
              value={`${attendancePercent}%`}
              label="Attendance"
              sub="Present this term"
              color="#4f7cde"
            />
            <StatCard
              icon="⭐"
              value={ratingsCount}
              label="Ratings Given"
              sub="Lecturer reviews"
              color="#2daa70"
            />
          </View>

          {/* UPCOMING CLASS */}
          <Text style={styles.sectionTitle}>Upcoming Class</Text>
          <UpcomingClassCard
            classData={upcomingClass}
            loading={classLoading}
          />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              icon="📅"
              label="Attendance"
              onPress={() => navigation.navigate("Attendance")}
            />
            <ActionCard
              icon="⭐"
              label="Ratings"
              onPress={() => navigation.navigate("Ratings")}
            />
            <ActionCard
              icon="📊"
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

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: "#1a2236",
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },

  // LOADING
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

  // SIDEBAR
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
  navIcon: { fontSize: 18 },
  navLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  navLabelActive: {
    color: "#ffffff",
    fontWeight: "600",
  },

  // MAIN
  main: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  mainContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },

  // TOP BAR
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

  // STAT CARDS
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  statIcon: { fontSize: 18, marginBottom: 6, opacity: 0.85 },
  statNumber: { fontSize: 24, fontWeight: "700", color: "#ffffff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  statSub: { fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 3 },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: -4,
  },

  // UPCOMING CLASS
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
  upcomingBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4f7cde",
    letterSpacing: 1,
    marginBottom: 6,
  },
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
  upcomingRight: { alignItems: "flex-end", gap: 6 },
  upcomingTime: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4f7cde",
  },
  upcomingVenue: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
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

  // ACTION GRID — 3 cards, each ~30%
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
  actionIcon: { fontSize: 22 },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },

  // NOTICE BOARD
  noticeBoard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  noticeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  noticeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(79,124,222,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4f7cde",
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 3,
  },
  noticeSub: { fontSize: 11, color: "#64748b" },
  noticeDivider: {
    height: 0.5,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 14,
  },

  // LOGOUT
  logoutBtn: {
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(220,38,38,0.3)",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  logoutText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 14,
  },
});
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";

import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";

export default function PLDashboard({ navigation }) {

  const [stats, setStats] = useState({
    courses: 0,
    classes: 0,
    reports: 0,
    lecturers: 0,
  });

  // =========================
  // FETCH STATS
  // =========================
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const coursesSnap = await getDocs(collection(db, "courses"));
        const classesSnap = await getDocs(collection(db, "classes"));
        const reportsSnap = await getDocs(collection(db, "reports"));
        const usersSnap   = await getDocs(collection(db, "users"));

        const lecturersCount = usersSnap.docs
          .map((doc) => doc.data())
          .filter((u) => u.role === "lecturer").length;

        setStats({
          courses:   coursesSnap.size,
          classes:   classesSnap.size,
          reports:   reportsSnap.size,
          lecturers: lecturersCount,
        });
      } catch (error) {
        console.log(error.message);
      }
    };

    fetchStats();
  }, []);

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    await signOut(auth);
    navigation.replace("Login");
  };

  // =========================
  // STAT CARD
  // =========================
  const StatCard = ({ value, label, bg, iconColor }) => (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statDot, { backgroundColor: iconColor + "33" }]}>
        <View style={[styles.statDotInner, { backgroundColor: iconColor }]} />
      </View>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // =========================
  // NAV CARD
  // =========================
  const NavCard = ({ title, subtitle, route, accent }) => (
    <TouchableOpacity
      style={[styles.navCard, { borderLeftColor: accent }]}
      onPress={() => navigation.navigate(route)}
      activeOpacity={0.7}
    >
      <View style={styles.navCardBody}>
        <Text style={styles.navCardTitle}>{title}</Text>
        <Text style={styles.navCardSub}>{subtitle}</Text>
      </View>
      <Text style={styles.navArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>PL</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.heroTitle}>Program Leader</Text>
            <Text style={styles.heroSub}>Academic Control Center</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Control</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* STATS */}
        <View style={styles.statsRow}>
          <StatCard value={stats.courses}   label="Courses"   bg="#0c2d4e" iconColor="#378ADD" />
          <StatCard value={stats.classes}   label="Classes"   bg="#1a1040" iconColor="#7F77DD" />
          <StatCard value={stats.lecturers} label="Lecturers" bg="#0f2d18" iconColor="#639922" />
          <StatCard value={stats.reports}   label="Reports"   bg="#0b2a22" iconColor="#1D9E75" />
        </View>
      </View>

      {/* ── MODULES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MANAGEMENT MODULES</Text>

        <NavCard title="Courses"    subtitle="Assign lecturers & classes" route="Courses"    accent="#2563eb" />
        <NavCard title="Classes"    subtitle="Manage structure"            route="Classes"    accent="#ea580c" />
        <NavCard title="Reports"    subtitle="Academic feedback"           route="PRLReports" accent="#16a34a" />
        <NavCard title="Monitoring" subtitle="System tracking"             route="Monitoring" accent="#475569" />
        <NavCard title="Ratings"    subtitle="Student feedback"            route="Ratings"    accent="#7c3aed" />
      </View>

      {/* ── LOGOUT ── */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Logout — Exit system</Text>
          <Text style={styles.logoutArrow}>›</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#070b18",
  },

  // ── Header
  header: {
    backgroundColor: "#111827",
    padding: 20,
    paddingTop: 54,
    paddingBottom: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  headerText: {
    flex: 1,
  },
  heroTitle: {
    color: "#f1f5f9",
    fontSize: 17,
    fontWeight: "700",
  },
  heroSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: "#1c1917",
    borderWidth: 1,
    borderColor: "#78350f",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: "#fb923c",
    fontSize: 11,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginBottom: 16,
  },

  // ── Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 10,
    color: "#475569",
    marginTop: 3,
    textAlign: "center",
  },

  // ── Section
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

  // ── Nav card
  navCard: {
    backgroundColor: "#111827",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  navCardBody: {
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
    color: "#334155",
    fontSize: 22,
    marginLeft: 8,
    fontWeight: "300",
  },

  // ── Logout
  logoutBtn: {
    backgroundColor: "#1c0a0a",
    borderWidth: 0.5,
    borderColor: "#7f1d1d",
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
    marginTop: 4,
  },
  logoutText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutArrow: {
    color: "#7f1d1d",
    fontSize: 22,
    fontWeight: "300",
  },
});
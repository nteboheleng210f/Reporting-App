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
  const [stats, setStats] = useState({ courses: 0, classes: 0, reports: 0 });
  const [lecturerName, setLecturerName] = useState("");
  const [isAssigned, setIsAssigned] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Load lecturer name from local storage ───────────────────────────────────
  const getLecturerInfo = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setLecturerName(user.username || user.email || "Lecturer");
    }
  };

  // ─── Fetch stats — filtered to THIS lecturer only ────────────────────────────
  const loadData = async () => {
    try {
      const response = await api.get("/dashboard/lecturer");
      if (response.data.success) {
        setStats(response.data.stats);
        // Backend now returns isAssigned flag
        setIsAssigned(response.data.user?.isAssigned ?? response.data.stats.courses > 0);
      }
    } catch (error) {
      // Fallback: pull directly from courses/reports endpoints, still filtered by lecturerId
      console.log("Falling back to local stats");
      await loadLocalStats();
    } finally {
      setLoading(false);
    }
  };

  // ─── Fallback stats loader — uses same filtered endpoints ────────────────────
  const loadLocalStats = async () => {
    try {
      // /courses returns only this lecturer's courses (filtered server-side by lecturerId)
      const coursesRes = await api.get("/courses/mine");
      const coursesCount = coursesRes.data.success ? coursesRes.data.courses.length : 0;

      // /reports returns only this lecturer's reports (filtered server-side by lecturerId)
      const reportsRes = await api.get("/reports/mine");
      const reportsCount = reportsRes.data.success ? reportsRes.data.reports.length : 0;

      setStats({ courses: coursesCount, classes: coursesCount, reports: reportsCount });
      setIsAssigned(coursesCount > 0);
    } catch (error) {
      console.log("Failed to load local stats");
    }
  };

  useEffect(() => {
    getLecturerInfo();
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    await AsyncStorage.multiRemove(["auth_token", "user_role", "user_data"]);
    navigation.replace("Login");
  };

  // ─── Sub-components ──────────────────────────────────────────────────────────
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
      <Text style={styles.statNum}>{isAssigned ? value : "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {lecturerName ? lecturerName[0].toUpperCase() : "L"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.portalTitle}>{lecturerName || "Lecturer"}</Text>
            <Text style={styles.portalSub}>Lecturer Portal</Text>
          </View>

          {/* ✅ Badge reflects actual assignment status */}
          <View style={[styles.statusBadge, isAssigned ? styles.badgeActive : styles.badgePending]}>
            <Text style={[styles.statusBadgeText, isAssigned ? styles.badgeActiveText : styles.badgePendingText]}>
              {isAssigned ? "Active" : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatBox value={stats.courses} label="My Courses" bg="#E6F1FB" />
          <StatBox value={stats.classes} label="Classes"    bg="#EEEDFE" />
          <StatBox value={stats.reports} label="Reports"    bg="#E1F5EE" />
        </View>

        {/* ✅ Pending notice shown when not yet assigned */}
        {!isAssigned && (
          <View style={styles.pendingNotice}>
            <Text style={styles.pendingIcon}>⏳</Text>
            <Text style={styles.pendingText}>
              You haven't been assigned to any courses yet. Your program leader will assign you soon.
            </Text>
          </View>
        )}
      </View>

      {/* ── Navigation ── */}
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

      {/* ── Sign out ── */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
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

  // ── Header ──────────────────────────────────────────────────────────────────
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

  // ── Status badges ────────────────────────────────────────────────────────────
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeActive: {
    backgroundColor: "#14532d",
    borderColor: "#166534",
  },
  badgeActiveText: {
    color: "#86efac",
  },
  badgePending: {
    backgroundColor: "#1c1a07",
    borderColor: "#713f12",
  },
  badgePendingText: {
    color: "#fde68a",
  },

  // ── Pending notice ───────────────────────────────────────────────────────────
  pendingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1c1917",
    borderWidth: 1,
    borderColor: "#292524",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  pendingIcon: {
    fontSize: 16,
  },
  pendingText: {
    flex: 1,
    color: "#a8a29e",
    fontSize: 12,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginBottom: 16,
  },

  // ── Stats ────────────────────────────────────────────────────────────────────
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

  // ── Section / nav cards ──────────────────────────────────────────────────────
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
  navCardInner: { flex: 1 },
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

  // ── Logout ───────────────────────────────────────────────────────────────────
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
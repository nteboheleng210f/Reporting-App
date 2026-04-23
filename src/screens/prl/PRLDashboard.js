import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";

export default function PRLDashboard({ navigation }) {

  const logout = async () => {
    await signOut(auth);
    navigation.replace("Login");
  };

  // =========================
  // NAV CARD
  // =========================
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
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
      </View>

      {/* ── MODULES ── */}
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

      {/* ── LOGOUT ── */}
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

  // ── Logout
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
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ was missing
import api from "../../services/api";

const C = {
  navy:   "#0f1f3d",
  gold:   "#c9a84c",
  white:  "#ffffff",
  bg:     "#f5f7fb",
  card:   "#ffffff",
  border: "#e4e8f0",
  text:   "#102040",
  muted:  "#6c7a96",
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

export default function PRLDashboard({ navigation }) {
  const [statsLoading, setStatsLoading] = useState(true);
  const [userName, setUserName]         = useState("");
  const [stats, setStats]               = useState({
    courses: 0,
    lecturers: 0,
    pendingReports: 0,
    reviewedReports: 0,
  });

  const getUserName = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setUserName(user.username || user.email || "PRL");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/prl/stats");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.log("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    getUserName();
    fetchStats();
  }, []);

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(["auth_token", "user_role", "user_data"]);
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", error.message);
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
          <Text style={s.eyebrow}>Principal Lecturer</Text>
          <Text style={s.headerTitle}>{userName || "PRL"}</Text>
          <Text style={s.headerSub}>Supervisor Dashboard</Text>

          <View style={s.statStrip}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{stats.courses}</Text>
              <Text style={s.statMeta}>Courses</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{stats.lecturers}</Text>
              <Text style={s.statMeta}>Lecturers</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: "#fbbf24" }]}>{stats.pendingReports}</Text>
              <Text style={s.statMeta}>Pending</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: "#4ade80" }]}>{stats.reviewedReports}</Text>
              <Text style={s.statMeta}>Reviewed</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.sectionLabel}>Management</Text>

          <NavCard
            title="Reports"
            subtitle="View lecturer reports and add feedback"
            route="PRLReports"
            navigation={navigation}
          />
          <NavCard
            title="Courses"
            subtitle="View courses and assigned lecturers"
            route="Courses"
            navigation={navigation}
          />
          <NavCard
            title="Ratings"
            subtitle="View student ratings"
            route="Ratings"
            navigation={navigation}
          />
          <NavCard
            title="Monitoring"
            subtitle="Track lecturer performance"
            route="Monitoring"
            navigation={navigation}
          />

          <TouchableOpacity
            style={s.logoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={s.logoutText}>Sign Out</Text>
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
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  logoutText:  { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
  logoutArrow: { fontSize: 22, color: "#f5f2f2" },
});
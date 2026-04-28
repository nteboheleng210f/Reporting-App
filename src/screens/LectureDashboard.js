import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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

export default function LecturerDashboard({ navigation }) {
  const [stats, setStats]           = useState({ courses: 0, classes: 0, reports: 0 });
  const [lecturerName, setLecturerName] = useState("");
  const [isAssigned, setIsAssigned] = useState(false);
  const [loading, setLoading]       = useState(true);

 
  const getLecturerInfo = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setLecturerName(user.username || user.email || "Lecturer");
    }
  };

  
  const loadData = async () => {
    try {
      const response = await api.get("/dashboard/lecturer");
      if (response.data.success) {
        setStats(response.data.stats);
        setIsAssigned(response.data.user?.isAssigned ?? response.data.stats.courses > 0);
      }
    } catch (error) {
      console.log("Falling back to local stats");
      await loadLocalStats();
    } finally {
      setLoading(false);
    }
  };

  
  const loadLocalStats = async () => {
    try {
      const coursesRes = await api.get("/courses/mine");
      const coursesCount = coursesRes.data.success ? coursesRes.data.courses.length : 0;
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

  const logout = async () => {
    await AsyncStorage.multiRemove(["auth_token", "user_role", "user_data"]);
    navigation.replace("Login");
  };

  if (loading) {
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
          <Text style={s.eyebrow}>Lecturer</Text>
          <Text style={s.headerTitle}>{lecturerName || "Dashboard"}</Text>
          <Text style={s.headerSub}>
            {isAssigned ? "Teaching Dashboard" : "Academic Portal"}
          </Text>

          <View style={s.statStrip}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{isAssigned ? stats.courses : "—"}</Text>
              <Text style={s.statMeta}>Courses</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{isAssigned ? stats.classes : "—"}</Text>
              <Text style={s.statMeta}>Classes</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{isAssigned ? stats.reports : "—"}</Text>
              <Text style={s.statMeta}>Reports</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>

          
          {!isAssigned && (
            <View style={s.pendingCard}>
             
              <View style={{ flex: 1 }}>
                <Text style={s.pendingTitle}>Not Assigned Yet</Text>
                
              </View>
            </View>
          )}

         
          <Text style={s.sectionLabel}>Teaching</Text>

          <NavCard
            title="Reports"
            subtitle="Submit lecture reports"
            route="LectureReportForm"
            navigation={navigation}
          />
          <NavCard
            title="My Classes"
            subtitle="View assigned classes only"
            route="Classes"
            navigation={navigation}
          />
          <NavCard
            title="Attendance"
            subtitle="Mark student attendance"
            route="Attendance"
            navigation={navigation}
          />
          <NavCard
            title="Ratings"
            subtitle="Student feedback"
            route="Ratings"
            navigation={navigation}
          />
          <NavCard
            title="Monitoring"
            subtitle="Performance overview"
            route="Monitoring"
            navigation={navigation}
          />

         
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={s.logoutText}>  Sign Out</Text>
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

  
  statStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: "center" },
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
  body: { padding: 16, paddingBottom: 48 },

  
  pendingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.empty,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  pendingIcon: { fontSize: 24 },
  pendingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
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
  navCardSub: { fontSize: 12, color: C.muted },
  navArrow: { fontSize: 22, color: C.muted, marginLeft: 8 },

  
  logoutBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logoutText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.4,
  },
  logoutArrow: {
    fontSize: 22,
    color: "#f3eeee",
  },
});
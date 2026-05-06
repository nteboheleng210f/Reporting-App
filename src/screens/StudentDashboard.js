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
  Modal,
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = ["08:30", "10:30", "12:30", "14:30"];

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


function TimetableModal({ visible, onClose, timetable, loading }) {
  // Get ALL courses 
  const getCoursesAtTimeSlot = (day, timeSlot) => {
   
    const coursesForDay = timetable.filter(c => 
      c.day && c.day.toLowerCase() === day.toLowerCase()
    );
    
    if (coursesForDay.length === 0) return [];
    

    const matchedCourses = coursesForDay.filter(course => {
      let courseStartTime = course.time;
      if (courseStartTime && courseStartTime.includes("-")) {
        courseStartTime = courseStartTime.split("-")[0].trim();
      }
      return courseStartTime === timeSlot;
    });
    
    return matchedCourses;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={s.modalContainer}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>My Timetable</Text>
          <TouchableOpacity onPress={onClose} style={s.closeModalBtn}>
            <Text style={s.closeModalBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          {loading ? (
            <View style={s.modalLoading}>
              <ActivityIndicator size="large" color={C.navy} />
              <Text style={s.modalLoadingText}>Loading timetable...</Text>
            </View>
          ) : timetable.length === 0 ? (
            <View style={s.modalEmpty}>
              <Text style={s.modalEmptyIcon}>🗓</Text>
              <Text style={s.modalEmptyTitle}>No Timetable Yet</Text>
              <Text style={s.modalEmptySubtitle}>
                Your courses will appear here once your programme leader adds them.
              </Text>
            </View>
          ) : (
            <View style={s.tableContainer}>
              {/* Header Row */}
              <View style={s.tableHeaderRow}>
                <View style={[s.tableHeaderCell, s.timeColumnHeader]}>
                  <Text style={s.tableHeaderText}>Time</Text>
                </View>
                {DAYS.map(day => (
                  <View key={day} style={s.tableHeaderCell}>
                    <Text style={s.tableHeaderText}>{day.slice(0, 3)}</Text>
                  </View>
                ))}
              </View>

              {/* Time Slot Rows */}
              {TIME_SLOTS.map(timeSlot => {
                const endTime = timeSlot === "08:30" ? "10:30" :
                               timeSlot === "10:30" ? "12:30" :
                               timeSlot === "12:30" ? "14:30" : "16:30";
                
                return (
                  <View key={timeSlot} style={s.tableRow}>
                    <View style={[s.tableCell, s.timeColumnCell]}>
                      <Text style={s.timeText}>{timeSlot} - {endTime}</Text>
                    </View>
                    {DAYS.map(day => {
                      const courses = getCoursesAtTimeSlot(day, timeSlot);
                      const hasCourses = courses.length > 0;
                      return (
                        <View key={day} style={[s.tableCell, hasCourses && s.hasCourse]}>
                          {hasCourses ? (
                            <View style={s.courseCell}>
                              {courses.map((course, idx) => (
                                <View key={idx} style={s.courseItem}>
                                  <Text style={s.courseCodeText}>{course.courseCode}</Text>
                                  <Text style={s.courseNameText}>{course.courseName}</Text>
                                  <Text style={s.venueText}> {course.venue}</Text>
                                  <Text style={s.lecturerText}> {course.lecturerName}</Text>
                                  {idx < courses.length - 1 && <View style={s.courseDivider} />}
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={s.emptyCellText}>-</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EmptyClassCard() {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyIcon}></Text>
      <Text style={s.emptyTitle}>Not Assigned Yet</Text>
      <Text style={s.emptySubtitle}>
        Your program leader hasn't assigned you to a class yet.
      </Text>
    </View>
  );
}

export default function StudentDashboard({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [timetableLoading, setTimetableLoading] = useState(true);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [timetable, setTimetable] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [isAssigned, setIsAssigned] = useState(false);
  const [timetableModalVisible, setTimetableModalVisible] = useState(false);

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

  const fetchTimetable = async () => {
    setTimetableLoading(true);
    try {
      const response = await api.get("/student/timetable");
      console.log("Timetable response:", response.data);
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

      {/* Timetable  */}
      <TimetableModal
        visible={timetableModalVisible}
        onClose={() => setTimetableModalVisible(false)}
        timetable={timetable}
        loading={timetableLoading}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
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
              <Text style={s.statNum}>{isAssigned ? ratingsCount : ""}</Text>
              <Text style={s.statMeta}>Ratings</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{isAssigned ? timetable.length : ""}</Text>
              <Text style={s.statMeta}>Courses</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>
      
          <Text style={s.sectionLabel}>Academic</Text>

          {/* Timetable*/}
          <TouchableOpacity
            style={s.timetableNavCard}
            onPress={() => setTimetableModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={s.timetableNavLeft}>
              <View>
                <Text style={s.timetableNavTitle}>Timetable</Text>
              </View>
            </View>
            <Text style={s.timetableNavArrow}>›</Text>
          </TouchableOpacity>

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
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28 },

  statStrip: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingVertical: 16 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "700", color: C.white, marginBottom: 2 },
  statMeta: { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  timetableNavCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timetableNavLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  timetableNavIcon: { fontSize: 28 },
  timetableNavTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  timetableNavSub: { fontSize: 12, color: C.muted },
  timetableNavArrow: { fontSize: 22, color: C.muted },

  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: C.navy,
    paddingTop: 52,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: C.white },
  closeModalBtn: { backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  closeModalBtnText: { color: C.navy, fontWeight: "600" },
  modalLoading: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  modalLoadingText: { marginTop: 12, color: C.muted },
  modalEmpty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  modalEmptyIcon: { fontSize: 48, marginBottom: 16 },
  modalEmptyTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 8 },
  modalEmptySubtitle: { fontSize: 14, color: C.muted, textAlign: "center" },

  tableContainer: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: "hidden",
    margin: 16,
    minWidth: 600,
  },
  tableHeaderRow: { flexDirection: "row", backgroundColor: C.navy },
  tableHeaderCell: {
    width: 100,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: "rgba(255,255,255,0.1)",
  },
  timeColumnHeader: { width: 90 },
  tableHeaderText: { color: C.white, fontSize: 12, fontWeight: "700" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableCell: {
    width: 100,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    minHeight: 85,
  },
  timeColumnCell: { width: 90, backgroundColor: C.bg },
  timeText: { fontSize: 10, color: C.muted, fontWeight: "600", textAlign: "center" },
  hasCourse: { backgroundColor: "#e0f2fe" },
  courseCell: { alignItems: "center", justifyContent: "center", width: "100%" },
  courseItem: { width: "100%", paddingVertical: 4 },
  courseDivider: { height: 1, backgroundColor: C.border, marginVertical: 4, width: "100%" },
  courseCodeText: { fontSize: 10, fontWeight: "700", color: C.navy, textAlign: "center" },
  courseNameText: { fontSize: 9, color: C.text, textAlign: "center", marginTop: 3 },
  venueText: { fontSize: 8, color: C.muted, textAlign: "center", marginTop: 2 },
  lecturerText: { fontSize: 8, color: C.gold, textAlign: "center", marginTop: 2 },
  emptyCellText: { fontSize: 14, color: C.muted },

  emptyCard: {
    backgroundColor: C.empty,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

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
  navCardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 3 },
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
  logoutText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
  logoutArrow: { fontSize: 22, color: "#f3eeee", marginLeft: 8 },
});
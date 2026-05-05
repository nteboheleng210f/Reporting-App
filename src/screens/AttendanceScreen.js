import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const C = {
  navy:    "#0f1f3d",
  gold:    "#c9a84c",
  white:   "#ffffff",
  bg:      "#f5f7fb",
  card:    "#ffffff",
  border:  "#e4e8f0",
  text:    "#102040",
  muted:   "#6c7a96",
  badge:   "#edf0f7",
  empty:   "#f0f4ff",
  green:   "#16a34a", greenBg: "#dcfce7",
  red:     "#dc2626", redBg:   "#fee2e2",
  amber:   "#d97706", amberBg: "#fef3c7",
};

const fmtDate = (str) => {
  if (!str) return "";
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
};

function ProgressBar({ percent }) {
  const p   = parseFloat(percent) || 0;
  const col = p >= 75 ? C.green : p >= 50 ? C.amber : C.red;
  const bg  = p >= 75 ? C.greenBg : p >= 50 ? C.amberBg : C.redBg;
  return (
    <View style={s.progressWrap}>
      <View style={[s.progressTrack, { backgroundColor: bg }]}>
        <View style={[s.progressFill, { width: `${Math.min(p, 100)}%`, backgroundColor: col }]} />
      </View>
      <Text style={[s.progressPct, { color: col }]}>{p}%</Text>
    </View>
  );
}

function StatStrip({ present, absent, total }) {
  return (
    <View style={s.statStrip}>
      <View style={s.statItem}>
        <Text style={[s.statNum, { color: C.green }]}>{present}</Text>
        <Text style={s.statMeta}>Present</Text>
      </View>
      <View style={s.statDivider} />
      <View style={s.statItem}>
        <Text style={[s.statNum, { color: C.red }]}>{absent}</Text>
        <Text style={s.statMeta}>Absent</Text>
      </View>
      <View style={s.statDivider} />
      <View style={s.statItem}>
        <Text style={s.statNum}>{total}</Text>
        <Text style={s.statMeta}>Total</Text>
      </View>
    </View>
  );
}

export default function AttendanceScreen({ navigation }) {
  const [role, setRole]                     = useState(null);
  const [courses, setCourses]               = useState([]);
  const [students, setStudents]             = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendance, setAttendance]         = useState({});
  const [studentRecords, setStudentRecords] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);

  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole || "student");
  };

  const loadCourses = async () => {
    try {
      const response = await api.get("/courses/mine");
      if (response.data.success) setCourses(response.data.courses);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const loadStudentAttendance = async () => {
    try {
      const response = await api.get("/attendance/student");
      if (response.data.success) setStudentRecords(response.data.attendance);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (course) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const response = await api.get(`/attendance/course/${course.id}/students`);
      if (response.data.success) {
        const list = response.data.students;
        setStudents(list);
        // Default all to Present
        const initial = {};
        list.forEach(s => { initial[s.id] = "Present"; });
        setAttendance(initial);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (id, status) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  // ✅ Mark ALL students as Present
  const markAllPresent = () => {
    const updated = {};
    students.forEach(s => { updated[s.id] = "Present"; });
    setAttendance(updated);
  };

  // ✅ Mark ALL students as Absent
  const markAllAbsent = () => {
    const updated = {};
    students.forEach(s => { updated[s.id] = "Absent"; });
    setAttendance(updated);
  };

  // ✅ Reset all back to Present (default)
  const resetAll = () => {
    const updated = {};
    students.forEach(s => { updated[s.id] = "Present"; });
    setAttendance(updated);
  };

  const saveAttendance = async () => {
    if (!selectedCourse) return Alert.alert("Error", "Please select a course");

    setSubmitting(true);
    try {
      const attendanceData = students.map(student => ({
        studentId:   student.id,
        studentName: student.username || student.email,
        courseId:    selectedCourse.id,
        courseName:  selectedCourse.courseName,
        classId:     selectedCourse.classId,
        status:      attendance[student.id],
      }));

      const response = await api.post("/attendance/mark", {
        attendance: attendanceData,
        courseId: selectedCourse.id,
      });

      if (response.data.success) {
        Alert.alert("Success", "Attendance submitted successfully.");
        setSelectedCourse(null);
        setStudents([]);
        setAttendance({});
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const init = async () => { await getUserRole(); };
    init();
  }, []);

  useEffect(() => {
    if (role === "lecturer") loadCourses();
    else if (role === "student") loadStudentAttendance();
  }, [role]);

  if (loading || !role) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ─── STUDENT VIEW ─────────────────────────────────────────────────────────────
  if (role === "student") {
    const present = studentRecords.filter(r => r.status === "Present").length;
    const absent  = studentRecords.filter(r => r.status === "Absent").length;
    const total   = studentRecords.length;
    const percent = total ? ((present / total) * 100).toFixed(1) : 0;

    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <Text style={s.eyebrow}>Student Portal</Text>
          <Text style={s.headerTitle}>My Attendance</Text>
          <Text style={s.headerSub}>Track your attendance record</Text>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Overall Attendance</Text>
            <ProgressBar percent={percent} />
            <StatStrip present={present} absent={absent} total={total} />
          </View>

          {total > 0 && (
            <View style={[
              s.statusBanner,
              parseFloat(percent) >= 75
                ? { backgroundColor: C.greenBg, borderColor: "#bbf7d0" }
                : parseFloat(percent) >= 50
                ? { backgroundColor: C.amberBg, borderColor: "#fde68a" }
                : { backgroundColor: C.redBg,   borderColor: "#fecaca" }
            ]}>
              <Text style={[
                s.statusBannerText,
                { color: parseFloat(percent) >= 75 ? C.green : parseFloat(percent) >= 50 ? C.amber : C.red }
              ]}>
                {parseFloat(percent) >= 75
                  ? "✓ Good standing — keep it up!"
                  : parseFloat(percent) >= 50
                  ? "⚠ At risk — try to attend more classes"
                  : "✗ Critical — you may fail due to attendance"}
              </Text>
            </View>
          )}

          <Text style={s.sectionLabel}>Attendance Records</Text>

          {studentRecords.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyTitle}>No Records Yet</Text>
              <Text style={s.emptySubtitle}>
                Your attendance will appear here once your lecturer starts marking.
              </Text>
            </View>
          ) : (
            studentRecords.map(item => (
              <View key={item.id} style={s.recordCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.recordCourse}>{item.courseName}</Text>
                  <Text style={s.recordDate}>{fmtDate(item.date)}</Text>
                </View>
                <View style={[
                  s.statusPill,
                  item.status === "Present" ? { backgroundColor: C.greenBg } : { backgroundColor: C.redBg }
                ]}>
                  <Text style={[
                    s.statusText,
                    { color: item.status === "Present" ? C.green : C.red }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LECTURER VIEW ────────────────────────────────────────────────────────────
  const presentCount = Object.values(attendance).filter(v => v === "Present").length;
  const absentCount  = Object.values(attendance).filter(v => v === "Absent").length;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <Text style={s.eyebrow}>Lecturer Portal</Text>
        <Text style={s.headerTitle}>Mark Attendance</Text>
        <Text style={s.headerSub}>Select a course to mark students</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Your Courses</Text>

        {courses.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📚</Text>
            <Text style={s.emptyTitle}>No Courses Assigned</Text>
            <Text style={s.emptySubtitle}>
              Your programme leader hasn't assigned any courses to you yet.
            </Text>
          </View>
        ) : (
          courses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={[s.courseCard, selectedCourse?.id === course.id && s.courseCardSelected]}
              onPress={() => loadStudents(course)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.courseName}>{course.courseName}</Text>
                <Text style={s.courseSub}>{course.className} • {course.courseCode}</Text>
              </View>
              {selectedCourse?.id === course.id && (
                <View style={s.checkCircle}>
                  <Text style={s.checkMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {selectedCourse && students.length > 0 && (
          <>
            <Text style={s.sectionLabel}>
              Students — {selectedCourse.courseName} ({students.length})
            </Text>

            {/* ✅ Bulk action buttons */}
            <View style={s.bulkRow}>
              <TouchableOpacity style={s.bulkBtnGreen} onPress={markAllPresent} activeOpacity={0.8}>
                <Text style={s.bulkBtnText}>✓ All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.bulkBtnRed} onPress={markAllAbsent} activeOpacity={0.8}>
                <Text style={s.bulkBtnText}>✗ All Absent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.bulkBtnGray} onPress={resetAll} activeOpacity={0.8}>
                <Text style={[s.bulkBtnText, { color: C.text }]}>↺ Reset</Text>
              </TouchableOpacity>
            </View>

            {/* ✅ Live counter */}
            <View style={s.counterRow}>
              <Text style={[s.counterText, { color: C.green }]}>{presentCount} Present</Text>
              <Text style={s.counterDot}>·</Text>
              <Text style={[s.counterText, { color: C.red }]}>{absentCount} Absent</Text>
              <Text style={s.counterDot}>·</Text>
              <Text style={s.counterText}>{students.length} Total</Text>
            </View>

            {students.map(item => (
              <View key={item.id} style={s.studentRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {(item.username || item.email || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={s.studentName}>{item.username || item.email}</Text>
                <View style={s.btnGroup}>
                  <TouchableOpacity
                    style={[s.btn, attendance[item.id] === "Present" && s.btnPresent]}
                    onPress={() => setStatus(item.id, "Present")}
                  >
                    <Text style={[s.btnText, attendance[item.id] === "Present" && { color: C.white }]}>P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btn, attendance[item.id] === "Absent" && s.btnAbsent]}
                    onPress={() => setStatus(item.id, "Absent")}
                  >
                    <Text style={[s.btnText, attendance[item.id] === "Absent" && { color: C.white }]}>A</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={saveAttendance}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={s.submitText}>
                {submitting ? "Submitting…" : `Submit Attendance (${presentCount}P / ${absentCount}A)`}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {selectedCourse && students.length === 0 && !loading && (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTitle}>No Students Found</Text>
            <Text style={s.emptySubtitle}>
              No students have been assigned to this class yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  loadingText: { color: C.muted, fontSize: 14, marginTop: 10 },

  header: {
    backgroundColor: C.navy,
    paddingTop: 52, paddingBottom: 24, paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1.2,
    color: C.gold, textTransform: "uppercase", marginBottom: 6,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.5)" },

  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 10,
  },

  summaryCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 20, marginBottom: 12,
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 14 },

  progressWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  progressTrack: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 6 },
  progressPct:   { fontSize: 16, fontWeight: "700", minWidth: 48, textAlign: "right" },

  statStrip:   { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 2 },
  statMeta:    { fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 2 },

  statusBanner:     { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  statusBannerText: { fontSize: 13, fontWeight: "600", textAlign: "center" },

  recordCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, flexDirection: "row",
    alignItems: "center", marginBottom: 8,
  },
  recordCourse: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 3 },
  recordDate:   { fontSize: 12, color: C.muted },
  statusPill:   { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusText:   { fontSize: 12, fontWeight: "700" },

  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 28, alignItems: "center", marginBottom: 10,
  },
  emptyIcon:     { fontSize: 32, marginBottom: 10 },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  courseCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, flexDirection: "row",
    alignItems: "center", marginBottom: 8,
  },
  courseCardSelected: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  courseName: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 3 },
  courseSub:  { fontSize: 12, color: C.muted },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy,
    alignItems: "center", justifyContent: "center",
  },
  checkMark: { color: C.white, fontSize: 11, fontWeight: "700" },

  // ✅ Bulk action buttons
  bulkRow: {
    flexDirection: "row", gap: 8, marginBottom: 10,
  },
  bulkBtnGreen: {
    flex: 1, backgroundColor: C.green, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  bulkBtnRed: {
    flex: 1, backgroundColor: C.red, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  bulkBtnGray: {
    flex: 1, backgroundColor: C.badge, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  bulkBtnText: { fontSize: 12, fontWeight: "700", color: C.white },

  // ✅ Live counter
  counterRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginBottom: 12,
  },
  counterText: { fontSize: 13, fontWeight: "600", color: C.muted },
  counterDot:  { fontSize: 13, color: C.muted },

  studentRow: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, flexDirection: "row",
    alignItems: "center", marginBottom: 8, gap: 10,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.badge,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText:  { fontSize: 13, fontWeight: "700", color: C.navy },
  studentName: { flex: 1, fontSize: 13, fontWeight: "600", color: C.text },

  btnGroup:   { flexDirection: "row", gap: 6 },
  btn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: C.badge,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  btnPresent: { backgroundColor: C.green, borderColor: C.green },
  btnAbsent:  { backgroundColor: C.red,   borderColor: C.red },
  btnText:    { fontSize: 12, fontWeight: "700", color: C.navy },

  submitBtn: {
    backgroundColor: C.navy, borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 8,
  },
  submitText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
});
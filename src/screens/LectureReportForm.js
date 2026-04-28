import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  Alert,
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

function Field({ label, value, onChangeText, placeholder, multiline, editable = true, keyboardType }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMulti, !editable && s.inputReadonly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
        placeholderTextColor={C.muted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        editable={editable}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

function FormSection({ title }) {
  return (
    <View style={s.formSection}>
      <Text style={s.formSectionText}>{title}</Text>
      <View style={s.formSectionLine} />
    </View>
  );
}

function CourseCard({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[s.courseCard, selected && s.courseCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.courseName}>{item.courseName}</Text>
        <View style={s.courseMetaRow}>
          <View style={s.codeBadge}>
            <Text style={s.codeBadgeText}>{item.courseCode}</Text>
          </View>
          <Text style={s.courseMeta}>{item.className || item.classId}</Text>
        </View>
      </View>
      {selected && (
        <View style={s.checkCircle}>
          <Text style={s.checkMark}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function LectureReportScreen({ navigation }) {
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [courses, setCourses]         = useState([]);
  const [selectedCourse, setSelected] = useState(null);

  const [facultyName,      setFacultyName]      = useState("");
  const [className,        setClassName]        = useState("");
  const [week,             setWeek]             = useState("");
  const [date,             setDate]             = useState("");
  const [courseName,       setCourseName]       = useState("");
  const [courseCode,       setCourseCode]       = useState("");
  const [lecturerName,     setLecturerName]     = useState("");
  const [actualPresent,    setActualPresent]    = useState("");
  const [totalRegistered,  setTotalRegistered]  = useState("");
  const [venue,            setVenue]            = useState("");
  const [time,             setTime]             = useState("");
  const [topic,            setTopic]            = useState("");
  const [outcomes,         setOutcomes]         = useState("");
  const [recommendations,  setRecommendations]  = useState("");

  // ─── Load only THIS lecturer's assigned courses ───────────────────────────────
  // ✅ Fixed: was "/courses" (all courses). Now "/courses/mine" (filtered by lecturerId in backend)
  const loadCourses = async () => {
    try {
      const response = await api.get("/courses/mine");
      if (response.data.success) {
        setCourses(response.data.courses);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = async (course) => {
    setSelected(course);
    setCourseName(course.courseName || "");
    setCourseCode(course.courseCode || "");
    setClassName(course.className || "");
    setVenue(course.venue || "");
    setTime(course.time || "");
    setFacultyName(course.facultyName || "");

    const userData = await AsyncStorage.getItem("user_data");
    const user = userData ? JSON.parse(userData) : {};
    setLecturerName(course.lecturerName || user.username || "Lecturer");

    if (course.classId) {
      try {
        const studentsRes = await api.get(`/attendance/course/${course.id}/students`);
        if (studentsRes.data.success) {
          setTotalRegistered(String(studentsRes.data.students.length));
        }
      } catch (_) {
        setTotalRegistered("0");
      }
    }
  };

  const submitReport = async () => {
    if (!selectedCourse) return Alert.alert("Select a course", "Please choose a course first.");
    if (!topic.trim())   return Alert.alert("Topic required", "Please enter the topic taught.");
    if (!actualPresent.trim()) return Alert.alert("Attendance required", "Please enter students present.");

    setSubmitting(true);
    try {
      const payload = {
        facultyName,
        className,
        week,
        date: date || new Date().toISOString().split('T')[0],
        courseName,
        courseCode,
        classId:        selectedCourse.classId,
        lecturerName,
        actualPresent:  Number(actualPresent),
        totalRegistered: Number(totalRegistered) || 0,
        venue,
        scheduledTime:  time,
        topic,
        outcomes,
        recommendations
      };

      const response = await api.post("/reports", payload);
      if (response.data.success) {
        Alert.alert("Success", "Lecture report submitted successfully.");
        setWeek(""); setDate(""); setTopic("");
        setOutcomes(""); setRecommendations(""); setActualPresent("");
        setSelected(null);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Text style={s.eyebrow}>Lecturer Portal</Text>
        <Text style={s.headerTitle}>Lecture Report</Text>
        <Text style={s.headerSub}>Submit your lecture report below</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.sectionLabel}>Select Course</Text>

        {/* ✅ Unassigned lecturer sees empty state, not other people's courses */}
        {courses.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No Courses Assigned</Text>
            <Text style={s.emptySubtitle}>
              Your programme leader hasn't assigned any courses to you yet.
              You'll be able to submit reports once a course is assigned.
            </Text>
          </View>
        ) : (
          courses.map((course) => (
            <CourseCard
              key={course.id}
              item={course}
              selected={selectedCourse?.id === course.id}
              onPress={() => selectCourse(course)}
            />
          ))
        )}

        {selectedCourse && (
          <>
            <FormSection title="Class Information" />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field label="Faculty" value={facultyName} onChangeText={setFacultyName} placeholder="e.g. FICT" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Class" value={className} onChangeText={setClassName} placeholder="e.g. BSCSMY3" />
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field label="Week" value={week} onChangeText={setWeek} placeholder="e.g. 3" keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Date" value={date} onChangeText={setDate} placeholder="DD-MM-YYYY" />
              </View>
            </View>

            <FormSection title="Course Information" />

            <View style={s.row}>
              <View style={{ flex: 2 }}>
                <Field label="Course Name" value={courseName} onChangeText={setCourseName} editable={false} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Code" value={courseCode} onChangeText={setCourseCode} editable={false} />
              </View>
            </View>

            <Field label="Lecturer Name" value={lecturerName} onChangeText={setLecturerName} editable={false} />

            <FormSection title="Attendance" />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field label="Students Present" value={actualPresent} onChangeText={setActualPresent} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Total Registered" value={totalRegistered} onChangeText={setTotalRegistered} placeholder="0" keyboardType="numeric" />
              </View>
            </View>

            <FormSection title="Logistics" />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field label="Venue" value={venue} onChangeText={setVenue} placeholder="e.g. Room 1" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Scheduled Time" value={time} onChangeText={setTime} placeholder="e.g. 08:00–10:00" />
              </View>
            </View>

            <FormSection title="Academic Content" />

            <Field label="Topic Taught" value={topic} onChangeText={setTopic} placeholder="e.g. Introduction to Limits" />
            <Field label="Learning Outcomes" value={outcomes} onChangeText={setOutcomes} placeholder="What students should be able to do after this lecture…" multiline />
            <Field label="Recommendations" value={recommendations} onChangeText={setRecommendations} placeholder="Any recommendations or follow-up actions…" multiline />

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={submitReport}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={s.submitText}>
                {submitting ? "Submitting…" : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },

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
    color: C.muted, textTransform: "uppercase", marginBottom: 10, marginTop: 4,
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 28, alignItems: "center", marginBottom: 10,
  },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  courseCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 8,
  },
  courseCardSelected: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  courseName:    { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 5 },
  courseMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeBadge: {
    backgroundColor: C.badge, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  codeBadgeText: { fontSize: 10, fontWeight: "600", color: C.navy, letterSpacing: 0.5 },
  courseMeta:    { fontSize: 12, color: C.muted },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy,
    alignItems: "center", justifyContent: "center", marginLeft: 10,
  },
  checkMark: { color: C.white, fontSize: 11, fontWeight: "700" },

  formSection: {
    flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 12, gap: 10,
  },
  formSectionText: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1,
    color: C.navy, textTransform: "uppercase", flexShrink: 0,
  },
  formSectionLine: { flex: 1, height: 1, backgroundColor: C.border },

  row:   { flexDirection: "row", marginBottom: 0 },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 6, letterSpacing: 0.2,
  },
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },
  inputMulti:    { minHeight: 80, paddingTop: 12 },
  inputReadonly: { backgroundColor: C.badge, color: C.muted },

  submitBtn: {
    backgroundColor: C.navy, borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 24,
  },
  submitText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
});
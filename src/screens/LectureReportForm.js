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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingReports, setFetchingReports] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelected] = useState(null);
  const [existingReports, setExistingReports] = useState([]);
  const [existingWeeks, setExistingWeeks] = useState([]);
  const [editingReport, setEditingReport] = useState(null);
  const [showReportList, setShowReportList] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  // Form fields
  const [facultyName, setFacultyName] = useState("");
  const [className, setClassName] = useState("");
  const [week, setWeek] = useState("");
  const [date, setDate] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [actualPresent, setActualPresent] = useState("");
  const [totalRegistered, setTotalRegistered] = useState("");
  const [venue, setVenue] = useState("");
  const [time, setTime] = useState("");
  const [topic, setTopic] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [recommendations, setRecommendations] = useState("");

  // Load lecturer's courses
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

  // Load existing reports for selected course
  const loadExistingReports = async (courseId) => {
    setFetchingReports(true);
    try {
      const response = await api.get(`/reports/course/${courseId}`);
      if (response.data.success) {
        setExistingReports(response.data.reports);
        // Track which weeks already have reports (for duplicate prevention)
        const weeks = response.data.reports.map(r => r.week?.toString());
        setExistingWeeks(weeks);
      }
    } catch (error) {
      console.log("Failed to load existing reports");
    } finally {
      setFetchingReports(false);
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

    // Load existing reports for this course
    await loadExistingReports(course.id);
    setShowReportList(true);
    setEditingReport(null);
    clearForm();
    setDuplicateError("");
  };

  // Check if week already has a report
  const checkDuplicateWeek = (weekNum) => {
    if (!weekNum) return false;
    // Don't check if editing the same report
    if (editingReport && editingReport.week?.toString() === weekNum.toString()) {
      return false;
    }
    return existingWeeks.includes(weekNum.toString());
  };

  // Edit existing report
  const editReport = (report) => {
    setEditingReport(report);
    setFacultyName(report.facultyName || "");
    setClassName(report.className || "");
    setWeek(report.week?.toString() || "");
    setDate(report.date || "");
    setCourseName(report.courseName || "");
    setCourseCode(report.courseCode || "");
    setLecturerName(report.lecturerName || "");
    setActualPresent(report.actualPresent?.toString() || "");
    setTotalRegistered(report.totalRegistered?.toString() || "");
    setVenue(report.venue || "");
    setTime(report.scheduledTime || "");
    setTopic(report.topic || "");
    setOutcomes(report.outcomes || "");
    setRecommendations(report.recommendations || "");
    setShowReportList(false);
    setDuplicateError("");
  };

  const clearForm = () => {
    setFacultyName("");
    setClassName("");
    setWeek("");
    setDate("");
    setActualPresent("");
    setTotalRegistered("");
    setVenue("");
    setTime("");
    setTopic("");
    setOutcomes("");
    setRecommendations("");
    setDuplicateError("");
  };

  // Check if week field has duplicate when user types
  const handleWeekChange = (value) => {
    setWeek(value);
    if (checkDuplicateWeek(value)) {
      setDuplicateError(`⚠️ Week ${value} already has a report. You can edit the existing report instead.`);
    } else {
      setDuplicateError("");
    }
  };

  const submitReport = async () => {
    if (!selectedCourse) return Alert.alert("Select a course", "Please choose a course first.");
    if (!topic.trim()) return Alert.alert("Topic required", "Please enter the topic taught.");
    if (!actualPresent.trim()) return Alert.alert("Attendance required", "Please enter students present.");
    
    // Check for duplicate week (only for new reports, not editing)
    if (!editingReport && checkDuplicateWeek(week)) {
      return Alert.alert(
        "Duplicate Report",
        `You have already submitted a report for Week ${week}. Do you want to edit the existing report instead?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Edit Existing", 
            onPress: () => {
              const existing = existingReports.find(r => r.week?.toString() === week.toString());
              if (existing) editReport(existing);
            }
          }
        ]
      );
    }

    setSubmitting(true);
    try {
      const payload = {
        facultyName,
        className,
        week: week ? Number(week) : null,
        date: date || new Date().toISOString().split('T')[0],
        courseName,
        courseCode,
        classId: selectedCourse.classId,
        lecturerName,
        actualPresent: Number(actualPresent),
        totalRegistered: Number(totalRegistered) || 0,
        venue,
        scheduledTime: time,
        topic,
        outcomes,
        recommendations
      };

      let response;
      if (editingReport) {
        response = await api.put(`/reports/${editingReport.id}`, payload);
      } else {
        response = await api.post("/reports", payload);
      }

      if (response.data.success) {
        Alert.alert("Success", editingReport ? "Report updated successfully." : "Report submitted successfully.");
        clearForm();
        setEditingReport(null);
        await loadExistingReports(selectedCourse.id);
        setShowReportList(true);
        setDuplicateError("");
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEdit = () => {
    clearForm();
    setEditingReport(null);
    setShowReportList(true);
    setDuplicateError("");
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
        <Text style={s.headerSub}>Submit or edit your lecture reports</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.sectionLabel}>Select Course</Text>

        {courses.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No Courses Assigned</Text>
            <Text style={s.emptySubtitle}>
              Your programme leader hasn't assigned any courses to you yet.
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

        {/* Show existing reports list */}
        {selectedCourse && showReportList && !editingReport && (
          <>
            <FormSection title="Previous Reports" />
            {fetchingReports ? (
              <ActivityIndicator size="small" color={C.navy} />
            ) : existingReports.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptySubtitle}>No previous reports for this course.</Text>
              </View>
            ) : (
              existingReports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={s.reportCard}
                  onPress={() => editReport(report)}
                >
                  <Text style={s.reportWeek}>Week {report.week}</Text>
                  <Text style={s.reportTopic}>{report.topic}</Text>
                  <Text style={s.reportDate}>{report.date}</Text>
                  <Text style={s.reportStatus}>
                    Status: {report.status === 'pending' ? '📝 Pending' : '✅ Reviewed'}
                  </Text>
                  <Text style={s.editHint}>Tap to edit</Text>
                </TouchableOpacity>
              ))
            )}
            
            <TouchableOpacity
              style={s.newReportBtn}
              onPress={() => {
                clearForm();
                setEditingReport(null);
                setShowReportList(false);
                setDuplicateError("");
              }}
            >
              <Text style={s.newReportBtnText}>+ Create New Report</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Report Form */}
        {selectedCourse && !showReportList && (
          <>
            <FormSection title={editingReport ? "Edit Report" : "New Report"} />

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
                <Field 
                  label="Week Number" 
                  value={week} 
                  onChangeText={handleWeekChange} 
                  placeholder="e.g. 3" 
                  keyboardType="numeric" 
                />
                {duplicateError !== "" && (
                  <Text style={s.errorText}>{duplicateError}</Text>
                )}
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
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
            <Field label="Learning Outcomes" value={outcomes} onChangeText={setOutcomes} placeholder="What students should be able to do..." multiline />
            <Field label="Recommendations" value={recommendations} onChangeText={setRecommendations} placeholder="Any recommendations or follow-up actions..." multiline />

            <View style={s.buttonRow}>
              <TouchableOpacity
                style={[s.cancelBtn, submitting && { opacity: 0.6 }]}
                onPress={cancelEdit}
                disabled={submitting}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={submitReport}
                disabled={submitting || !!duplicateError}
              >
                <Text style={s.submitText}>
                  {submitting ? "Saving..." : (editingReport ? "Update Report" : "Submit Report")}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
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
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.5)" },

  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase", marginBottom: 10, marginTop: 4,
  },

  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 28, alignItems: "center", marginBottom: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  courseCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 8,
  },
  courseCardSelected: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  courseName: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 5 },
  courseMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeBadge: {
    backgroundColor: C.badge, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  codeBadgeText: { fontSize: 10, fontWeight: "600", color: C.navy, letterSpacing: 0.5 },
  courseMeta: { fontSize: 12, color: C.muted },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy,
    alignItems: "center", justifyContent: "center", marginLeft: 10,
  },
  checkMark: { color: C.white, fontSize: 11, fontWeight: "700" },

  reportCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  reportWeek: { fontSize: 12, color: C.gold, fontWeight: "bold", marginBottom: 4 },
  reportTopic: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 2 },
  reportDate: { fontSize: 11, color: C.muted },
  reportStatus: { fontSize: 10, color: C.muted, marginTop: 2 },
  editHint: { fontSize: 10, color: C.muted, marginTop: 4, fontStyle: "italic" },

  newReportBtn: {
    backgroundColor: C.navy,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  newReportBtnText: { color: C.white, fontWeight: "600" },

  errorText: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 4,
    marginLeft: 4,
  },

  formSection: {
    flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 12, gap: 10,
  },
  formSectionText: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1,
    color: C.navy, textTransform: "uppercase", flexShrink: 0,
  },
  formSectionLine: { flex: 1, height: 1, backgroundColor: C.border },

  row: { flexDirection: "row", marginBottom: 0 },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 6, letterSpacing: 0.2,
  },
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },
  inputReadonly: { backgroundColor: C.badge, color: C.muted },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: C.badge,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  cancelBtnText: {
    color: C.muted,
    fontWeight: "600",
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  submitText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
});
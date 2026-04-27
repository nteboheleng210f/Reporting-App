import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

export default function AttendanceScreen({ navigation }) {
  const [role, setRole] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [studentRecords, setStudentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Get user role from storage
  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole || "student");
  };

  // Load lecturer courses
  const loadCourses = async () => {
    try {
      const response = await api.get("/courses");
      if (response.data.success) {
        setCourses(response.data.courses);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load courses");
    }
  };

  // Load student attendance records
  const loadStudentAttendance = async () => {
    try {
      const response = await api.get("/attendance/student");
      if (response.data.success) {
        setStudentRecords(response.data.attendance);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  // Load students for a course (lecturer only)
  const loadStudents = async (course) => {
    setSelectedCourse(course);
    setLoading(true);

    try {
      // Use the correct attendance endpoint
      const response = await api.get(`/attendance/course/${course.id}/students`);
      if (response.data.success) {
        const studentsList = response.data.students;
        setStudents(studentsList);

        const initial = {};
        studentsList.forEach(s => {
          initial[s.id] = "Present";
        });
        setAttendance(initial);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // Set attendance status
  const setStatus = (id, status) => {
    setAttendance(prev => ({
      ...prev,
      [id]: status
    }));
  };

  // Save attendance
  const saveAttendance = async () => {
    if (!selectedCourse) {
      return Alert.alert("Error", "Please select a course");
    }

    setSubmitting(true);

    try {
      const attendanceData = students.map(student => ({
        studentId: student.id,
        studentName: student.username || student.email,
        courseId: selectedCourse.id,
        courseName: selectedCourse.courseName,
        classId: selectedCourse.classId,
        status: attendance[student.id],
      }));

      const response = await api.post("/attendance/mark", {
        attendance: attendanceData,
        courseId: selectedCourse.id
      });

      if (response.data.success) {
        Alert.alert("Success", "Attendance submitted");
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

  // Initialize
  useEffect(() => {
    const init = async () => {
      await getUserRole();
    };
    init();
  }, []);

  useEffect(() => {
    if (role === "lecturer") {
      loadCourses();
      setLoading(false);
    } else if (role === "student") {
      loadStudentAttendance();
    }
  }, [role]);

  // Loading view
  if (loading || !role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ========== STUDENT VIEW ==========
  if (role === "student") {
    const present = studentRecords.filter(r => r.status === "Present").length;
    const total = studentRecords.length;
    const percent = total ? ((present / total) * 100).toFixed(1) : 0;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Attendance</Text>
        <Text style={styles.summary}>Attendance: {percent}%</Text>

        <FlatList
          data={studentRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <Text style={styles.courseName}>{item.courseName}</Text>
              <Text style={styles.date}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
              <Text style={[
                styles.statusText,
                item.status === "Present" ? { color: "#16a34a" } : { color: "#dc2626" }
              ]}>
                {item.status}
              </Text>
            </View>
          )}
        />
      </View>
    );
  }

  // ========== LECTURER VIEW ==========
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.section}>Select Course</Text>

      {courses.map(course => (
        <TouchableOpacity
          key={course.id}
          style={[
            styles.courseCard,
            selectedCourse?.id === course.id && styles.selectedCourse
          ]}
          onPress={() => loadStudents(course)}
        >
          <Text style={styles.courseName}>{course.courseName}</Text>
          <Text style={styles.courseSub}>{course.className}</Text>
        </TouchableOpacity>
      ))}

      {students.length > 0 && (
        <>
          <Text style={styles.section}>Students ({students.length})</Text>

          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.studentName}>
                  {item.username || item.email}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      attendance[item.id] === "Present" && styles.activePresent
                    ]}
                    onPress={() => setStatus(item.id, "Present")}
                  >
                    <Text style={styles.btnText}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      attendance[item.id] === "Absent" && styles.activeAbsent
                    ]}
                    onPress={() => setStatus(item.id, "Absent")}
                  >
                    <Text style={styles.btnText}>Absent</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <TouchableOpacity 
            style={[styles.saveBtn, submitting && { opacity: 0.6 }]} 
            onPress={saveAttendance}
            disabled={submitting}
          >
            <Text style={styles.saveText}>
              {submitting ? "Submitting..." : "Submit Attendance"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#0f172a"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10
  },
  section: {
    color: "#cbd5e1",
    marginTop: 15,
    marginBottom: 8,
    fontWeight: "600"
  },
  summary: {
    color: "#38bdf8",
    marginBottom: 10,
    fontWeight: "bold"
  },
  courseCard: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  selectedCourse: {
    borderWidth: 2,
    borderColor: "#38bdf8"
  },
  courseName: {
    color: "white",
    fontWeight: "bold"
  },
  courseSub: {
    color: "#94a3b8"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8
  },
  studentName: {
    color: "white",
    flex: 1
  },
  actions: {
    flexDirection: "row",
    gap: 8
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#334155"
  },
  activePresent: {
    backgroundColor: "#16a34a"
  },
  activeAbsent: {
    backgroundColor: "#dc2626"
  },
  btnText: {
    color: "white",
    fontSize: 12
  },
  saveBtn: {
    marginTop: 15,
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  saveText: {
    color: "white",
    fontWeight: "bold"
  },
  recordCard: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  date: {
    color: "#94a3b8",
    marginTop: 4
  },
  statusText: {
    marginTop: 6,
    fontWeight: "bold"
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  loadingText: {
    color: "white",
    marginTop: 10
  }
});
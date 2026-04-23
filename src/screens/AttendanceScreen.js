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

import { db, auth } from "../firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc
} from "firebase/firestore";

export default function AttendanceScreen() {

  const user = auth.currentUser;

  const [role, setRole] = useState(null);

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendance, setAttendance] = useState({});

  const [studentRecords, setStudentRecords] = useState([]);

  const [loading, setLoading] = useState(true);

  // =========================
  // GET USER ROLE
  // =========================
  const fetchRole = async () => {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setRole(snap.data().role);
      } else {
        setRole("student");
      }
    } catch (error) {
      setRole("student");
    }
  };

  // =========================
  // LOAD LECTURER COURSES
  // =========================
  const loadCourses = async () => {
    try {
      const snap = await getDocs(collection(db, "courses"));

      const myCourses = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => c.lecturerId === user.uid);

      setCourses(myCourses);

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // =========================
  // LOAD STUDENT ATTENDANCE
  // =========================
  const loadStudentAttendance = async () => {
    try {
      const snap = await getDocs(collection(db, "attendance"));

      const myRecords = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => a.studentId === user.uid);

      setStudentRecords(myRecords);

    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    const init = async () => {
      await fetchRole();

      if (role === "lecturer") {
        await loadCourses();
        setLoading(false);
      } else {
        await loadStudentAttendance();
      }
    };

    init();
  }, [role]);

  // =========================
  // LOAD STUDENTS (LECTURER)
  // =========================
  const loadStudents = async (course) => {
    setSelectedCourse(course);

    try {
      const snap = await getDocs(collection(db, "users"));

      const studentsList = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === "student");

      setStudents(studentsList);

      const initial = {};
      studentsList.forEach(s => {
        initial[s.id] = "Present";
      });

      setAttendance(initial);

      Alert.alert("Loaded", `${studentsList.length} students ready`);

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // =========================
  // SET STATUS
  // =========================
  const setStatus = (id, status) => {
    setAttendance(prev => ({
      ...prev,
      [id]: status
    }));
  };

  // =========================
  // SAVE ATTENDANCE
  // =========================
  const saveAttendance = async () => {

    if (!selectedCourse) {
      return Alert.alert("Error", "Please select a course");
    }

    try {

      const promises = students.map(student =>
        addDoc(collection(db, "attendance"), {
          studentId: student.id,
          studentName: student.username || student.email,
          courseId: selectedCourse.id,
          courseName: selectedCourse.courseName,
          classId: selectedCourse.classId,
          status: attendance[student.id],
          date: new Date().toISOString(),
          lecturerId: user.uid
        })
      );

      await Promise.all(promises);

      Alert.alert("Success", "Attendance submitted");

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // =========================
  // LOADING
  // =========================
  if (loading || !role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // =========================
  // =========================
  // STUDENT VIEW 👇
  // =========================
  // =========================
  if (role === "student") {

    const present = studentRecords.filter(r => r.status === "Present").length;
    const total = studentRecords.length;

    const percent = total ? ((present / total) * 100).toFixed(1) : 0;

    return (
      <View style={styles.container}>

        <Text style={styles.title}>My Attendance</Text>

        <Text style={styles.summary}>
          Attendance: {percent}%
        </Text>

        <FlatList
          data={studentRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <Text style={styles.courseName}>
                {item.courseName}
              </Text>

              <Text style={styles.date}>
                {new Date(item.date).toLocaleDateString()}
              </Text>

              <Text style={[
                styles.statusText,
                item.status === "Present"
                  ? { color: "#16a34a" }
                  : { color: "#dc2626" }
              ]}>
                {item.status}
              </Text>
            </View>
          )}
        />

      </View>
    );
  }

  // =========================
  // =========================
  // LECTURER VIEW 👇 (UNCHANGED)
  // =========================
  // =========================
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
          <Text style={styles.section}>
            Students ({students.length})
          </Text>

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

          <TouchableOpacity style={styles.saveBtn} onPress={saveAttendance}>
            <Text style={styles.saveText}>Submit Attendance</Text>
          </TouchableOpacity>
        </>
      )}

    </View>
  );
}

// =========================
// STYLES
// =========================
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
    alignItems: "center"
  }
});
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet
} from "react-native";

import { db, auth } from "../firebase/config";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function LecturerReportForm() {

  const user = auth.currentUser;

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [form, setForm] = useState({
    week: "",
    date: "",
    venue: "",
    time: "",
    topic: "",
    outcomes: "",
    recommendations: ""
  });

  // =========================
  // LOAD LECTURER COURSES
  // =========================
  useEffect(() => {
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

    loadCourses();
  }, []);

  // =========================
  // UPDATE FORM
  // =========================
  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // =========================
  // SUBMIT REPORT
  // =========================
  const submitReport = async () => {

    if (!selectedCourse) {
      Alert.alert("Error", "Please select a course");
      return;
    }

    try {
      await addDoc(collection(db, "reports"), {
        lecturerId: user.uid,
        lecturerName: user.displayName || "Lecturer",

        courseId: selectedCourse.id,
        courseName: selectedCourse.courseName,
        courseCode: selectedCourse.courseCode,
        className: selectedCourse.className,

        week: form.week,
        date: form.date,
        venue: form.venue,
        time: form.time,
        topic: form.topic,
        outcomes: form.outcomes,
        recommendations: form.recommendations,

        createdAt: new Date().toISOString()
      });

      Alert.alert("Success", "Report submitted successfully!");

      setForm({
        week: "",
        date: "",
        venue: "",
        time: "",
        topic: "",
        outcomes: "",
        recommendations: ""
      });

      setSelectedCourse(null);

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>Lecture Report Form</Text>

      {/* COURSE SELECT */}
      <Text style={styles.label}>Select Course</Text>

      {courses.map(course => (
        <TouchableOpacity
          key={course.id}
          style={[
            styles.card,
            selectedCourse?.id === course.id && styles.selected
          ]}
          onPress={() => setSelectedCourse(course)}
        >
          <Text style={styles.cardText}>
            {course.courseName} ({course.courseCode})
          </Text>
          <Text style={styles.subText}>
            {course.className}
          </Text>
        </TouchableOpacity>
      ))}

      {/* FORM FIELDS */}
      <Text style={styles.label}>Week</Text>
      <TextInput style={styles.input} value={form.week} onChangeText={t => handleChange("week", t)} />

      <Text style={styles.label}>Date</Text>
      <TextInput style={styles.input} value={form.date} onChangeText={t => handleChange("date", t)} />

      <Text style={styles.label}>Venue</Text>
      <TextInput style={styles.input} value={form.venue} onChangeText={t => handleChange("venue", t)} />

      <Text style={styles.label}>Time</Text>
      <TextInput style={styles.input} value={form.time} onChangeText={t => handleChange("time", t)} />

      <Text style={styles.label}>Topic</Text>
      <TextInput style={styles.input} value={form.topic} onChangeText={t => handleChange("topic", t)} />

      <Text style={styles.label}>Learning Outcomes</Text>
      <TextInput style={styles.input} value={form.outcomes} onChangeText={t => handleChange("outcomes", t)} />

      <Text style={styles.label}>Recommendations</Text>
      <TextInput style={styles.input} value={form.recommendations} onChangeText={t => handleChange("recommendations", t)} />

      {/* SUBMIT */}
      <TouchableOpacity style={styles.button} onPress={submitReport}>
        <Text style={styles.buttonText}>Submit Report</Text>
      </TouchableOpacity>

    </ScrollView>
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
    marginBottom: 15
  },

  label: {
    color: "#cbd5e1",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "600"
  },

  input: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    color: "white"
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },

  selected: {
    backgroundColor: "#2563eb"
  },

  cardText: {
    color: "white",
    fontWeight: "600"
  },

  subText: {
    color: "#94a3b8",
    fontSize: 12
  },

  button: {
    backgroundColor: "#16a34a",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontWeight: "bold"
  }
});
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import { db } from "../firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from "firebase/firestore";

export default function LecturerReportScreen() {

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentCount, setStudentCount] = useState(0);

  // REPORT FIELDS
  const [week, setWeek] = useState("");
  const [date, setDate] = useState("");
  const [topic, setTopic] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [actualPresent, setActualPresent] = useState("");

  // LOAD CLASSES
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "classSchedules"));
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        Alert.alert("Error", e.message);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  // SELECT CLASS → COUNT STUDENTS
  const selectClass = async (item) => {
    setSelectedClass(item);

    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("classId", "==", item.id))
      );
      setStudentCount(snap.size);
    } catch {
      setStudentCount(0);
    }
  };

  // SUBMIT REPORT
  const submitReport = async () => {

    if (!selectedClass) {
      Alert.alert("Select a class first");
      return;
    }

    if (!week || !date || !topic) {
      Alert.alert("Please fill required fields");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "lectureReports"), {
        classId: selectedClass.id,

        // AUTO DATA
        facultyName: selectedClass.facultyName,
        className: selectedClass.className,
        courseName: selectedClass.courseName,
        courseCode: selectedClass.courseCode,
        venue: selectedClass.venue,
        scheduledTime: selectedClass.time,
        totalRegistered: studentCount,

        // INPUT DATA
        week,
        date,
        topic,
        outcomes,
        recommendations,
        actualPresent,

        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Report submitted");

      // RESET INPUTS
      setWeek("");
      setDate("");
      setTopic("");
      setOutcomes("");
      setRecommendations("");
      setActualPresent("");

    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // LOADING SCREEN
  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>📘 Lecturer Report</Text>

      {/* CLASS LIST */}
      <Text style={styles.subtitle}>Select Class</Text>

      {classes.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.classCard,
            selectedClass?.id === item.id && styles.selectedCard
          ]}
          onPress={() => selectClass(item)}
        >
          <Text style={styles.classText}>{item.className}</Text>
          <Text style={styles.detail}>
            {item.courseName} ({item.courseCode})
          </Text>
        </TouchableOpacity>
      ))}

      {/* AUTO-FILLED SECTION */}
      {selectedClass && (
        <View style={styles.card}>

          <Text style={styles.sectionTitle}>Auto-filled Details</Text>

          <View style={styles.readOnly}>
            <Text style={styles.label}>Faculty Name</Text>
            <Text style={styles.readValue}>{selectedClass.facultyName}</Text>
          </View>

          <View style={styles.readOnly}>
            <Text style={styles.label}>Course Name</Text>
            <Text style={styles.readValue}>{selectedClass.courseName}</Text>
          </View>

          <View style={styles.readOnly}>
            <Text style={styles.label}>Course Code</Text>
            <Text style={styles.readValue}>{selectedClass.courseCode}</Text>
          </View>

          <View style={styles.readOnly}>
            <Text style={styles.label}>Venue</Text>
            <Text style={styles.readValue}>{selectedClass.venue}</Text>
          </View>

          <View style={styles.readOnly}>
            <Text style={styles.label}>Scheduled Time</Text>
            <Text style={styles.readValue}>{selectedClass.time}</Text>
          </View>

          <View style={styles.readOnly}>
            <Text style={styles.label}>Total Registered Students</Text>
            <Text style={styles.readValue}>{studentCount}</Text>
          </View>

        </View>
      )}

      {/* REPORT FORM */}
      {selectedClass && (
        <View style={styles.card}>

          <Text style={styles.sectionTitle}>Lecture Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Week of Reporting"
            placeholderTextColor="#94a3b8"
            value={week}
            onChangeText={setWeek}
          />

          <TextInput
            style={styles.input}
            placeholder="Date of Lecture"
            placeholderTextColor="#94a3b8"
            value={date}
            onChangeText={setDate}
          />

          <TextInput
            style={styles.input}
            placeholder="Topic Taught"
            placeholderTextColor="#94a3b8"
            value={topic}
            onChangeText={setTopic}
          />

          <TextInput
            style={styles.input}
            placeholder="Learning Outcomes"
            placeholderTextColor="#94a3b8"
            value={outcomes}
            onChangeText={setOutcomes}
          />

          <TextInput
            style={styles.input}
            placeholder="Recommendations"
            placeholderTextColor="#94a3b8"
            value={recommendations}
            onChangeText={setRecommendations}
          />

          <TextInput
            style={styles.input}
            placeholder="Actual Students Present"
            placeholderTextColor="#94a3b8"
            value={actualPresent}
            onChangeText={setActualPresent}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.button} onPress={submitReport}>
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Submit Report"}
            </Text>
          </TouchableOpacity>

        </View>
      )}

    </ScrollView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#0b1220",
    padding: 15
  },

  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10
  },

  subtitle: {
    color: "#cbd5e1",
    marginVertical: 10,
    fontWeight: "700"
  },

  classCard: {
    backgroundColor: "#111c3a",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#2563eb"
  },

  classText: {
    color: "#60a5fa",
    fontWeight: "bold"
  },

  detail: {
    color: "#cbd5e1",
    fontSize: 12
  },

  card: {
    backgroundColor: "#111c3a",
    padding: 12,
    borderRadius: 10,
    marginTop: 10
  },

  sectionTitle: {
    color: "#93c5fd",
    marginBottom: 8,
    fontWeight: "700"
  },

  readOnly: {
    backgroundColor: "#0f172a",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b"
  },

  label: {
    color: "#94a3b8",
    fontSize: 11
  },

  readValue: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600"
  },

  input: {
    backgroundColor: "#1e293b",
    color: "white",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontWeight: "bold"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
});
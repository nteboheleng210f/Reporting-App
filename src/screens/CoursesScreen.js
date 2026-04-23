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
  StatusBar,
} from "react-native";

import { db } from "../firebase/config";
import { collection, getDocs, addDoc } from "firebase/firestore";

export default function CoursesScreen() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [lecturers, setLecturers] = useState([]);

  // FORM
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");

  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedLecturer, setSelectedLecturer] = useState(null);

  
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showLecturerDropdown, setShowLecturerDropdown] = useState(false);

  
  useEffect(() => {
    const load = async () => {
      try {
        const classSnap = await getDocs(collection(db, "classSchedules"));
        const userSnap = await getDocs(collection(db, "users"));
        const courseSnap = await getDocs(collection(db, "courses"));

        setClasses(
          classSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );

        setCourses(
          courseSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );

        const lecturerList = userSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((u) => u.role === "lecturer");

        setLecturers(lecturerList);
      } catch (e) {
        Alert.alert("Error", e.message);
      } finally {
        setFetching(false);
      }
    };

    load();
  }, []);

  //create course
  const createCourse = async () => {
    if (!courseName || !courseCode || !selectedClass || !selectedLecturer) {
      Alert.alert("Missing Info", "Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "courses"), {
      
        courseName,
        courseCode,

        
        classId: selectedClass.id,
        className: selectedClass.className,
        venue: selectedClass.venue,
        day: selectedClass.day,
        time: selectedClass.time,

       
        lecturerId: selectedLecturer.id,
        lecturerName:
          selectedLecturer.username || selectedLecturer.email,

        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Course created successfully");

      // reset form
      setCourseName("");
      setCourseCode("");
      setSelectedClass(null);
      setSelectedLecturer(null);
      setShowClassDropdown(false);
      setShowLecturerDropdown(false);

      // reload courses
      const snap = await getDocs(collection(db, "courses"));
      setCourses(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  
  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.pageTitle}>Courses Management</Text>
          <Text style={styles.pageSub}>
            Create modules • assign lecturers
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}></Text>
        </View>
      </View>

      {/* FORM */}
      <Text style={styles.sectionLabel}>CREATE NEW COURSE</Text>

      <View style={styles.formCard}>
        {/* COURSE NAME */}
        <Text style={styles.fieldLabel}>Course Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Database Systems"
          placeholderTextColor="#475569"
          value={courseName}
          onChangeText={setCourseName}
        />

        {/* COURSE CODE */}
        <Text style={styles.fieldLabel}>Course Code</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. BIS1213"
          placeholderTextColor="#475569"
          value={courseCode}
          onChangeText={setCourseCode}
        />

        
        <Text style={styles.fieldLabel}>Select Class Schedule</Text>

        <TouchableOpacity
          style={styles.dropdownBox}
          onPress={() => {
            setShowClassDropdown(!showClassDropdown);
            setShowLecturerDropdown(false);
          }}
        >
          <Text style={styles.dropdownText}>
            {selectedClass
              ? `${selectedClass.className} (${selectedClass.venue})`
              : "Choose Class Schedule"}
          </Text>

          <Text style={styles.dropdownArrow}>
            {showClassDropdown ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {showClassDropdown &&
          classes.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.optionCard}
              onPress={() => {
                setSelectedClass(item);
                setShowClassDropdown(false);
              }}
            >
              <Text style={styles.cardTitle}>
                {item.className}
              </Text>

              <Text style={styles.cardSub}>
                 {item.venue}
              </Text>

              <Text style={styles.cardSub}>
                 {item.day} •  {item.time}
              </Text>
            </TouchableOpacity>
          ))}

        <Text style={styles.fieldLabel}>Select Lecturer</Text>

        <TouchableOpacity
          style={styles.dropdownBox}
          onPress={() => {
            setShowLecturerDropdown(!showLecturerDropdown);
            setShowClassDropdown(false);
          }}
        >
          <Text style={styles.dropdownText}>
            {selectedLecturer
              ? selectedLecturer.username || selectedLecturer.email
              : "Choose Lecturer"}
          </Text>

          <Text style={styles.dropdownArrow}>
            {showLecturerDropdown ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {showLecturerDropdown &&
          lecturers.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.optionCard}
              onPress={() => {
                setSelectedLecturer(item);
                setShowLecturerDropdown(false);
              }}
            >
              <Text style={styles.cardTitle}>
                {item.username || item.email}
              </Text>
            </TouchableOpacity>
          ))}

       
        <TouchableOpacity
          style={[
            styles.createBtn,
            loading && styles.disabledBtn,
          ]}
          onPress={createCourse}
          disabled={loading}
        >
          <Text style={styles.createBtnText}>
            {loading ? "Saving..." : "+ Create Course"}
          </Text>
        </TouchableOpacity>
      </View>

      
      <Text style={styles.sectionLabel}>CREATED COURSES</Text>

      {courses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No courses created yet
          </Text>
        </View>
      ) : (
        courses.map((item) => (
          <View key={item.id} style={styles.courseCard}>
            <Text style={styles.courseTitle}>
              {item.courseName} ({item.courseCode})
            </Text>

            <Text style={styles.metaText}>
               {item.lecturerName}
            </Text>

            <Text style={styles.metaText}>
               {item.className} • {item.venue}
            </Text>

            <Text style={styles.metaText}>
               {item.day} • ⏰ {item.time}
            </Text>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b18",
    padding: 16,
  },

  center: {
    flex: 1,
    backgroundColor: "#070b18",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#94a3b8",
    marginTop: 10,
    fontSize: 14,
  },

  headerCard: {
    backgroundColor: "#0f172a",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pageTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },

  pageSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0c2d4e",
    justifyContent: "center",
    alignItems: "center",
  },

  headerIconText: {
    fontSize: 18,
  },

  sectionLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },

  formCard: {
    backgroundColor: "#0f172a",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },

  fieldLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
    fontWeight: "500",
  },

  input: {
    backgroundColor: "#111827",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    color: "#f8fafc",
    marginBottom: 8,
    fontSize: 13,
  },

  dropdownBox: {
    backgroundColor: "#111827",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownText: {
    color: "#f8fafc",
    fontSize: 13,
  },

  dropdownArrow: {
    color: "#94a3b8",
    fontSize: 12,
  },

  optionCard: {
    backgroundColor: "#111827",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  cardTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
  },

  cardSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },

  createBtn: {
    backgroundColor: "#2563eb",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  createBtnText: {
    color: "#dbeafe",
    fontWeight: "700",
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },

  courseCard: {
    backgroundColor: "#0f172a",
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  courseTitle: {
    color: "#93c5fd",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },

  metaText: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4,
  },
});
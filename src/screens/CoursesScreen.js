import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const C = {
  navy:    "#0f1f3d",
  navy2:   "#1a2f52",
  navy3:   "#253d66",
  gold:    "#c9a84c",
  white:   "#ffffff",
  bg:      "#f5f7fb",
  card:    "#ffffff",
  border:  "#e4e8f0",
  text:    "#102040",
  muted:   "#6c7a96",
  badge:   "#edf0f7",
  green:   "#16a34a",
  greenBg: "#dcfce7",
};

function Field({ label, value, onChangeText, placeholder }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
        placeholderTextColor={C.muted}
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

function SectionLabel({ text }) {
  return <Text style={s.sectionLabel}>{text}</Text>;
}

function Dropdown({ label, placeholder, selected, open, onToggle, children }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[s.dropdownBox, open && s.dropdownBoxOpen]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={[s.dropdownText, !selected && { color: C.muted }]}>
          {selected || placeholder}
        </Text>
        <Text style={s.dropdownArrow}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>{children}</View>
      )}
    </View>
  );
}

function DropdownOption({ title, sub, onPress }) {
  return (
    <TouchableOpacity style={s.dropdownOption} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.dropdownOptionTitle}>{title}</Text>
      {!!sub && <Text style={s.dropdownOptionSub}>{sub}</Text>}
    </TouchableOpacity>
  );
}

function CourseCard({ item }) {
  return (
    <View style={s.courseCard}>
      <View style={s.courseCardHeader}>
        <View style={s.courseInitials}>
          <Text style={s.courseInitialsText}>
            {(item.courseCode || item.courseName || "CO").slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.courseCardName}>{item.courseName}</Text>
          {!!item.courseCode && (
            <Text style={s.courseCardCode}>{item.courseCode}</Text>
          )}
        </View>
      </View>
      <View style={s.metaRow}>
        {!!item.className && (
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>{item.className}</Text>
          </View>
        )}
        {!!item.venue && (
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>{item.venue}</Text>
          </View>
        )}
        {(item.day || item.time) && (
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>
              {[item.day, item.time].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
        )}
        {!!item.lecturerName && (
          <View style={[s.metaChip, s.metaChipGold]}>
            <Text style={[s.metaChipText, s.metaChipTextGold]}>
              {item.lecturerName}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CoursesScreen() {
  const [role, setRole] = useState(null);
  const [fetching, setFetching]   = useState(true);
  const [loading, setLoading]     = useState(false);

  const [courses, setCourses]     = useState([]);
  const [classes, setClasses]     = useState([]);
  const [lecturers, setLecturers] = useState([]);

  const [courseName, setCourseName]             = useState("");
  const [courseCode, setCourseCode]             = useState("");
  const [selectedClass, setSelectedClass]       = useState(null);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [showClassDrop, setShowClassDrop]       = useState(false);
  const [showLecturerDrop, setShowLecturerDrop] = useState(false);

  // Get user role
  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  // Load all courses (PL sees all, PRL sees all, Lecturer sees own)
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

  // Load classes (only for PL)
  const loadClasses = async () => {
    try {
      const response = await api.get("/courses/classes");
      if (response.data.success) {
        setClasses(response.data.classes);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load classes");
    }
  };

  // Load lecturers (only for PL)
  const loadLecturers = async () => {
    try {
      const response = await api.get("/courses/lecturers");
      if (response.data.success) {
        setLecturers(response.data.lecturers);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load lecturers");
    }
  };

  // Create course (only PL)
  const createCourse = async () => {
    if (!courseName || !courseCode || !selectedClass || !selectedLecturer) {
      return Alert.alert("Missing fields", "Please fill all fields.");
    }

    setLoading(true);
    try {
      const payload = {
        courseName,
        courseCode,
        classId: selectedClass.id,
        className: selectedClass.className,
        venue: selectedClass.venue || "",
        day: selectedClass.day || "",
        time: selectedClass.time || "",
        lecturerId: selectedLecturer.id,
        lecturerName: selectedLecturer.username || selectedLecturer.email,
      };

      const response = await api.post("/courses", payload);
      if (response.data.success) {
        Alert.alert("Success", "Course created successfully.");
        setCourseName("");
        setCourseCode("");
        setSelectedClass(null);
        setSelectedLecturer(null);
        setShowClassDrop(false);
        setShowLecturerDrop(false);
        await loadCourses();
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const userRole = await getUserRole();
      
      // Load courses for everyone
      await loadCourses();
      
      // Only PL can create courses, so only they need classes and lecturers
      if (userRole === "pl") {
        await loadClasses();
        await loadLecturers();
      }
      
      setFetching(false);
    };
    init();
  }, []);

  if (fetching) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  // ========== LECTURER VIEW ==========
  if (role === "lecturer") {
    // Filter courses assigned to this lecturer
    const myCourses = courses.filter(course => course.lecturerId === "test_lecturer_id");
    
    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />

        <View style={s.header}>
          <Text style={s.eyebrow}>Lecturer Portal</Text>
          <Text style={s.headerTitle}>My Courses</Text>
          <Text style={s.headerSub}>Courses assigned to you</Text>
        </View>

        <ScrollView contentContainerStyle={s.body}>
          <SectionLabel text="Assigned Courses" />

          {myCourses.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No courses assigned</Text>
              <Text style={s.emptyText}>
                Your programme leader hasn't assigned any courses to you yet.
              </Text>
            </View>
          ) : (
            myCourses.map((item) => (
              <CourseCard key={item.id} item={item} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ========== PRL VIEW ==========
  if (role === "prl") {
    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />

        <View style={s.header}>
          <Text style={s.eyebrow}>PRL Portal</Text>
          <Text style={s.headerTitle}>All Courses</Text>
          <Text style={s.headerSub}>View all courses and assigned lecturers</Text>
        </View>

        <ScrollView contentContainerStyle={s.body}>
          <SectionLabel text="All Courses in Stream" />

          {courses.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No courses found</Text>
              <Text style={s.emptyText}>No courses have been created yet.</Text>
            </View>
          ) : (
            courses.map((item) => (
              <CourseCard key={item.id} item={item} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ========== PL VIEW (Programme Leader) ==========
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <Text style={s.eyebrow}>Programme Leader</Text>
        <Text style={s.headerTitle}>Courses Management</Text>
        <Text style={s.headerSub}>Create modules and assign lecturers</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormSection title="Create New Course" />
        <View style={s.formCard}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Course Name"
                value={courseName}
                onChangeText={setCourseName}
                placeholder="e.g. Database Systems"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Course Code"
                value={courseCode}
                onChangeText={setCourseCode}
                placeholder="e.g. BIS1213"
              />
            </View>
          </View>

          <Dropdown
            label="Select Class Schedule"
            placeholder="Choose a class"
            selected={selectedClass ? `${selectedClass.className}  ·  ${selectedClass.venue || ""}` : null}
            open={showClassDrop}
            onToggle={() => {
              setShowClassDrop(!showClassDrop);
              setShowLecturerDrop(false);
            }}
          >
            {classes.map((item) => (
              <DropdownOption
                key={item.id}
                title={item.className}
                sub={[item.venue, item.day, item.time].filter(Boolean).join("  ·  ")}
                onPress={() => {
                  setSelectedClass(item);
                  setShowClassDrop(false);
                }}
              />
            ))}
          </Dropdown>

          <Dropdown
            label="Select Lecturer"
            placeholder="Choose a lecturer"
            selected={selectedLecturer ? selectedLecturer.username || selectedLecturer.email : null}
            open={showLecturerDrop}
            onToggle={() => {
              setShowLecturerDrop(!showLecturerDrop);
              setShowClassDrop(false);
            }}
          >
            {lecturers.map((item) => (
              <DropdownOption
                key={item.id}
                title={item.username || item.email}
                sub={item.email}
                onPress={() => {
                  setSelectedLecturer(item);
                  setShowLecturerDrop(false);
                }}
              />
            ))}
          </Dropdown>

          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={createCourse}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={s.submitText}>
              {loading ? "Saving…" : "Create Course"}
            </Text>
          </TouchableOpacity>
        </View>

        <SectionLabel text="Created Courses" />

        {courses.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No courses yet</Text>
            <Text style={s.emptyText}>
              Use the form above to create your first course.
            </Text>
          </View>
        ) : (
          courses.map((item) => (
            <CourseCard key={item.id} item={item} />
          ))
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
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 24,
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
  },

  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
  },

  formSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  formSectionText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.navy,
    textTransform: "uppercase",
    flexShrink: 0,
  },
  formSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },

  formCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
  },

  row: { flexDirection: "row" },

  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
  },

  dropdownBox: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownBoxOpen: {
    borderColor: C.navy,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownText:  { fontSize: 14, color: C.text, flex: 1 },
  dropdownArrow: { fontSize: 10, color: C.muted, marginLeft: 8 },

  dropdownList: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: C.navy,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
    marginBottom: 4,
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  dropdownOptionSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

  submitBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.4,
  },

  courseCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  courseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  courseInitials: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  courseInitialsText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gold,
  },
  courseCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  courseCardCode: {
    fontSize: 12,
    color: C.muted,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    backgroundColor: C.badge,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaChipText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
  },
  metaChipGold: {
    backgroundColor: "#fef9ec",
    borderWidth: 1,
    borderColor: "#f5e2a8",
  },
  metaChipTextGold: {
    color: "#92700a",
  },

  emptyCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
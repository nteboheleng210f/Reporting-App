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
  red:     "#dc2626",
  redBg:   "#fee2e2",
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
      {open && <View style={s.dropdownList}>{children}</View>}
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

// Course card for PRL / Lecturer (read-only)
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
        <View style={[s.metaChip, !!item.lecturerName ? s.metaChipGold : s.metaChipRed]}>
          <Text style={[s.metaChipText, !!item.lecturerName ? s.metaChipTextGold : s.metaChipTextRed]}>
            {item.lecturerName ? `👤 ${item.lecturerName}` : "No lecturer assigned"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Course card for PL (with Manage - Reassign & Delete)
function PLCourseCard({ item, lecturers, onDeleted, onLecturerUpdated }) {
  const [managing, setManaging] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const hasLecturer = !!item.lecturerId;

  // Delete course
  const handleDelete = () => {
    Alert.alert(
      "Delete Course",
      `Are you sure you want to delete "${item.courseName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.delete(`/courses/${item.id}`);
              if (res.data.success) {
                Alert.alert("Success", "Course has been deleted.");
                onDeleted(item.id);
              }
            } catch (err) {
              Alert.alert("Error", err.response?.data?.error || "Failed to delete course");
            } finally {
              setActionLoading(false);
              setManaging(false);
            }
          },
        },
      ]
    );
  };

  // Reassign lecturer (or assign if none)
  const handleReassign = async (lecturer) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/courses/${item.id}/lecturer`, {
        lecturerId: lecturer.id,
        lecturerName: lecturer.username || lecturer.email,
      });
      if (res.data.success) {
        Alert.alert("Success", `Lecturer reassigned to ${lecturer.username || lecturer.email}`);
        onLecturerUpdated(item.id, lecturer.id, lecturer.username || lecturer.email);
        setShowReassign(false);
        setManaging(false);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Failed to reassign lecturer");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={s.courseCard}>
      {/* Header */}
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
        {/* Manage toggle */}
        <TouchableOpacity
          style={s.manageBtn}
          onPress={() => {
            setManaging(!managing);
            setShowReassign(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={s.manageBtnText}>{managing ? "Done" : "Manage"}</Text>
        </TouchableOpacity>
      </View>

      {/* Meta chips */}
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
        <View style={[s.metaChip, hasLecturer ? s.metaChipGold : s.metaChipRed]}>
          <Text style={[s.metaChipText, hasLecturer ? s.metaChipTextGold : s.metaChipTextRed]}>
            {hasLecturer ? `👤 ${item.lecturerName}` : "No lecturer assigned"}
          </Text>
        </View>
      </View>

      {/* Manage panel */}
      {managing && (
        <View style={s.managePanel}>
          {/* Current lecturer info */}
          <View style={s.currentLecturerBox}>
            <Text style={s.currentLecturerLabel}>Currently assigned lecturer</Text>
            <Text style={s.currentLecturerName}>
              {hasLecturer ? item.lecturerName : "None"}
            </Text>
          </View>

          {actionLoading ? (
            <ActivityIndicator size="small" color={C.navy} style={{ marginVertical: 8 }} />
          ) : (
            <>
              {/* Reassign section */}
              {!showReassign ? (
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => setShowReassign(true)}
                  activeOpacity={0.8}
                >
                  <Text style={s.actionBtnText}>
                    {hasLecturer ? "🔄 Reassign Lecturer" : "➕ Assign Lecturer"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={s.reassignList}>
                  <Text style={s.reassignLabel}>Select lecturer:</Text>
                  {lecturers.map((lec) => (
                    <TouchableOpacity
                      key={lec.id}
                      style={[
                        s.reassignOption,
                        item.lecturerId === lec.id && s.reassignOptionActive,
                      ]}
                      onPress={() => handleReassign(lec)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.reassignOptionName}>
                        {lec.username || lec.email}
                        {item.lecturerId === lec.id ? " ✓ (current)" : ""}
                      </Text>
                      <Text style={s.reassignOptionEmail}>{lec.email}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={s.cancelReassignBtn}
                    onPress={() => setShowReassign(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.cancelReassignText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Delete Course button */}
              {!showReassign && (
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnDelete]}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Text style={[s.actionBtnText, s.actionBtnTextDelete]}>
                    🗑 Delete Course
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function CoursesScreen() {
  const [role, setRole] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [lecturers, setLecturers] = useState([]);

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [showClassDrop, setShowClassDrop] = useState(false);
  const [showLecturerDrop, setShowLecturerDrop] = useState(false);

  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  const loadCourses = async () => {
    try {
      const response = await api.get("/courses");
      if (response.data.success) setCourses(response.data.courses);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load courses");
    }
  };

  const loadClasses = async () => {
    try {
      const response = await api.get("/courses/classes");
      if (response.data.success) setClasses(response.data.classes);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load classes");
    }
  };

  const loadLecturers = async () => {
    try {
      const response = await api.get("/courses/lecturers");
      if (response.data.success) setLecturers(response.data.lecturers);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load lecturers");
    }
  };

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

  const handleCourseDeleted = (courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const handleLecturerUpdated = (courseId, lecturerId, lecturerName) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, lecturerId, lecturerName } : c
      )
    );
  };

  useEffect(() => {
    const init = async () => {
      const userRole = await getUserRole();
      await loadCourses();
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

  // Lecturer View
  if (role === "lecturer") {
    const myCourses = courses.filter((c) => c.lecturerId === "test_lecturer_id");
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
            myCourses.map((item) => <CourseCard key={item.id} item={item} />)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // PRL View
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
            courses.map((item) => <CourseCard key={item.id} item={item} />)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // PL View
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
            selected={
              selectedClass
                ? `${selectedClass.className}  ·  ${selectedClass.venue || ""}`
                : null
            }
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
            selected={
              selectedLecturer
                ? selectedLecturer.username || selectedLecturer.email
                : null
            }
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
            <PLCourseCard
              key={item.id}
              item={item}
              lecturers={lecturers}
              onDeleted={handleCourseDeleted}
              onLecturerUpdated={handleLecturerUpdated}
            />
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
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.5)" },

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
  formSectionLine: { flex: 1, height: 1, backgroundColor: C.border },

  formCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
  },

  row: { flexDirection: "row" },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 6 },
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
  dropdownOptionTitle: { fontSize: 14, fontWeight: "600", color: C.text },
  dropdownOptionSub:   { fontSize: 12, color: C.muted, marginTop: 2 },

  submitBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },

  // Course cards
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
  courseInitialsText: { fontSize: 13, fontWeight: "700", color: C.gold },
  courseCardName:     { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  courseCardCode:     { fontSize: 12, color: C.muted },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    backgroundColor: C.badge,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaChipText:     { fontSize: 11, color: C.muted, fontWeight: "500" },
  metaChipGold:     { backgroundColor: "#fef9ec", borderWidth: 1, borderColor: "#f5e2a8" },
  metaChipTextGold: { color: "#92700a" },
  metaChipRed:      { backgroundColor: C.redBg, borderWidth: 1, borderColor: "#fca5a5" },
  metaChipTextRed:  { color: C.red },

  manageBtn: {
    backgroundColor: C.badge,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  manageBtnText: { fontSize: 12, fontWeight: "600", color: C.navy },

  managePanel: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    gap: 8,
  },

  currentLecturerBox: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  currentLecturerLabel: { fontSize: 11, color: C.muted, fontWeight: "600", marginBottom: 4 },
  currentLecturerName:  { fontSize: 14, fontWeight: "700", color: C.text },

  actionBtn: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: C.navy },
  actionBtnDelete: { borderColor: "#fca5a5", backgroundColor: "#fff1f2" },
  actionBtnTextDelete: { color: C.red },

  reassignList: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  reassignLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  reassignOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  reassignOptionActive: { backgroundColor: "#f0f4ff" },
  reassignOptionName:   { fontSize: 14, fontWeight: "600", color: C.text },
  reassignOptionEmail:  { fontSize: 12, color: C.muted, marginTop: 2 },

  cancelReassignBtn: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 12,
    alignItems: "center",
  },
  cancelReassignText: { fontSize: 13, color: C.muted, fontWeight: "600" },

  emptyCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6 },
  emptyText:  { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
});
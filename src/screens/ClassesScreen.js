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
  Modal,
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

const getInitials = (name = "", email = "") => {
  const src = (name || email).trim();
  const parts = src.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

function Field({ label, value, onChangeText, placeholder, editable = true }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, !editable && s.inputReadonly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
        placeholderTextColor={C.muted}
        editable={editable}
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

function ClassCard({ item, isLecturer, isSelected, onAssignPress, onEdit, onDelete, isPL }) {
  return (
    <View style={[s.classCard, isSelected && s.classCardSelected]}>
      <View style={s.classCardHeader}>
        <View style={s.classInitials}>
          <Text style={s.classInitialsText}>
            {(item.className || "CL").slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.classCardName}>{item.className}</Text>
          {!!item.facultyName && (
            <Text style={s.classCardFaculty}>{item.facultyName}</Text>
          )}
          {!!item.semester && (
            <Text style={s.classSemester}>📚 {item.semester}</Text>
          )}
        </View>

        {isLecturer && (
          <View style={s.assignedPill}>
            <Text style={s.assignedPillText}>Assigned</Text>
          </View>
        )}

        {isPL && (
          <View style={s.actionButtons}>
            <TouchableOpacity onPress={() => onEdit(item)} style={s.editBtn}>
              <Text style={s.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item)} style={s.deleteBtn}>
              <Text style={s.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isLecturer && isPL && (
        <TouchableOpacity
          style={[s.assignToggleBtn, isSelected && s.assignToggleBtnActive]}
          onPress={onAssignPress}
          activeOpacity={0.8}
        >
          <Text style={[s.assignToggleText, isSelected && s.assignToggleTextActive]}>
            {isSelected ? "Close student list" : "Assign/Unassign Students →"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StudentRow({ student, isAssigned, onAssign, onUnassign }) {
  const initials = getInitials(student.username, student.email);
  return (
    <View style={s.studentRow}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.studentName}>{student.username || student.email}</Text>
        {student.username && student.email && (
          <Text style={s.studentEmail}>{student.email}</Text>
        )}
      </View>

      {isAssigned ? (
        <TouchableOpacity
          style={[s.assignBtn, s.unassignBtn]}
          onPress={() => onUnassign()}
          activeOpacity={0.8}
        >
          <Text style={[s.assignBtnText, s.unassignBtnText]}>✕ Unassign</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={s.assignBtn}
          onPress={() => onAssign()}
          activeOpacity={0.8}
        >
          <Text style={s.assignBtnText}>✓ Assign</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ClassScheduleScreen() {
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [assignedMap, setAssignedMap] = useState({});

  // Form fields - ONLY Class Name, Faculty, Semester
  const [className, setClassName] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [semester, setSemester] = useState("");

  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [editFacultyName, setEditFacultyName] = useState("");
  const [editSemester, setEditSemester] = useState("");

  const getUserRole = async () => {
    const role = await AsyncStorage.getItem("user_role");
    setUserRole(role || "student");
    return role;
  };

  const loadClasses = async (role) => {
    try {
      const endpoint = role === "lecturer" ? "/classes/mine" : "/classes";
      const response = await api.get(endpoint);
      if (response.data.success) {
        setSchedules(response.data.classes);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load classes");
    }
  };

  const loadStudents = async (classId) => {
    try {
      const response = await api.get(`/classes/${classId}/students`);
      if (response.data.success) {
        setStudents(response.data.students);
        setFilteredStudents(response.data.students);
        const map = {};
        response.data.students.forEach((student) => {
          if (student.assigned) map[student.id] = classId;
        });
        setAssignedMap(map);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load students");
    }
  };

  // Search students
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        (s) =>
          s.username?.toLowerCase().includes(query.toLowerCase()) ||
          s.email?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  };

  // CREATE CLASS - ONLY className, facultyName, semester
  const createClass = async () => {
    if (!className || !facultyName || !semester) {
      return Alert.alert("Missing fields", "Please fill Class Name, Faculty, and Semester.");
    }

    setLoading(true);
    try {
      const response = await api.post("/classes", {
        className,
        facultyName,
        semester,
      });

      if (response.data.success) {
        setSchedules((prev) => [...prev, response.data.class]);
        setClassName("");
        setFacultyName("");
        setSemester("");
        Alert.alert("Success", "Class created successfully.");
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  // Edit class
  const openEditModal = (classItem) => {
    setEditingClass(classItem);
    setEditClassName(classItem.className);
    setEditFacultyName(classItem.facultyName);
    setEditSemester(classItem.semester || "");
    setEditModalVisible(true);
  };

  const updateClass = async () => {
    if (!editClassName || !editFacultyName || !editSemester) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/classes/${editingClass.id}`, {
        className: editClassName,
        facultyName: editFacultyName,
        semester: editSemester,
      });
      if (response.data.success) {
        Alert.alert("Success", "Class updated successfully.");
        setEditModalVisible(false);
        setEditingClass(null);
        const role = await getUserRole();
        await loadClasses(role);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to update class");
    } finally {
      setLoading(false);
    }
  };

  // Delete class
  const deleteClass = (classItem) => {
    Alert.alert("Delete Class", `Delete "${classItem.className}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const response = await api.delete(`/classes/${classItem.id}`);
            if (response.data.success) {
              Alert.alert("Success", "Class deleted successfully.");
              if (selectedClassId === classItem.id) {
                setSelectedClassId(null);
                setSelectedClassName("");
              }
              const role = await getUserRole();
              await loadClasses(role);
            }
          } catch (error) {
            Alert.alert("Error", error.response?.data?.error || "Failed to delete class");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const assignStudent = async (studentId, classId) => {
    try {
      const response = await api.post("/classes/assign", { studentId, classId });
      if (response.data.success) {
        setAssignedMap((prev) => ({ ...prev, [studentId]: classId }));
        Alert.alert("Success", "Student assigned successfully");
        await loadStudents(classId);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to assign student");
    }
  };

  const unassignStudent = async (studentId, classId) => {
    Alert.alert("Unassign Student", "Remove this student from the class?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unassign",
        onPress: async () => {
          try {
            const response = await api.delete(`/classes/students/${studentId}`);
            if (response.data.success) {
              setAssignedMap((prev) => ({ ...prev, [studentId]: null }));
              Alert.alert("Success", "Student unassigned successfully");
              await loadStudents(classId);
            }
          } catch (error) {
            Alert.alert("Error", error.response?.data?.error || "Failed to unassign student");
          }
        },
      },
    ]);
  };

  const handleClassSelect = async (classId, name) => {
    if (selectedClassId === classId) {
      setSelectedClassId(null);
      setSelectedClassName("");
      setSearchQuery("");
    } else {
      setSelectedClassId(classId);
      setSelectedClassName(name);
      setSearchQuery("");
      await loadStudents(classId);
    }
  };

  useEffect(() => {
    const init = async () => {
      const role = await getUserRole();
      await loadClasses(role);
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

  const isLecturer = userRole === "lecturer";
  const isPL = userRole === "pl";

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <Text style={s.eyebrow}>{isLecturer ? "Lecturer Portal" : "Programme Leader"}</Text>
        <Text style={s.headerTitle}>{isLecturer ? "My Classes" : "Class Management"}</Text>
        <Text style={s.headerSub}>
          {isLecturer
            ? "Classes assigned to you by your PL"
            : "Create, edit, and manage classes"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <SectionLabel text={isLecturer ? "Your Assigned Classes" : "All Classes"} />

        {schedules.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>
              {isLecturer ? "No classes assigned yet" : "No classes created yet"}
            </Text>
            <Text style={s.emptyText}>
              {isLecturer
                ? "Your programme leader hasn't assigned any courses to you yet."
                : "Use the form below to create your first class."}
            </Text>
          </View>
        ) : (
          schedules.map((item) => (
            <ClassCard
              key={item.id}
              item={item}
              isLecturer={isLecturer}
              isSelected={selectedClassId === item.id}
              onAssignPress={() => handleClassSelect(item.id, item.className)}
              onEdit={openEditModal}
              onDelete={deleteClass}
              isPL={isPL}
            />
          ))
        )}

        {isPL && selectedClassId && (
          <>
            <SectionLabel text={`Manage Students — ${selectedClassName}`} />

            {/* Search Bar */}
            <View style={s.searchContainer}>
              <TextInput
                style={s.searchInput}
                placeholder="🔍 Search students by name or email..."
                placeholderTextColor={C.muted}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch("")}>
                  <Text style={s.clearSearch}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.studentPanel}>
              <View style={s.panelHeader}>
                <Text style={s.panelHeaderTitle}>Students</Text>
                <Text style={s.panelHeaderCount}>
                  {filteredStudents.length} / {students.length} total
                </Text>
              </View>

              {filteredStudents.length === 0 ? (
                <Text style={s.emptyText}>No students found.</Text>
              ) : (
                filteredStudents.map((st) => (
                  <StudentRow
                    key={st.id}
                    student={st}
                    isAssigned={assignedMap[st.id] === selectedClassId}
                    onAssign={() => assignStudent(st.id, selectedClassId)}
                    onUnassign={() => unassignStudent(st.id, selectedClassId)}
                  />
                ))
              )}
            </View>
          </>
        )}

        {isPL && (
          <>
            <FormSection title="Create New Class" />

            <View style={s.formCard}>
              <Field
                label="Class Name"
                value={className}
                onChangeText={setClassName}
                placeholder="e.g. BSCS Year 3"
              />
              <Field
                label="Faculty"
                value={facultyName}
                onChangeText={setFacultyName}
                placeholder="e.g. FICT"
              />
              <Field
                label="Semester"
                value={semester}
                onChangeText={setSemester}
                placeholder="e.g. Semester 2, 2025"
              />

              <TouchableOpacity
                style={[s.submitBtn, loading && { opacity: 0.6 }]}
                onPress={createClass}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={s.submitText}>{loading ? "Saving…" : "Create Class"}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Class Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Edit Class</Text>

            <Field
              label="Class Name"
              value={editClassName}
              onChangeText={setEditClassName}
              placeholder="Class Name"
            />
            <Field
              label="Faculty"
              value={editFacultyName}
              onChangeText={setEditFacultyName}
              placeholder="Faculty"
            />
            <Field
              label="Semester"
              value={editSemester}
              onChangeText={setEditSemester}
              placeholder="Semester"
            />

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={s.cancelModalBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={s.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.saveModalBtn}
                onPress={updateClass}
                disabled={loading}
              >
                <Text style={s.saveModalBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },

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
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.5)" },

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

  classCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  classCardSelected: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  classCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  classInitials: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  classInitialsText: { fontSize: 13, fontWeight: "700", color: C.gold },
  classCardName: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  classCardFaculty: { fontSize: 12, color: C.muted },
  classSemester: { fontSize: 11, color: C.gold, marginTop: 2 },

  actionButtons: { flexDirection: "row", gap: 8 },
  editBtn: { padding: 6, backgroundColor: C.badge, borderRadius: 8 },
  editBtnText: { fontSize: 14 },
  deleteBtn: { padding: 6, backgroundColor: C.redBg, borderRadius: 8 },
  deleteBtnText: { fontSize: 14 },

  assignedPill: {
    backgroundColor: C.greenBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  assignedPillText: { fontSize: 11, fontWeight: "600", color: C.green },

  assignToggleBtn: {
    backgroundColor: C.badge,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  assignToggleBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  assignToggleText: { fontSize: 12, fontWeight: "600", color: C.navy },
  assignToggleTextActive: { color: C.white },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: C.text },
  clearSearch: { fontSize: 16, color: C.muted, padding: 5 },

  emptyCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  studentPanel: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  panelHeaderTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  panelHeaderCount: { fontSize: 12, color: C.muted },

  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.badge,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 11, fontWeight: "600", color: C.navy },
  studentName: { fontSize: 13, fontWeight: "600", color: C.text },
  studentEmail: { fontSize: 11, color: C.muted, marginTop: 1 },

  assignBtn: {
    backgroundColor: C.navy,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    flexShrink: 0,
  },
  assignBtnText: { fontSize: 12, fontWeight: "600", color: C.white },
  unassignBtn: { backgroundColor: C.redBg },
  unassignBtnText: { color: C.red },

  formSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
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
  inputReadonly: { backgroundColor: C.badge, color: C.muted },

  submitBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    width: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: C.navy,
    marginBottom: 16,
    textAlign: "center",
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelModalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.bg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelModalBtnText: { color: C.muted, fontWeight: "600" },
  saveModalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.navy,
    alignItems: "center",
  },
  saveModalBtnText: { color: C.white, fontWeight: "600" },
});
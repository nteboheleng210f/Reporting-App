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

const getInitials = (name = "", email = "") => {
  const src = (name || email).trim();
  const parts = src.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
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

// ── Class card — PL version (with delete button) ──────────────────────────────
function ClassCard({ item, isLecturer, isSelected, onAssignPress, onDelete }) {
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
        </View>

        {isLecturer && (
          <View style={s.assignedPill}>
            <Text style={s.assignedPillText}>Assigned</Text>
          </View>
        )}

        {/* Delete button — PL only */}
        {!isLecturer && !!onDelete && (
          <TouchableOpacity
            style={s.deleteClassBtn}
            onPress={onDelete}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.deleteClassBtnText}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>

      {(item.venue || item.day || item.time) && (
        <View style={s.metaRow}>
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
        </View>
      )}

      {!isLecturer && (
        <TouchableOpacity
          style={[s.assignToggleBtn, isSelected && s.assignToggleBtnActive]}
          onPress={onAssignPress}
          activeOpacity={0.8}
        >
          <Text style={[s.assignToggleText, isSelected && s.assignToggleTextActive]}>
            {isSelected ? "Close student list" : "Assign students →"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Student row with unassign / reassign support ──────────────────────────────
function StudentRow({ student, isAssigned, currentClassId, onAssign, onUnassign, onReassign }) {
  const initials = getInitials(student.username, student.email);
  const assignedElsewhere = !!student.classId && student.classId !== currentClassId;

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
        {assignedElsewhere && (
          <Text style={s.assignedElsewhereText}>⚠ In another class</Text>
        )}
      </View>

      {isAssigned ? (
        // In this class — Unassign
        <TouchableOpacity style={s.unassignBtn} onPress={onUnassign} activeOpacity={0.8}>
          <Text style={s.unassignBtnText}>Unassign</Text>
        </TouchableOpacity>
      ) : assignedElsewhere ? (
        // In a different class — allow reassign with warning
        <TouchableOpacity style={s.reassignBtn} onPress={onReassign} activeOpacity={0.8}>
          <Text style={s.reassignBtnText}>Move here</Text>
        </TouchableOpacity>
      ) : (
        // Unassigned — plain assign
        <TouchableOpacity style={s.assignBtn} onPress={onAssign} activeOpacity={0.8}>
          <Text style={s.assignBtnText}>Assign</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ClassScheduleScreen() {
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [userRole, setUserRole] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [students, setStudents]   = useState([]);

  const [selectedClassId, setSelectedClassId]     = useState(null);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [assignedMap, setAssignedMap]             = useState({});

  // ── NEW: search state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const [className,   setClassName]   = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [venue,       setVenue]       = useState("");
  const [day,         setDay]         = useState("");
  const [time,        setTime]        = useState("");

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
        // Build map from each student's actual classId (not just current class)
        // so students assigned to OTHER classes also appear correctly
        const map = {};
        response.data.students.forEach(student => {
          if (student.classId) map[student.id] = student.classId;
        });
        setAssignedMap(map);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load students");
    }
  };

  const createClass = async () => {
    if (!className || !facultyName || !venue || !day || !time) {
      return Alert.alert("Missing fields", "Please fill all fields.");
    }
    setLoading(true);
    try {
      const response = await api.post("/classes", {
        className, facultyName, venue, day, time,
      });
      if (response.data.success) {
        setSchedules(prev => [...prev, response.data.class]);
        setClassName(""); setFacultyName("");
        setVenue(""); setDay(""); setTime("");
        Alert.alert("Success", "Class created successfully.");
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  // ── NEW: Delete a class ────────────────────────────────────────────────────
  const handleDeleteClass = (classId, name) => {
    Alert.alert(
      "Delete Class",
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.delete(`/classes/${classId}`);
              if (res.data.success) {
                setSchedules(prev => prev.filter(c => c.id !== classId));
                if (selectedClassId === classId) {
                  setSelectedClassId(null);
                  setSelectedClassName("");
                }
                Alert.alert("Deleted", "Class has been deleted.");
              }
            } catch (err) {
              Alert.alert("Cannot Delete", err.response?.data?.error || "Failed to delete class");
            }
          },
        },
      ]
    );
  };

  const assignStudent = async (studentId, classId) => {
    try {
      const response = await api.post("/classes/assign", { studentId, classId });
      if (response.data.success) {
        setAssignedMap(prev => ({ ...prev, [studentId]: classId }));
        // Update the student's classId in local state too
        setStudents(prev =>
          prev.map(s => s.id === studentId ? { ...s, classId, assigned: true } : s)
        );
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to assign student");
    }
  };

  // ── NEW: Unassign a student ────────────────────────────────────────────────
  // Reassign a student from another class into the currently selected class
  const reassignStudent = (studentId, studentName, classId) => {
    Alert.alert(
      "Move Student",
      `${studentName} is currently in another class. Move them to "${selectedClassName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move",
          onPress: async () => {
            try {
              const response = await api.post("/classes/assign", { studentId, classId });
              if (response.data.success) {
                setAssignedMap(prev => ({ ...prev, [studentId]: classId }));
                setStudents(prev =>
                  prev.map(s => s.id === studentId ? { ...s, classId, assigned: true } : s)
                );
              }
            } catch (error) {
              Alert.alert("Error", error.response?.data?.error || "Failed to move student");
            }
          },
        },
      ]
    );
  };

    const unassignStudent = (studentId, studentName) => {
    Alert.alert(
      "Unassign Student",
      `Remove ${studentName} from this class?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.delete(`/classes/students/${studentId}`);
              if (res.data.success) {
                setAssignedMap(prev => {
                  const next = { ...prev };
                  delete next[studentId];
                  return next;
                });
                setStudents(prev =>
                  prev.map(s =>
                    s.id === studentId ? { ...s, classId: null, assigned: false } : s
                  )
                );
              }
            } catch (err) {
              Alert.alert("Error", err.response?.data?.error || "Failed to unassign student");
            }
          },
        },
      ]
    );
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

  // ── NEW: client-side search filter ────────────────────────────────────────
  const filteredStudents = searchQuery.trim()
    ? students.filter(s => {
        const term = searchQuery.toLowerCase();
        return (
          (s.username || "").toLowerCase().includes(term) ||
          (s.email    || "").toLowerCase().includes(term)
        );
      })
    : students;

  if (fetching) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  const isLecturer = userRole === "lecturer";
  const isPL       = userRole === "pl";

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <Text style={s.eyebrow}>
          {isLecturer ? "Lecturer Portal" : "Programme Leader"}
        </Text>
        <Text style={s.headerTitle}>
          {isLecturer ? "My Classes" : "Class & Timetable"}
        </Text>
        <Text style={s.headerSub}>
          {isLecturer
            ? "Classes assigned to you by your PL"
            : "Create classes and assign students"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel
          text={isLecturer ? "Your Assigned Classes" : "Scheduled Classes"}
        />

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
              onDelete={isPL ? () => handleDeleteClass(item.id, item.className) : null}
            />
          ))
        )}

        {/* ── Student assignment panel ──────────────────────────────────────── */}
        {isPL && selectedClassId && (
          <>
            <SectionLabel text={`Assign Students — ${selectedClassName}`} />

            <View style={s.studentPanel}>
              {/* Panel header with search */}
              <View style={s.panelHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.panelHeaderTitle}>Students</Text>
                  <Text style={s.panelHeaderCount}>
                    {filteredStudents.length} of {students.length} shown
                  </Text>
                </View>
              </View>

              {/* ── NEW: Search bar ─────────────────────────────────────────── */}
              <View style={s.searchBar}>
                <Text style={s.searchIcon}>🔍</Text>
                <TextInput
                  style={s.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by name or email…"
                  placeholderTextColor={C.muted}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.searchClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {filteredStudents.length === 0 ? (
                <Text style={s.noResultsText}>
                  {students.length === 0
                    ? "No students found."
                    : "No students match your search."}
                </Text>
              ) : (
                filteredStudents.map((st) => (
                  <StudentRow
                    key={st.id}
                    student={st}
                    isAssigned={assignedMap[st.id] === selectedClassId}
                    currentClassId={selectedClassId}
                    onAssign={() => assignStudent(st.id, selectedClassId)}
                    onUnassign={() => unassignStudent(st.id, st.username || st.email)}
                    onReassign={() => reassignStudent(st.id, st.username || st.email, selectedClassId)}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* ── Create class form ─────────────────────────────────────────────── */}
        {isPL && (
          <>
            <FormSection title="Create New Class" />

            <View style={s.formCard}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Class Name" value={className} onChangeText={setClassName} placeholder="e.g. BSCSMY1" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Faculty" value={facultyName} onChangeText={setFacultyName} placeholder="e.g. FICT" />
                </View>
              </View>

              <Field label="Venue" value={venue} onChangeText={setVenue} placeholder="e.g. Room 1" />

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Day" value={day} onChangeText={setDay} placeholder="e.g. Monday" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Time" value={time} onChangeText={setTime} placeholder="e.g. 08:00–10:00" />
                </View>
              </View>

              <TouchableOpacity
                style={[s.submitBtn, loading && { opacity: 0.6 }]}
                onPress={createClass}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={s.submitText}>
                  {loading ? "Saving…" : "Create Class"}
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
    color: C.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 10,
  },

  // ── Class card ──────────────────────────────────────────────────────────────
  classCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  classCardSelected: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  classCardHeader:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  classInitials: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: C.navy,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  classInitialsText: { fontSize: 13, fontWeight: "700", color: C.gold },
  classCardName:     { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  classCardFaculty:  { fontSize: 12, color: C.muted },

  assignedPill: {
    backgroundColor: C.greenBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  assignedPillText: { fontSize: 11, fontWeight: "600", color: C.green },

  // ── NEW: delete class button ────────────────────────────────────────────────
  deleteClassBtn: {
    backgroundColor: C.redBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 4,
  },
  deleteClassBtnText: { fontSize: 14 },

  metaRow:      { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  metaChip:     { backgroundColor: C.badge, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  metaChipText: { fontSize: 11, color: C.muted, fontWeight: "500" },

  assignToggleBtn: {
    backgroundColor: C.badge, borderRadius: 8, paddingVertical: 8,
    alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  assignToggleBtnActive:  { backgroundColor: C.navy, borderColor: C.navy },
  assignToggleText:       { fontSize: 12, fontWeight: "600", color: C.navy },
  assignToggleTextActive: { color: C.white },

  emptyCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 28, alignItems: "center", marginBottom: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptyText:  { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  // ── Student panel ───────────────────────────────────────────────────────────
  studentPanel: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, overflow: "hidden", marginBottom: 10,
  },
  panelHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  panelHeaderTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  panelHeaderCount: { fontSize: 11, color: C.muted, marginTop: 2 },

  // ── NEW: search bar ─────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon:  { fontSize: 13, color: C.muted },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 4 },
  searchClear: { fontSize: 12, color: C.muted, paddingLeft: 4 },

  noResultsText: {
    fontSize: 13, color: C.muted, textAlign: "center",
    padding: 20, lineHeight: 20,
  },

  // ── Student row ─────────────────────────────────────────────────────────────
  studentRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 10,
  },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.badge,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText:  { fontSize: 11, fontWeight: "600", color: C.navy },
  studentName: { fontSize: 13, fontWeight: "600", color: C.text },
  studentEmail:{ fontSize: 11, color: C.muted, marginTop: 1 },

  assignedElsewhereText: { fontSize: 11, color: C.gold, marginTop: 2, fontWeight: "500" },

  // Assign button
  assignBtn:             { backgroundColor: C.navy, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, flexShrink: 0 },
  reassignBtn:           { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, flexShrink: 0 },
  assignBtnText:         { fontSize: 12, fontWeight: "600", color: C.white },
  reassignBtnText:       { fontSize: 12, fontWeight: "600", color: "#92400e" },

  // ── NEW: Unassign button ────────────────────────────────────────────────────
  unassignBtn:     { backgroundColor: C.redBg, borderWidth: 1, borderColor: "#fca5a5", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, flexShrink: 0 },
  unassignBtnText: { fontSize: 12, fontWeight: "600", color: C.red },

  // ── Form ────────────────────────────────────────────────────────────────────
  formSection: {
    flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 12, gap: 10,
  },
  formSectionText: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1,
    color: C.navy, textTransform: "uppercase", flexShrink: 0,
  },
  formSectionLine: { flex: 1, height: 1, backgroundColor: C.border },

  formCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16,
  },
  row: { flexDirection: "row" },

  field:      { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 6 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },

  submitBtn: {
    backgroundColor: C.navy, borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 4,
  },
  submitText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },
});
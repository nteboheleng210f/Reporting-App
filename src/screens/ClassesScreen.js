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

function ClassCard({ item, isLecturer, isSelected, onAssignPress }) {
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

function StudentRow({ student, isAssigned, onAssign }) {
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

      <TouchableOpacity
        style={[s.assignBtn, isAssigned && s.assignBtnDone]}
        onPress={() => !isAssigned && onAssign()}
        disabled={isAssigned}
        activeOpacity={0.8}
      >
        <Text style={[s.assignBtnText, isAssigned && s.assignBtnTextDone]}>
          {isAssigned ? "✓ Assigned" : "Assign"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ClassScheduleScreen() {
  const [fetching, setFetching]   = useState(true);
  const [loading, setLoading]     = useState(false);
  const [userRole, setUserRole]   = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [students, setStudents]   = useState([]);

  const [selectedClassId, setSelectedClassId]     = useState(null);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [assignedMap, setAssignedMap]             = useState({});

  const [className,   setClassName]   = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [venue,       setVenue]       = useState("");
  const [day,         setDay]         = useState("");
  const [time,        setTime]        = useState("");

  // Get user role
  const getUserRole = async () => {
    const role = await AsyncStorage.getItem("user_role");
    setUserRole(role || "student");
    return role;
  };

  // Load classes
  const loadClasses = async () => {
    try {
      const response = await api.get("/classes");
      if (response.data.success) {
        setSchedules(response.data.classes);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load classes");
    }
  };

  // Load students (for PL only)
  const loadStudents = async (classId) => {
    try {
      const response = await api.get(`/classes/${classId}/students`);
      if (response.data.success) {
        setStudents(response.data.students);
        
        const map = {};
        response.data.students.forEach(student => {
          if (student.assigned) map[student.id] = classId;
        });
        setAssignedMap(map);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load students");
    }
  };

  // Create new class
  const createClass = async () => {
    if (!className || !facultyName || !venue || !day || !time) {
      return Alert.alert("Missing fields", "Please fill all fields.");
    }

    setLoading(true);
    try {
      const response = await api.post("/classes", {
        className,
        facultyName,
        venue,
        day,
        time
      });

      if (response.data.success) {
        setSchedules(prev => [...prev, response.data.class]);
        setClassName("");
        setFacultyName("");
        setVenue("");
        setDay("");
        setTime("");
        Alert.alert("Success", "Class created successfully.");
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  // Assign student to class
  const assignStudent = async (studentId, classId) => {
    try {
      const response = await api.post("/classes/assign", { studentId, classId });
      if (response.data.success) {
        setAssignedMap(prev => ({ ...prev, [studentId]: classId }));
        Alert.alert("Success", "Student assigned successfully");
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to assign student");
    }
  };

  // Handle class selection (for PL)
  const handleClassSelect = async (classId, className) => {
    if (selectedClassId === classId) {
      setSelectedClassId(null);
      setSelectedClassName("");
    } else {
      setSelectedClassId(classId);
      setSelectedClassName(className);
      await loadStudents(classId);
    }
  };

  // Initialize
  useEffect(() => {
    const init = async () => {
      const role = await getUserRole();
      await loadClasses();
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
      >
        <SectionLabel text={isLecturer ? "Your Assigned Courses" : "Scheduled Classes"} />

        {schedules.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>
              {isLecturer ? "No courses assigned yet" : "No classes created yet"}
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
            />
          ))
        )}

        {!isLecturer && isPL && selectedClassId && (
          <>
            <SectionLabel text={`Assign Students — ${selectedClassName}`} />

            <View style={s.studentPanel}>
              <View style={s.panelHeader}>
                <Text style={s.panelHeaderTitle}>Available Students</Text>
                <Text style={s.panelHeaderCount}>{students.length} total</Text>
              </View>

              {students.length === 0 ? (
                <Text style={s.emptyText}>No students found.</Text>
              ) : (
                students.map((st) => (
                  <StudentRow
                    key={st.id}
                    student={st}
                    isAssigned={assignedMap[st.id] === selectedClassId}
                    onAssign={() => assignStudent(st.id, selectedClassId)}
                  />
                ))
              )}
            </View>
          </>
        )}

        {!isLecturer && isPL && (
          <>
            <FormSection title="Create New Class" />

            <View style={s.formCard}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Class Name"
                    value={className}
                    onChangeText={setClassName}
                    placeholder="e.g. BSCSMY1"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field
                    label="Faculty"
                    value={facultyName}
                    onChangeText={setFacultyName}
                    placeholder="e.g. FICT"
                  />
                </View>
              </View>

              <Field
                label="Venue"
                value={venue}
                onChangeText={setVenue}
                placeholder="e.g. Room 1"
              />

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Day"
                    value={day}
                    onChangeText={setDay}
                    placeholder="e.g. Monday"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field
                    label="Time"
                    value={time}
                    onChangeText={setTime}
                    placeholder="e.g. 08:00–10:00"
                  />
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

  classCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  classCardSelected: {
    borderColor: C.navy,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
  },
  classCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  classInitials: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  classInitialsText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gold,
  },
  classCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  classCardFaculty: {
    fontSize: 12,
    color: C.muted,
  },
  assignedPill: {
    backgroundColor: C.greenBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  assignedPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.green,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
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

  assignToggleBtn: {
    backgroundColor: C.badge,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  assignToggleBtnActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  assignToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.navy,
  },
  assignToggleTextActive: {
    color: C.white,
  },

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
  emptyText: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },

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
  panelHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
  },
  panelHeaderCount: {
    fontSize: 12,
    color: C.muted,
  },

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
  avatarText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.navy,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
  },
  studentEmail: {
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
  },
  assignBtn: {
    backgroundColor: C.navy,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    flexShrink: 0,
  },
  assignBtnDone: {
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  assignBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.white,
  },
  assignBtnTextDone: {
    color: C.green,
  },

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
});
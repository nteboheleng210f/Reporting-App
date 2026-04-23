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
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

// =========================
// INITIALS HELPER
// =========================
const getInitials = (name = "", email = "") => {
  const src = name || email;
  const parts = src.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

export default function ClassScheduleScreen() {

  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);

  const [schedules, setSchedules] = useState([]);
  const [students, setStudents]   = useState([]);

  const [selectedClassId, setSelectedClassId]     = useState(null);
  const [selectedClassName, setSelectedClassName] = useState("");

  // track which students have been assigned
  const [assignedMap, setAssignedMap] = useState({});

  // FORM
  const [className,   setClassName]   = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [venue,       setVenue]       = useState("");
  const [day,         setDay]         = useState("");
  const [time,        setTime]        = useState("");

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    const loadData = async () => {
      try {
        const classSnap = await getDocs(collection(db, "classSchedules"));
        setSchedules(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const userSnap = await getDocs(collection(db, "users"));
        const studentList = userSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === "student");
        setStudents(studentList);

        // pre-fill assignedMap from existing classId values
        const map = {};
        studentList.forEach((s) => {
          if (s.classId) map[s.id] = s.classId;
        });
        setAssignedMap(map);

      } catch (error) {
        Alert.alert("Error", error.message);
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, []);

  // =========================
  // CREATE CLASS
  // =========================
  const createSchedule = async () => {
    if (!className || !facultyName || !venue || !day || !time) {
      Alert.alert("Missing Info", "Please fill all fields");
      return;
    }
    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, "classSchedules"), {
        className,
        facultyName,
        venue,
        day,
        time,
        createdAt: new Date().toISOString(),
      });
      setSchedules((prev) => [
        ...prev,
        { id: docRef.id, className, facultyName, venue, day, time },
      ]);
      setClassName("");
      setFacultyName("");
      setVenue("");
      setDay("");
      setTime("");
      Alert.alert("Success", "Class created successfully");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ASSIGN STUDENT
  // =========================
  const assignStudent = async (studentId, classId) => {
    try {
      await updateDoc(doc(db, "users", studentId), { classId });
      setAssignedMap((prev) => ({ ...prev, [studentId]: classId }));
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // =========================
  // LOADING STATE
  // =========================
  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* ── PAGE HEADER ── */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Class &amp; Timetable</Text>
          <Text style={styles.pageSub}>Create classes · assign students</Text>
        </View>
        <View style={styles.pageIcon}>
          <Text style={styles.pageIconText}>📅</Text>
        </View>
      </View>

      {/* ── FORM ── */}
      <Text style={styles.sectionLabel}>CREATE NEW CLASS</Text>
      <View style={styles.formCard}>

        <View style={styles.row2}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Class name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS301"
              placeholderTextColor="#334155"
              value={className}
              onChangeText={setClassName}
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Faculty name</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr. Mokoena"
              placeholderTextColor="#334155"
              value={facultyName}
              onChangeText={setFacultyName}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Venue</Text>
        <TextInput
          style={styles.input}
          placeholder="Room A-204"
          placeholderTextColor="#334155"
          value={venue}
          onChangeText={setVenue}
        />

        <View style={styles.row2}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Day</Text>
            <TextInput
              style={styles.input}
              placeholder="Monday"
              placeholderTextColor="#334155"
              value={day}
              onChangeText={setDay}
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput
              style={styles.input}
              placeholder="08:00 – 10:00"
              placeholderTextColor="#334155"
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={createSchedule}
          disabled={loading}
        >
          <Text style={styles.createBtnText}>
            {loading ? "Saving..." : "+ Create class"}
          </Text>
        </TouchableOpacity>

      </View>

      {/* ── CLASS LIST ── */}
      {schedules.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>SCHEDULED CLASSES</Text>
          {schedules.map((item) => {
            const isActive = selectedClassId === item.id;
            return (
              <View
                key={item.id}
                style={[styles.classCard, isActive && styles.classCardActive]}
              >
                <View style={styles.classCardTop}>
                  <Text style={styles.classCardName}>{item.className}</Text>
                  {isActive && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>Selected</Text>
                    </View>
                  )}
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaChip}>👨‍🏫 {item.facultyName}</Text>
                  <Text style={styles.metaChip}>📅 {item.day} · {item.time}</Text>
                  <Text style={styles.metaChip}>🏫 {item.venue}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.assignClassBtn, isActive && styles.assignClassBtnActive]}
                  onPress={() => {
                    if (isActive) {
                      setSelectedClassId(null);
                      setSelectedClassName("");
                    } else {
                      setSelectedClassId(item.id);
                      setSelectedClassName(item.className);
                    }
                  }}
                >
                  <Text style={[styles.assignClassBtnText, isActive && styles.assignClassBtnTextActive]}>
                    {isActive ? "Close student list" : "Assign students"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}

      {/* ── STUDENT ASSIGNMENT PANEL ── */}
      {selectedClassId && (
        <>
          <Text style={styles.sectionLabel}>
            ASSIGN STUDENTS — {selectedClassName}
          </Text>

          <View style={styles.studentPanel}>

            {/* Panel header */}
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeaderTitle}>Available students</Text>
              <Text style={styles.panelHeaderCount}>{students.length} students</Text>
            </View>

            {students.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            ) : (
              students.map((s) => {
                const isAssigned = assignedMap[s.id] === selectedClassId;
                const initials = getInitials(s.username, s.email);
                return (
                  <View key={s.id} style={styles.studentRow}>

                    {/* Avatar */}
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>{initials}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>
                        {s.username || s.email}
                      </Text>
                      {s.username && s.email ? (
                        <Text style={styles.studentEmail}>{s.email}</Text>
                      ) : null}
                    </View>

                    {/* Assign button */}
                    <TouchableOpacity
                      style={[
                        styles.assignBtn,
                        isAssigned && styles.assignBtnDone,
                      ]}
                      onPress={() =>
                        !isAssigned && assignStudent(s.id, selectedClassId)
                      }
                      disabled={isAssigned}
                    >
                      <Text
                        style={[
                          styles.assignBtnText,
                          isAssigned && styles.assignBtnTextDone,
                        ]}
                      >
                        {isAssigned ? "Assigned" : "Assign"}
                      </Text>
                    </TouchableOpacity>

                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// =========================
// STYLES
// =========================
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
    gap: 12,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
  },

  // ── Page header
  pageHeader: {
    backgroundColor: "#0f172a",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    color: "#f1f5f9",
    fontSize: 17,
    fontWeight: "700",
  },
  pageSub: {
    color: "#475569",
    fontSize: 12,
    marginTop: 2,
  },
  pageIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#0c2d4e",
    alignItems: "center",
    justifyContent: "center",
  },
  pageIconText: {
    fontSize: 18,
  },

  // ── Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Form card
  formCard: {
    backgroundColor: "#0f172a",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  row2: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 0,
  },
  fieldWrap: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#111827",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#f1f5f9",
    marginBottom: 8,
  },
  createBtn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Class card
  classCard: {
    backgroundColor: "#0f172a",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  classCardActive: {
    borderLeftColor: "#16a34a",
    backgroundColor: "#0a1f10",
  },
  classCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  classCardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#93c5fd",
  },
  selectedBadge: {
    backgroundColor: "#052e16",
    borderWidth: 0.5,
    borderColor: "#166534",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  selectedBadgeText: {
    fontSize: 10,
    color: "#4ade80",
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  metaChip: {
    fontSize: 11,
    color: "#475569",
  },
  assignClassBtn: {
    backgroundColor: "#0f2d18",
    borderWidth: 0.5,
    borderColor: "#166534",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  assignClassBtnActive: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  assignClassBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4ade80",
  },
  assignClassBtnTextActive: {
    color: "#64748b",
  },

  // ── Student panel
  studentPanel: {
    backgroundColor: "#0f172a",
    borderWidth: 0.5,
    borderColor: "#1e293b",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1e293b",
  },
  panelHeaderTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#f1f5f9",
  },
  panelHeaderCount: {
    fontSize: 11,
    color: "#475569",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#475569",
    fontSize: 13,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#0f172a",
  },
  studentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1a1040",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  studentAvatarText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#a5b4fc",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    color: "#f1f5f9",
  },
  studentEmail: {
    fontSize: 11,
    color: "#475569",
    marginTop: 1,
  },
  assignBtn: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  assignBtnDone: {
    backgroundColor: "#052e16",
    borderWidth: 0.5,
    borderColor: "#166534",
  },
  assignBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#bfdbfe",
  },
  assignBtnTextDone: {
    color: "#4ade80",
  },
});
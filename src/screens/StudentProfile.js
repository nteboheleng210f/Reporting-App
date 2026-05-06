import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const C = {
  navy:    "#0f1f3d",
  navy2:   "#1a2f52",
  gold:    "#c9a84c",
  white:   "#ffffff",
  bg:      "#f5f7fb",
  card:    "#ffffff",
  border:  "#e4e8f0",
  text:    "#102040",
  muted:   "#6c7a96",
  badge:   "#edf0f7",
  empty:   "#f0f4ff",
  green:   "#16a34a", greenBg: "#dcfce7",
};

function SectionLabel({ text }) {
  return <Text style={s.sectionLabel}>{text}</Text>;
}

function InfoRow({ label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || "—"}</Text>
    </View>
  );
}

function CourseCard({ item }) {
  const initial = (item.lecturerName || "L")[0].toUpperCase();
  return (
    <View style={s.courseCard}>
      <View style={s.courseLeft}>
        <Text style={s.courseName}>{item.courseName}</Text>
        <View style={s.courseMetaRow}>
          <View style={s.codeBadge}>
            <Text style={s.codeBadgeText}>{item.courseCode}</Text>
          </View>
          {!!item.venue && (
            <Text style={s.courseMeta}>{item.venue}</Text>
          )}
          {!!item.day && (
            <Text style={s.courseMeta}>{item.day} {item.time}</Text>
          )}
        </View>
      </View>

      
      <View style={s.lecturerBlock}>
        <View style={s.lecturerAvatar}>
          <Text style={s.lecturerAvatarText}>{initial}</Text>
        </View>
        <Text style={s.lecturerName} numberOfLines={1}>
          {item.lecturerName || "Not assigned"}
        </Text>
      </View>
    </View>
  );
}

export default function StudentProfile({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    className: "",
    semester: "",
    classId: "",
  });
  const [courses, setCourses] = useState([]);

  const loadProfile = async () => {
    try {
      // Get basic info from AsyncStorage first (fast)
      const userData = await AsyncStorage.getItem("user_data");
      if (userData) {
        const user = JSON.parse(userData);
        setProfile(prev => ({
          ...prev,
          name:  user.username || user.email || "Student",
          email: user.email || "",
          phone: user.phone || "",
        }));
      }

      // Get full profile from backend (classId, className, semester)
      const statsRes = await api.get("/student/stats");
      if (statsRes.data.success) {
        const { user } = statsRes.data;
        setProfile(prev => ({
          ...prev,
          classId:   user?.classId   || "",
          className: user?.className || "",
          semester:  user?.semester  || "",
        }));
      }

      
      const coursesRes = await api.get("/courses");
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.courses);
      }
    } catch (error) {
      console.log("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={s.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const initials = (profile.name || "S")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView showsVerticalScrollIndicator={false}>

      
        <View style={s.header}>
          <Text style={s.eyebrow}>Student</Text>
          <Text style={s.headerTitle}>My Profile</Text>
          <Text style={s.headerSub}>Your academic information</Text>
        </View>

        <View style={s.body}>

         
          <View style={s.avatarSection}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={s.profileName}>{profile.name}</Text>
            <Text style={s.profileEmail}>{profile.email}</Text>

            <View style={[
              s.statusBadge,
              profile.classId ? s.badgeAssigned : s.badgePending
            ]}>
              <Text style={[
                s.statusBadgeText,
                profile.classId ? s.badgeAssignedText : s.badgePendingText
              ]}>
                {profile.classId ? "Enrolled" : " Pending Assignment"}
              </Text>
            </View>
          </View>

          {/* ── Personal info ── */}
          <SectionLabel text="Personal Information" />
          <View style={s.infoCard}>
            <InfoRow label="Full Name"    value={profile.name} />
            <View style={s.divider} />
            <InfoRow label="Email"        value={profile.email} />
            <View style={s.divider} />
            <InfoRow label="Phone"        value={profile.phone} />
          </View>

          {/* ── Academic info ── */}
          <SectionLabel text="Academic Information" />
          <View style={s.infoCard}>
            <InfoRow label="Class"        value={profile.className} />
            <View style={s.divider} />
            <InfoRow label="Semester"     value={profile.semester} />
            <View style={s.divider} />
            <InfoRow label="Student ID"   value={profile.classId ? "Enrolled" : "Not assigned"} />
          </View>

          {/* ── Courses & lecturers ── */}
          <SectionLabel text="My Courses & Lecturers" />

          {courses.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyIcon}></Text>
              <Text style={s.emptyTitle}>No Courses Yet</Text>
              <Text style={s.emptySubtitle}>
                Courses will appear here once your programme leader assigns you to a class.
              </Text>
            </View>
          ) : (
            courses.map(item => (
              <CourseCard key={item.id} item={item} />
            ))
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  loadingText: { color: C.muted, fontSize: 14, marginTop: 10 },

  // ── Header ───────────────────────────────────────────────────────────────────
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

  // ── Avatar section ────────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.navy, alignItems: "center",
    justifyContent: "center", marginBottom: 12,
    borderWidth: 3, borderColor: C.gold,
  },
  avatarText:   { fontSize: 28, fontWeight: "700", color: C.gold },
  profileName:  { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: C.muted, marginBottom: 12 },

  statusBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  badgeAssigned:     { backgroundColor: C.greenBg, borderColor: "#bbf7d0" },
  badgePending:      { backgroundColor: "#fef9ec", borderColor: "#fde68a" },
  statusBadgeText:   { fontSize: 12, fontWeight: "600" },
  badgeAssignedText: { color: C.green },
  badgePendingText:  { color: "#d97706" },

  // ── Section label ─────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase",
    marginTop: 20, marginBottom: 10,
  },

  infoCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 16,
  },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: "500" },
  infoValue: { fontSize: 13, color: C.text,  fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 16 },
  divider:   { height: 1, backgroundColor: C.border, marginHorizontal: 16 },


  courseCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  courseLeft:    { flex: 1 },
  courseName:    { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 6 },
  courseMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  codeBadge: {
    backgroundColor: C.badge, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  codeBadgeText: { fontSize: 10, fontWeight: "600", color: C.navy, letterSpacing: 0.5 },
  courseMeta:    { fontSize: 11, color: C.muted },

  lecturerBlock: { alignItems: "center", gap: 6, minWidth: 70 },
  lecturerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.navy, alignItems: "center", justifyContent: "center",
  },
  lecturerAvatarText: { fontSize: 14, fontWeight: "700", color: C.gold },
  lecturerName:       { fontSize: 11, color: C.muted, textAlign: "center", maxWidth: 70 },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 28, alignItems: "center",
  },
  emptyIcon:     { fontSize: 32, marginBottom: 10 },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
});
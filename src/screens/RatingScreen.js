import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const C = {
  navy:   "#0f1f3d",
  navy2:  "#1a2f52",
  gold:   "#c9a84c",
  white:  "#ffffff",
  bg:     "#f5f7fb",
  card:   "#ffffff",
  border: "#e4e8f0",
  text:   "#102040",
  muted:  "#6c7a96",
  badge:  "#edf0f7",
  empty:  "#f0f4ff",
  green:  "#16a34a", greenBg: "#dcfce7",
  red:    "#dc2626", redBg:   "#fee2e2",
};

function StarPicker({ value, onChange }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[s.star, n <= value && s.starActive]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}


function CourseCard({ item, selected, onPress, canRate }) {
  return (
    <TouchableOpacity
      style={[
        s.courseCard,
        selected && s.courseCardSelected,
        !canRate && s.courseCardLocked,
      ]}
      onPress={canRate ? onPress : null}
      activeOpacity={canRate ? 0.8 : 1}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.courseTitle}>{item.courseName}</Text>

        <View style={s.lecturerRow}>
          <View style={s.lecturerAvatar}>
            <Text style={s.lecturerAvatarText}>
              {(item.lecturerName || "L")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lecturerName}>
              {item.lecturerName || "No lecturer assigned"}
            </Text>
            <View style={s.courseMetaRow}>
              <View style={s.codeBadge}>
                <Text style={s.codeBadgeText}>{item.courseCode}</Text>
              </View>
              {!!item.className && (
                <Text style={s.courseLecturer}>{item.className}</Text>
              )}
            </View>
          </View>
        </View>

       
        {!canRate && (
          <View style={s.lockBanner}>
            <Text style={s.lockText}>
               Attend at least one class to unlock rating
            </Text>
          </View>
        )}
      </View>

      {selected && canRate && (
        <View style={s.checkCircle}>
          <Text style={s.checkMark}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function RatingCard({ item }) {
  const initials = (item.studentName || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;
  return (
    <View style={s.ratingCard}>
      <View style={s.ratingTop}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.studentName}>{item.studentName || "Student"}</Text>
          <Text style={s.ratingMeta}>{item.courseName}</Text>
        </View>
        <View style={s.ratingBadge}>
          <Text style={s.ratingBadgeNum}>{item.rating}</Text>
          <Text style={s.ratingBadgeStar}>★</Text>
        </View>
      </View>
      <View style={s.miniStarRow}>
        {[1,2,3,4,5].map(n => (
          <Text key={n} style={[s.miniStar, n <= item.rating ? s.miniStarLit : s.miniStarDim]}>★</Text>
        ))}
      </View>
      {!!item.comment && <Text style={s.comment}>{item.comment}</Text>}
      {!!dateStr && <Text style={s.dateText}>{dateStr}</Text>}
    </View>
  );
}

function AverageBlock({ average, count }) {
  const rounded = parseFloat(average) || 0;
  return (
    <View style={s.avgBlock}>
      <Text style={s.avgScore}>{average ?? "–"}</Text>
      <View style={{ flexDirection: "column", gap: 4 }}>
        <View style={s.avgStarRow}>
          {[1,2,3,4,5].map(n => (
            <Text key={n} style={[s.avgStar, n <= Math.round(rounded) ? s.avgStarLit : s.avgStarDim]}>★</Text>
          ))}
        </View>
        <Text style={s.avgCount}>{count} {count === 1 ? "review" : "reviews"}</Text>
      </View>
    </View>
  );
}

function SectionLabel({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={s.emptyCard}>
      {!!icon && <Text style={s.emptyIcon}>{icon}</Text>}
      <Text style={s.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={s.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}


function ConfirmModal({ visible, course, rating, comment, onConfirm, onCancel, submitting }) {
  if (!course) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>Confirm Your Rating</Text>
          <Text style={s.modalSub}>Review before submitting</Text>

          <View style={s.modalRow}>
            <Text style={s.modalLabel}>Course</Text>
            <Text style={s.modalValue}>{course.courseName}</Text>
          </View>
          <View style={s.modalRow}>
            <Text style={s.modalLabel}>Lecturer</Text>
            <Text style={s.modalValue}>{course.lecturerName || "Unknown"}</Text>
          </View>
          <View style={s.modalRow}>
            <Text style={s.modalLabel}>Rating</Text>
            <View style={s.modalStarRow}>
              {[1,2,3,4,5].map(n => (
                <Text key={n} style={[s.modalStar, n <= rating ? s.modalStarLit : s.modalStarDim]}>★</Text>
              ))}
              <Text style={s.modalRatingNum}>{rating}/5</Text>
            </View>
          </View>
          {!!comment && (
            <View style={s.modalRow}>
              <Text style={s.modalLabel}>Comment</Text>
              <Text style={s.modalValue}>{comment}</Text>
            </View>
          )}

          <View style={s.modalBtns}>
            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={onCancel}
              disabled={submitting}
            >
              <Text style={s.modalCancelText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalConfirmBtn, submitting && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={submitting}
            >
              <Text style={s.modalConfirmText}>
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


export default function RatingScreen() {
  const [role, setRole]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [courses, setCourses]             = useState([]);
  const [attendedCourseIds, setAttendedCourseIds] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lecturerRatingsList, setLecturerRatingsList] = useState([]);
  const [allRatings, setAllRatings]       = useState([]);
  const [rating, setRating]               = useState(0);
  const [comment, setComment]             = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

 
  const loadStudentData = async () => {
    try {
      const [coursesRes, attendanceRes] = await Promise.all([
        api.get("/ratings/courses"),
        api.get("/attendance/student"),
      ]);

      if (coursesRes.data.success) setCourses(coursesRes.data.courses);

     
      if (attendanceRes.data.success) {
        const ids = new Set(
          attendanceRes.data.attendance
            .map(a => a.courseId)
            .filter(Boolean)
        );
        setAttendedCourseIds(ids);
      }
    } catch (error) {
      console.log("Failed to load student data:", error);
    }
  };

  const loadAllRatings = async () => {
    try {
      const response = await api.get("/ratings/all");
      if (response.data.success) setAllRatings(response.data.ratings);
    } catch (error) { console.log("Failed to load all ratings:", error); }
  };

  const loadLecturerRatings = async () => {
    try {
      const response = await api.get("/ratings/lecturer/me");
      if (response.data.success) setLecturerRatingsList(response.data.ratings);
    } catch (error) { console.log("Failed to load lecturer ratings:", error); }
  };


  const handleSubmitPress = () => {
    if (!selectedCourse) return Alert.alert("Select Course", "Please choose a course first.");
    if (!rating)         return Alert.alert("Rating Required", "Please select a star rating.");
    setShowConfirm(true);
  };

  const submitRating = async () => {
    setSubmitting(true);
    try {
      const response = await api.post("/ratings", {
        lecturerId:   selectedCourse.lecturerId,
        lecturerName: selectedCourse.lecturerName,
        courseName:   selectedCourse.courseName,
        courseCode:   selectedCourse.courseCode,
        classId:      selectedCourse.classId,
        className:    selectedCourse.className,
        rating,
        comment: comment.trim(),
      });

      if (response.data.success) {
        setShowConfirm(false);
        Alert.alert("✓ Submitted", "Your rating has been submitted. Thank you!");
        setSelectedCourse(null);
        setRating(0);
        setComment("");
      }
    } catch (error) {
      setShowConfirm(false);
      Alert.alert("Error", error.response?.data?.error || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userRole = await getUserRole();
      if (userRole === "student")                       await loadStudentData();
      else if (userRole === "lecturer")                 await loadLecturerRatings();
      else if (userRole === "prl" || userRole === "pl") await loadAllRatings();
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  if (role === "student") {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />


        <ConfirmModal
          visible={showConfirm}
          course={selectedCourse}
          rating={rating}
          comment={comment}
          onConfirm={submitRating}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />

        <View style={s.header}>
          <Text style={s.eyebrow}>Feedback</Text>
          <Text style={s.headerTitle}>Rate Your Lecturer</Text>
          <Text style={s.headerSub}>Choose a course and share your feedback</Text>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <SectionLabel text="Your Courses" />

          {courses.length === 0 ? (
            <EmptyState
              icon=""
              title="No Courses Yet"
              subtitle="You haven't been assigned to any courses yet."
            />
          ) : (
            courses.map((item) => {
           
              const canRate = attendedCourseIds.has(item.id);
              return (
                <CourseCard
                  key={item.id}
                  item={item}
                  selected={selectedCourse?.id === item.id}
                  onPress={() => setSelectedCourse(item)}
                  canRate={canRate}
                />
              );
            })
          )}

          {selectedCourse && (
            <>
              <View style={s.selectedSummary}>
                <Text style={s.selectedSummaryLabel}>Selected</Text>
                <Text style={s.selectedSummaryTitle}>{selectedCourse.courseName}</Text>
                <Text style={s.selectedSummaryMeta}>
                  Lecturer: {selectedCourse.lecturerName || "Unknown"}
                </Text>
              </View>

              <SectionLabel text="Your Rating" />
              <View style={s.starCard}>
                <StarPicker value={rating} onChange={setRating} />
              </View>

              <SectionLabel text="Comment (optional)" />
              <TextInput
                style={s.input}
                multiline
                numberOfLines={4}
                placeholder="Share your feedback…"
                placeholderTextColor={C.muted}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />

      
              <TouchableOpacity
                style={[s.submitBtn, !rating && { opacity: 0.5 }]}
                onPress={handleSubmitPress}
                disabled={!rating}
                activeOpacity={0.85}
              >
                <Text style={s.submitText}>Review & Submit →</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }


  if (role === "lecturer") {
    const average = lecturerRatingsList.length > 0
      ? (lecturerRatingsList.reduce((sum, r) => sum + r.rating, 0) / lecturerRatingsList.length).toFixed(1)
      : null;

    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <Text style={s.eyebrow}>Lecturer Portal</Text>
          <Text style={s.headerTitle}>My Ratings</Text>
          <Text style={s.headerSub}>Feedback from your students</Text>
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {lecturerRatingsList.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="No Ratings Yet"
              subtitle="When students rate you, their feedback will appear here."
            />
          ) : (
            <>
              <AverageBlock average={average} count={lecturerRatingsList.length} />
              <SectionLabel text="Student Feedback" />
              {lecturerRatingsList.map(item => <RatingCard key={item.id} item={item} />)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (role === "prl" || role === "pl") {
    const totalRatings  = allRatings.length;
    const averageRating = totalRatings > 0
      ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : null;

    const lecturerMap = {};
    allRatings.forEach(r => {
      if (!lecturerMap[r.lecturerId]) {
        lecturerMap[r.lecturerId] = { name: r.lecturerName, count: 0, total: 0 };
      }
      lecturerMap[r.lecturerId].count++;
      lecturerMap[r.lecturerId].total += r.rating;
    });
    Object.keys(lecturerMap).forEach(id => {
      lecturerMap[id].average = (lecturerMap[id].total / lecturerMap[id].count).toFixed(1);
    });

    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <Text style={s.eyebrow}>{role === "prl" ? "PRL Portal" : "Programme Leader"}</Text>
          <Text style={s.headerTitle}>All Ratings</Text>
          <Text style={s.headerSub}>Complete overview of lecturer performance</Text>
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNumber}>{totalRatings}</Text>
              <Text style={s.statLabel}>Total Ratings</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNumber}>{averageRating || 0}</Text>
              <Text style={s.statLabel}>Avg Rating</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNumber}>{Object.keys(lecturerMap).length}</Text>
              <Text style={s.statLabel}>Lecturers</Text>
            </View>
          </View>

          <SectionLabel text="Lecturer Performance" />
          {Object.keys(lecturerMap).map(id => (
            <View key={id} style={s.lecturerSummaryCard}>
              <Text style={s.lecturerSummaryName}>{lecturerMap[id].name}</Text>
              <View style={s.lecturerStats}>
                <Text style={s.lecturerStat}> {lecturerMap[id].average} / 5</Text>
                <Text style={s.lecturerStat}> {lecturerMap[id].count} reviews</Text>
              </View>
            </View>
          ))}

          <SectionLabel text="All Individual Ratings" />
          {allRatings.length === 0 ? (
            <EmptyState icon="📭" title="No Ratings Yet" subtitle="No feedback submitted yet." />
          ) : (
            allRatings.map(item => <RatingCard key={item.id} item={item} />)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, justifyContent: "center", alignItems: "center" },

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

  content: { padding: 16, paddingBottom: 40 },

  label: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 10,
  },


  courseCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, flexDirection: "row",
    alignItems: "flex-start", marginBottom: 10,
  },
  courseCardSelected: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  courseCardLocked:   { opacity: 0.7, backgroundColor: "#f8f9fc" },
  courseTitle:        { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 10 },


  lecturerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  lecturerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.navy,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  lecturerAvatarText: { fontSize: 13, fontWeight: "700", color: C.gold },
  lecturerName:       { fontSize: 13, fontWeight: "600", color: C.text, marginBottom: 4 },
  courseMetaRow:      { flexDirection: "row", alignItems: "center", gap: 6 },
  codeBadge: {
    backgroundColor: C.badge, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  codeBadgeText:  { fontSize: 10, fontWeight: "600", color: C.navy, letterSpacing: 0.5 },
  courseLecturer: { fontSize: 11, color: C.muted },


  lockBanner: {
    backgroundColor: "#fef9ec", borderRadius: 8, padding: 8, marginTop: 10,
    borderWidth: 1, borderColor: "#fde68a",
  },
  lockText: { fontSize: 11, color: C.amber, fontWeight: "500", textAlign: "center" },

  checkCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy,
    alignItems: "center", justifyContent: "center", marginLeft: 10, flexShrink: 0,
  },
  checkMark: { color: C.white, fontSize: 11, fontWeight: "700" },

  
  selectedSummary: { backgroundColor: C.navy, borderRadius: 12, padding: 16, marginTop: 4 },
  selectedSummaryLabel: {
    fontSize: 10, fontWeight: "600", letterSpacing: 1,
    color: C.gold, textTransform: "uppercase", marginBottom: 4,
  },
  selectedSummaryTitle: { fontSize: 16, fontWeight: "700", color: C.white, marginBottom: 2 },
  selectedSummaryMeta:  { fontSize: 13, color: "rgba(255,255,255,0.6)" },

  starCard: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, padding: 20, alignItems: "center", marginBottom: 4,
  },
  starRow:    { flexDirection: "row", gap: 8 },
  star:       { fontSize: 36, color: "#cfd6e4" },
  starActive: { color: C.gold },

 
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, minHeight: 100, fontSize: 14, color: C.text,
  },

  submitBtn: {
    backgroundColor: C.navy, padding: 16, borderRadius: 12, marginTop: 20, alignItems: "center",
  },
  submitText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.4 },


  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 28, alignItems: "center", marginBottom: 10,
  },
  emptyIcon:     { fontSize: 32, marginBottom: 10 },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

 
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  modalCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 24, width: "100%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 4 },
  modalSub:   { fontSize: 13, color: C.muted, marginBottom: 20 },
  modalRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalLabel: { fontSize: 12, color: C.muted, fontWeight: "600", flex: 1 },
  modalValue: { fontSize: 13, color: C.text, fontWeight: "600", flex: 2, textAlign: "right" },
  modalStarRow: { flexDirection: "row", alignItems: "center", gap: 3, flex: 2, justifyContent: "flex-end" },
  modalStar:    { fontSize: 16 },
  modalStarLit: { color: C.gold },
  modalStarDim: { color: "#dde1ec" },
  modalRatingNum: { fontSize: 13, fontWeight: "700", color: C.text, marginLeft: 6 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 24 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    padding: 14, alignItems: "center",
  },
  modalCancelText:   { fontSize: 14, fontWeight: "600", color: C.muted },
  modalConfirmBtn: {
    flex: 2, backgroundColor: C.navy, borderRadius: 10,
    padding: 14, alignItems: "center",
  },
  modalConfirmText:  { fontSize: 14, fontWeight: "700", color: C.white },

  ratingCard: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, padding: 16, marginBottom: 10,
  },
  ratingTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.badge,
    alignItems: "center", justifyContent: "center",
  },
  avatarText:      { fontSize: 13, fontWeight: "600", color: C.navy },
  studentName:     { fontSize: 14, fontWeight: "600", color: C.text },
  ratingMeta:      { fontSize: 12, color: C.muted, marginTop: 2 },
  ratingBadge: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: "row", alignItems: "baseline", gap: 3,
  },
  ratingBadgeNum:  { fontSize: 18, fontWeight: "700", color: C.navy },
  ratingBadgeStar: { fontSize: 11, color: C.gold },
  miniStarRow:     { flexDirection: "row", gap: 3, marginBottom: 8 },
  miniStar:        { fontSize: 13 },
  miniStarLit:     { color: C.gold },
  miniStarDim:     { color: "#dde1ec" },
  comment:         { fontSize: 13, color: C.text, lineHeight: 20, marginBottom: 6 },
  dateText:        { fontSize: 11, color: C.muted },


  avgBlock: {
    backgroundColor: C.navy, borderRadius: 12, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 20,
  },
  avgScore:   { fontSize: 54, fontWeight: "700", color: C.white, lineHeight: 58 },
  avgStarRow: { flexDirection: "row", gap: 4 },
  avgStar:    { fontSize: 16 },
  avgStarLit: { color: C.gold },
  avgStarDim: { color: "rgba(255,255,255,0.2)" },
  avgCount:   { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: C.navy, borderRadius: 12, padding: 16, alignItems: "center",
  },
  statNumber: { fontSize: 24, fontWeight: "700", color: C.white },
  statLabel:  { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 4 },

  lecturerSummaryCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, marginBottom: 10,
  },
  lecturerSummaryName: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 8 },
  lecturerStats:       { flexDirection: "row", gap: 16 },
  lecturerStat:        { fontSize: 13, color: C.muted },
});
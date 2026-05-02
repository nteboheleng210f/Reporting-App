import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
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
  warning: "#f59e0b",
  danger:  "#dc2626",
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

function CourseCard({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[s.courseCard, selected && s.courseCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.courseTitle}>{item.courseName}</Text>
        <View style={s.courseMetaRow}>
          <View style={s.codeBadge}>
            <Text style={s.codeBadgeText}>{item.courseCode}</Text>
          </View>
          <Text style={s.courseLecturer}>
            {item.lecturerName || "No lecturer"}
          </Text>
        </View>
      </View>
      {selected && (
        <View style={s.checkCircle}>
          <Text style={s.checkMark}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function RatingCard({ item, showLecturer = false }) {
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
          <Text style={s.ratingMeta}>
            {showLecturer ? `${item.lecturerName} · ` : ""}
            {item.courseName}
          </Text>
        </View>
        <View style={s.ratingBadge}>
          <Text style={s.ratingBadgeNum}>{item.rating}</Text>
          <Text style={s.ratingBadgeStar}>★</Text>
        </View>
      </View>

      <View style={s.miniStarRow}>
        {[1, 2, 3, 4, 5].map((n) => (
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
          {[1, 2, 3, 4, 5].map((n) => (
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

function EmptyState({ title, subtitle, icon = "📚" }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function RatingScreen() {
  const [role, setRole]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [courses, setCourses]             = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [ratings, setRatings]             = useState([]);
  const [myRatings, setMyRatings]         = useState([]);
  const [lecturerRatingsList, setLecturerRatingsList] = useState([]);
  const [rating, setRating]               = useState(0);
  const [comment, setComment]             = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [hasClassAssigned, setHasClassAssigned] = useState(true);
  const [checkingAssignment, setCheckingAssignment] = useState(true);

  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  // Check if student has a class assigned
  const checkClassAssignment = async () => {
    try {
      const response = await api.get("/students/class-assignment");
      if (response.data.success) {
        setHasClassAssigned(response.data.hasClassAssigned);
      }
    } catch (error) {
      console.log("Failed to check class assignment:", error);
      setHasClassAssigned(false);
    } finally {
      setCheckingAssignment(false);
    }
  };

  // ─── Student: courses filtered to their class by backend ─────────────────────
  const loadCourses = async () => {
    try {
      const response = await api.get("/ratings/courses");
      if (response.data.success) {
        setCourses(response.data.courses);
        // If no courses, student can't rate
        if (response.data.courses.length === 0) {
          setHasClassAssigned(false);
        }
      }
    } catch (error) {
      console.log("Failed to load courses:", error);
      if (error.response?.status === 403) {
        setHasClassAssigned(false);
      }
    }
  };

  // ─── PRL/PL: all ratings ─────────────────────────────────────────────────────
  const loadAllRatings = async () => {
    try {
      const response = await api.get("/ratings/all");
      if (response.data.success) setRatings(response.data.ratings);
    } catch (error) {
      console.log("Failed to load all ratings:", error);
    }
  };

  // ─── Student: own ratings only ───────────────────────────────────────────────
  const loadMyRatings = async () => {
    try {
      const response = await api.get("/ratings/mine");
      if (response.data.success) setMyRatings(response.data.ratings);
    } catch (error) {
      console.log("Failed to load my ratings:", error);
    }
  };

  // ─── Lecturer: ratings received for them ────────────────────────────────────
  const loadLecturerRatings = async () => {
    try {
      const response = await api.get("/ratings/lecturer/me");
      if (response.data.success) setLecturerRatingsList(response.data.ratings);
    } catch (error) {
      console.log("Failed to load lecturer ratings:", error);
    }
  };

  const submitRating = async () => {
    if (!selectedCourse) return Alert.alert("Select Course", "Please choose a course first.");
    if (!rating) return Alert.alert("Rating Required", "Please select a star rating.");
    
    // Double-check class assignment before submitting
    if (!hasClassAssigned) {
      Alert.alert("Not Assigned", "You are not assigned to any class. Please contact your program leader.");
      return;
    }

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
        Alert.alert("Success", "Rating submitted successfully.");
        setSelectedCourse(null);
        setRating(0);
        setComment("");
        await loadMyRatings();
        await loadCourses(); // Refresh courses to remove rated ones if needed
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Failed to submit rating";
      Alert.alert("Error", errorMsg);
      
      // If error indicates no class assignment, update state
      if (errorMsg.includes("assigned") || errorMsg.includes("authorised")) {
        setHasClassAssigned(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userRole = await getUserRole();

      if (userRole === "student") {
        await checkClassAssignment();
        await loadCourses();
        await loadMyRatings();
      } else if (userRole === "lecturer") {
        await loadLecturerRatings();
      } else if (userRole === "prl" || userRole === "pl") {
        await loadAllRatings();
      }

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

  // ─── STUDENT VIEW ────────────────────────────────────────────────────────────
  if (role === "student") {
    const average = myRatings.length > 0
      ? (myRatings.reduce((sum, r) => sum + r.rating, 0) / myRatings.length).toFixed(1)
      : null;

    // Show "not assigned" message if student has no class or no courses
    if (!hasClassAssigned || courses.length === 0) {
      return (
        <SafeAreaView style={s.container}>
          <View style={s.header}>
            <Text style={s.eyebrow}>Feedback</Text>
            <Text style={s.headerTitle}>Rate Your Lecturer</Text>
            <Text style={s.headerSub}>Share your feedback about your courses</Text>
          </View>
          
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <EmptyState
              icon="🎓"
              title="Not Assigned to Any Class"
              subtitle="You haven't been assigned to any class yet. Please contact your Programme Leader to get enrolled in courses before you can submit ratings."
            />
            
            {myRatings.length > 0 && (
              <>
                <SectionLabel text="Your Previous Ratings" />
                <AverageBlock average={average} count={myRatings.length} />
                {myRatings.map((item) => (
                  <RatingCard key={item.id} item={item} showLecturer />
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.eyebrow}>Feedback</Text>
          <Text style={s.headerTitle}>Rate Your Lecturer</Text>
          <Text style={s.headerSub}>Choose a course and share your feedback</Text>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <SectionLabel text="Available Courses" />

          {courses.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No Courses Available"
              subtitle="No courses are currently available for rating. Check back later or contact your programme leader."
            />
          ) : (
            courses.map((item) => (
              <CourseCard
                key={item.id}
                item={item}
                selected={selectedCourse?.id === item.id}
                onPress={() => setSelectedCourse(item)}
              />
            ))
          )}

          {selectedCourse && (
            <View style={s.selectedSummary}>
              <Text style={s.selectedSummaryLabel}>Selected</Text>
              <Text style={s.selectedSummaryTitle}>{selectedCourse.courseName}</Text>
              <Text style={s.selectedSummaryMeta}>
                Lecturer: {selectedCourse.lecturerName || "Unknown"}
              </Text>
            </View>
          )}

          {selectedCourse && (
            <>
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
                style={[s.submitBtn, (submitting || courses.length === 0) && { opacity: 0.5 }]}
                onPress={submitRating}
                disabled={submitting || courses.length === 0}
                activeOpacity={0.85}
              >
                <Text style={s.submitText}>
                  {submitting ? "Submitting…" : "Submit Rating"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {myRatings.length > 0 && (
            <>
              <SectionLabel text="Your Previous Ratings" />
              <AverageBlock average={average} count={myRatings.length} />
              {myRatings.map((item) => (
                <RatingCard key={item.id} item={item} showLecturer />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LECTURER VIEW ───────────────────────────────────────────────────────────
  if (role === "lecturer") {
    const average = lecturerRatingsList.length > 0
      ? (lecturerRatingsList.reduce((sum, r) => sum + r.rating, 0) / lecturerRatingsList.length).toFixed(1)
      : null;

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.eyebrow}>Lecturer Portal</Text>
          <Text style={s.headerTitle}>My Ratings</Text>
          <Text style={s.headerSub}>Feedback submitted by your students</Text>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {lecturerRatingsList.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="No Ratings Yet"
              subtitle="Your students haven't submitted any feedback yet."
            />
          ) : (
            <>
              <AverageBlock average={average} count={lecturerRatingsList.length} />
              <SectionLabel text="Student Feedback" />
              {lecturerRatingsList.map((item) => (
                <RatingCard key={item.id} item={item} showLecturer={false} />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── PRL / PL VIEW ───────────────────────────────────────────────────────────
  if (role === "prl" || role === "pl") {
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : null;

    const lecturerMap = {};
    ratings.forEach(r => {
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
          {Object.keys(lecturerMap).length === 0 ? (
            <EmptyState
              icon="👨‍🏫"
              title="No Ratings Yet"
              subtitle="No feedback has been submitted by students yet."
            />
          ) : (
            Object.keys(lecturerMap).map(id => (
              <View key={id} style={s.lecturerSummaryCard}>
                <Text style={s.lecturerName}>{lecturerMap[id].name}</Text>
                <View style={s.lecturerStats}>
                  <Text style={s.lecturerStat}>⭐ {lecturerMap[id].average} / 5</Text>
                  <Text style={s.lecturerStat}>📝 {lecturerMap[id].count} reviews</Text>
                </View>
              </View>
            ))
          )}

          <SectionLabel text="All Individual Ratings" />
          {ratings.length === 0 ? (
            <EmptyState
              icon="📝"
              title="No Ratings Yet"
              subtitle="No feedback has been submitted yet."
            />
          ) : (
            ratings.map((item) => (
              <RatingCard key={item.id} item={item} showLecturer />
            ))
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

  emptyCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 32, alignItems: "center", marginBottom: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

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
  lecturerName:  { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 8 },
  lecturerStats: { flexDirection: "row", gap: 16 },
  lecturerStat:  { fontSize: 13, color: C.muted },

  courseCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10,
  },
  courseCardSelected: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  courseTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6 },
  courseMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeBadge: {
    backgroundColor: C.badge, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  codeBadgeText: { fontSize: 10, fontWeight: "600", color: C.navy, letterSpacing: 0.5 },
  courseLecturer:{ fontSize: 12, color: C.muted },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy,
    alignItems: "center", justifyContent: "center", marginLeft: 10,
  },
  checkMark: { color: C.white, fontSize: 11, fontWeight: "700" },

  selectedSummary: { backgroundColor: C.navy, borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 20 },
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

  ratingCard: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, padding: 16, marginBottom: 10,
  },
  ratingTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.badge,
    alignItems: "center", justifyContent: "center",
  },
  avatarText:   { fontSize: 13, fontWeight: "600", color: C.navy },
  studentName:  { fontSize: 14, fontWeight: "600", color: C.text },
  ratingMeta:   { fontSize: 12, color: C.muted, marginTop: 2 },
  ratingBadge: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: "row", alignItems: "baseline", gap: 3,
  },
  ratingBadgeNum:  { fontSize: 18, fontWeight: "700", color: C.navy },
  ratingBadgeStar: { fontSize: 11, color: C.gold },
  miniStarRow: { flexDirection: "row", gap: 3, marginBottom: 8 },
  miniStar:    { fontSize: 13 },
  miniStarLit: { color: C.gold },
  miniStarDim: { color: "#dde1ec" },
  comment:  { fontSize: 13, color: C.text, lineHeight: 20, marginBottom: 6 },
  dateText: { fontSize: 11, color: C.muted },

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
});
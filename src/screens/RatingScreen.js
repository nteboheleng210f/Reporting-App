import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
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
};

function StarPicker({ value, onChange }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[styles.star, n <= value && styles.starActive]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CourseCard({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.courseCard, selected && styles.courseCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.courseTitle}>{item.courseName}</Text>
        <View style={styles.courseMetaRow}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{item.courseCode}</Text>
          </View>
          <Text style={styles.courseLecturer}>
            {item.lecturerName || "No lecturer"}
          </Text>
        </View>
      </View>
      {selected && (
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function RatingCard({ item, showLecturer = false }) {
  const initials = (item.studentName || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <View style={styles.ratingCard}>
      <View style={styles.ratingTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>
            {item.studentName || "Student"}
          </Text>
          <Text style={styles.ratingMeta}>
            {showLecturer ? `${item.lecturerName} · ` : ""}
            {item.courseName}
          </Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeNum}>{item.rating}</Text>
          <Text style={styles.ratingBadgeStar}>★</Text>
        </View>
      </View>

      <View style={styles.miniStarRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Text
            key={n}
            style={[
              styles.miniStar,
              n <= item.rating ? styles.miniStarLit : styles.miniStarDim,
            ]}
          >
            ★
          </Text>
        ))}
      </View>

      {!!item.comment && (
        <Text style={styles.comment}>{item.comment}</Text>
      )}

      {!!dateStr && <Text style={styles.dateText}>{dateStr}</Text>}
    </View>
  );
}

function AverageBlock({ average, count }) {
  const rounded = parseFloat(average) || 0;
  return (
    <View style={styles.avgBlock}>
      <Text style={styles.avgScore}>{average ?? "–"}</Text>
      <View style={{ flexDirection: "column", gap: 4 }}>
        <View style={styles.avgStarRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Text
              key={n}
              style={[
                styles.avgStar,
                n <= Math.round(rounded) ? styles.avgStarLit : styles.avgStarDim,
              ]}
            >
              ★
            </Text>
          ))}
        </View>
        <Text style={styles.avgCount}>
          {count} {count === 1 ? "review" : "reviews"}
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

export default function RatingScreen() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Get user role from storage
  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  // Load courses for student
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

  // Load all ratings (for PRL/PL)
  const loadAllRatings = async () => {
    try {
      const response = await api.get("/ratings/all");
      if (response.data.success) {
        setRatings(response.data.ratings);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load ratings");
    }
  };

  // Load student's own ratings
  const loadMyRatings = async () => {
    try {
      const response = await api.get("/ratings/mine");
      if (response.data.success) {
        setMyRatings(response.data.ratings);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load your ratings");
    }
  };

  const submitRating = async () => {
    if (!selectedCourse) {
      return Alert.alert("Select Course", "Please choose a course first.");
    }
    if (!rating) {
      return Alert.alert("Rating Required", "Please select a star rating.");
    }

    setSubmitting(true);
    try {
      const payload = {
        lecturerId: selectedCourse.lecturerId,
        lecturerName: selectedCourse.lecturerName,
        courseName: selectedCourse.courseName,
        courseCode: selectedCourse.courseCode,
        classId: selectedCourse.classId,
        className: selectedCourse.className,
        rating,
        comment: comment.trim()
      };

      const response = await api.post("/ratings", payload);
      if (response.data.success) {
        Alert.alert("Success", "Rating submitted successfully.");
        setSelectedCourse(null);
        setRating(0);
        setComment("");
        await loadMyRatings();
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userRole = await getUserRole();
      
      if (userRole === "student") {
        await loadCourses();
        await loadMyRatings();
      } else if (userRole === "prl" || userRole === "pl") {
        await loadAllRatings();
      }
      
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  // ========== STUDENT VIEW ==========
  if (role === "student") {
    const average = myRatings.length > 0
      ? (myRatings.reduce((sum, r) => sum + r.rating, 0) / myRatings.length).toFixed(1)
      : null;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Feedback</Text>
          <Text style={styles.headerTitle}>Rate Your Lecturer</Text>
          <Text style={styles.headerSub}>
            Choose a course and share your feedback
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel text="Available Courses" />

          {courses.length === 0 ? (
            <Text style={styles.emptyText}>No courses found.</Text>
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
            <View style={styles.selectedSummary}>
              <Text style={styles.selectedSummaryLabel}>Selected</Text>
              <Text style={styles.selectedSummaryTitle}>
                {selectedCourse.courseName}
              </Text>
              <Text style={styles.selectedSummaryMeta}>
                Lecturer: {selectedCourse.lecturerName || "Unknown"}
              </Text>
            </View>
          )}

          <SectionLabel text="Your Rating" />
          <View style={styles.starCard}>
            <StarPicker value={rating} onChange={setRating} />
          </View>

          <SectionLabel text="Comment (optional)" />
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            placeholder="Share your feedback…"
            placeholderTextColor={C.muted}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={submitRating}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>
              {submitting ? "Submitting…" : "Submit Rating"}
            </Text>
          </TouchableOpacity>

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

  // ========== PRL / PL VIEW ==========
  if (role === "prl" || role === "pl") {
    // Calculate average rating across all lecturers
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : null;
    
    // Group ratings by lecturer
    const lecturerRatings = {};
    ratings.forEach(r => {
      if (!lecturerRatings[r.lecturerId]) {
        lecturerRatings[r.lecturerId] = {
          name: r.lecturerName,
          ratings: [],
          count: 0,
          total: 0
        };
      }
      lecturerRatings[r.lecturerId].ratings.push(r);
      lecturerRatings[r.lecturerId].count++;
      lecturerRatings[r.lecturerId].total += r.rating;
    });
    
    // Calculate average per lecturer
    Object.keys(lecturerRatings).forEach(id => {
      lecturerRatings[id].average = (lecturerRatings[id].total / lecturerRatings[id].count).toFixed(1);
    });

    const roleTitle = role === "prl" ? "PRL Portal" : "Programme Leader";
    const roleSub = role === "prl" 
      ? "View all lecturer ratings and feedback" 
      : "Complete overview of lecturer performance";

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{roleTitle}</Text>
          <Text style={styles.headerTitle}>All Ratings</Text>
          <Text style={styles.headerSub}>{roleSub}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Overall Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalRatings}</Text>
              <Text style={styles.statLabel}>Total Ratings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{averageRating || 0}</Text>
              <Text style={styles.statLabel}>Average Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{Object.keys(lecturerRatings).length}</Text>
              <Text style={styles.statLabel}>Lecturers Rated</Text>
            </View>
          </View>

          {/* Lecturer Summary Cards */}
          <SectionLabel text="Lecturer Performance Summary" />
          {Object.keys(lecturerRatings).map(id => (
            <View key={id} style={styles.lecturerSummaryCard}>
              <Text style={styles.lecturerName}>{lecturerRatings[id].name}</Text>
              <View style={styles.lecturerStats}>
                <Text style={styles.lecturerStat}>
                  ⭐ {lecturerRatings[id].average} / 5
                </Text>
                <Text style={styles.lecturerStat}>
                  📝 {lecturerRatings[id].count} reviews
                </Text>
              </View>
            </View>
          ))}

          {/* All Individual Ratings */}
          <SectionLabel text="All Individual Ratings" />
          {ratings.length === 0 ? (
            <Text style={styles.emptyText}>No ratings found.</Text>
          ) : (
            ratings.map((item) => (
              <RatingCard key={item.id} item={item} showLecturer />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Fallback
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={C.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, justifyContent: "center", alignItems: "center" },

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

  content: { padding: 16, paddingBottom: 40 },

  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: C.white,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },

  lecturerSummaryCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  lecturerName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  lecturerStats: {
    flexDirection: "row",
    gap: 16,
  },
  lecturerStat: {
    fontSize: 13,
    color: C.muted,
  },

  courseCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  courseCardSelected: {
    borderColor: C.navy,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  courseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeBadge: {
    backgroundColor: C.badge,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.navy,
    letterSpacing: 0.5,
  },
  courseLecturer: {
    fontSize: 12,
    color: C.muted,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  checkMark: { color: C.white, fontSize: 11, fontWeight: "700" },

  selectedSummary: {
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  selectedSummaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: C.gold,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  selectedSummaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    marginBottom: 2,
  },
  selectedSummaryMeta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },

  starCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    alignItems: "center",
    marginBottom: 4,
  },
  starRow:    { flexDirection: "row", gap: 8 },
  star:       { fontSize: 36, color: "#cfd6e4" },
  starActive: { color: C.gold },

  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    color: C.text,
  },

  submitBtn: {
    backgroundColor: C.navy,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  submitText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.4,
  },

  emptyText: { color: C.muted, marginTop: 10, marginBottom: 20, fontSize: 13 },

  ratingCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
  },
  ratingTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.badge,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText:  { fontSize: 13, fontWeight: "600", color: C.navy },
  studentName: { fontSize: 14, fontWeight: "600", color: C.text },
  ratingMeta:  { fontSize: 12, color: C.muted, marginTop: 2 },

  ratingBadge: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
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
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  avgScore:   { fontSize: 54, fontWeight: "700", color: C.white, lineHeight: 58 },
  avgStarRow: { flexDirection: "row", gap: 4 },
  avgStar:    { fontSize: 16 },
  avgStarLit: { color: C.gold },
  avgStarDim: { color: "rgba(255,255,255,0.2)" },
  avgCount:   { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 },
});
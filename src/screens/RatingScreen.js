import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  SafeAreaView, TextInput, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const C = {
  navy: "#0f1f3d", gold: "#c9a84c", white: "#ffffff",
  bg: "#f5f7fb", card: "#ffffff", border: "#e4e8f0",
  text: "#102040", muted: "#6c7a96",
};

function StarPicker({ value, onChange }) {
  return (
    <View style={s.starRow}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[s.star, n <= value && s.starActive]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RatingScreen() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [myRatings, setMyRatings] = useState([]);
  const [lecturerRatings, setLecturerRatings] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const userRole = await AsyncStorage.getItem("user_role");
      setRole(userRole);
      
      if (userRole === "student") {
        const [coursesRes, ratingsRes] = await Promise.all([
          api.get("/ratings/courses"),
          api.get("/ratings/mine")
        ]);
        if (coursesRes.data.success) setCourses(coursesRes.data.courses);
        if (ratingsRes.data.success) setMyRatings(ratingsRes.data.ratings);
      } 
      else if (userRole === "lecturer") {
        const res = await api.get("/ratings/lecturer/me");
        if (res.data.success) setLecturerRatings(res.data.ratings);
      }
      else if (userRole === "prl" || userRole === "pl") {
        const res = await api.get("/ratings/all");
        if (res.data.success) setLecturerRatings(res.data.ratings);
      }
      
      setLoading(false);
    };
    init();
  }, []);

  const submitRating = async () => {
    if (!selectedCourse) return Alert.alert("Error", "Select a course");
    if (!rating) return Alert.alert("Error", "Select a rating");
    
    setSubmitting(true);
    try {
      await api.post("/ratings", {
        lecturerId: selectedCourse.lecturerId,
        lecturerName: selectedCourse.lecturerName,
        courseName: selectedCourse.courseName,
        courseCode: selectedCourse.courseCode,
        classId: selectedCourse.classId,
        className: selectedCourse.className,
        rating,
        comment: comment.trim(),
      });
      
      Alert.alert("Success", "Rating submitted");
      setSelectedCourse(null);
      setRating(0);
      setComment("");
      
      const res = await api.get("/ratings/mine");
      if (res.data.success) setMyRatings(res.data.ratings);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={C.navy} /></View>;

  // ─── STUDENT VIEW ────────────────────────────────────────────────
  if (role === "student") {
    if (courses.length === 0) {
      return (
        <SafeAreaView style={s.container}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Rate Your Lecturer</Text>
            <Text style={s.headerSub}>No courses available</Text>
          </View>
          <View style={s.content}>
            <Text style={s.emptyText}>You haven't been assigned to any class yet.</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Rate Your Lecturer</Text>
          <Text style={s.headerSub}>Choose a course and share feedback</Text>
        </View>
        <ScrollView style={s.content}>
          {courses.map(course => (
            <TouchableOpacity 
              key={course.id}
              style={[s.courseCard, selectedCourse?.id === course.id && s.selectedCard]}
              onPress={() => setSelectedCourse(course)}
            >
              <Text style={s.courseTitle}>{course.courseName}</Text>
              <Text style={s.courseMeta}>{course.lecturerName || "No lecturer"}</Text>
            </TouchableOpacity>
          ))}

          {selectedCourse && (
            <>
              <View style={s.selectedBox}>
                <Text style={s.selectedLabel}>SELECTED</Text>
                <Text style={s.selectedTitle}>{selectedCourse.courseName}</Text>
                <Text style={s.selectedMeta}>Lecturer: {selectedCourse.lecturerName}</Text>
              </View>

              <Text style={s.label}>Your Rating</Text>
              <View style={s.starCard}><StarPicker value={rating} onChange={setRating} /></View>

              <Text style={s.label}>Comment (optional)</Text>
              <TextInput style={s.input} multiline placeholder="Share your feedback..." value={comment} onChangeText={setComment} />

              <TouchableOpacity style={s.submitBtn} onPress={submitRating} disabled={submitting}>
                <Text style={s.submitText}>{submitting ? "Submitting..." : "Submit Rating"}</Text>
              </TouchableOpacity>
            </>
          )}

          {myRatings.length > 0 && (
            <>
              <Text style={s.label}>Your Previous Ratings</Text>
              {myRatings.map(item => (
                <View key={item.id} style={s.ratingCard}>
                  <Text style={s.ratingStars}>{"★".repeat(item.rating)}</Text>
                  <Text style={s.ratingCourse}>{item.courseName}</Text>
                  {item.comment ? <Text style={s.ratingComment}>"{item.comment}"</Text> : null}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LECTURER VIEW - Shows ratings FROM students ✅ ───────────────
  if (role === "lecturer") {
    const avg = lecturerRatings.length > 0 
      ? (lecturerRatings.reduce((s, r) => s + r.rating, 0) / lecturerRatings.length).toFixed(1)
      : 0;

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Ratings</Text>
          <Text style={s.headerSub}>Feedback from your students</Text>
        </View>
        <ScrollView style={s.content}>
          {lecturerRatings.length === 0 ? (
            <Text style={s.emptyText}>No ratings from students yet.</Text>
          ) : (
            <>
              <View style={s.avgBox}>
                <Text style={s.avgNumber}>{avg}</Text>
                <Text style={s.avgStars}>{"★".repeat(Math.round(avg))}</Text>
                <Text style={s.avgCount}>{lecturerRatings.length} reviews</Text>
              </View>

              <Text style={s.label}>Student Feedback</Text>
              {lecturerRatings.map(item => (
                <View key={item.id} style={s.ratingCard}>
                  <View style={s.ratingHeader}>
                    <Text style={s.studentName}>{item.studentName}</Text>
                    <Text style={s.ratingStars}>{"★".repeat(item.rating)}</Text>
                  </View>
                  <Text style={s.ratingCourse}>{item.courseName}</Text>
                  {item.comment ? <Text style={s.ratingComment}>"{item.comment}"</Text> : null}
                  <Text style={s.ratingDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: C.navy, paddingTop: 52, paddingHorizontal: 24, paddingBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  content: { padding: 16 },
  label: { fontSize: 11, fontWeight: "600", color: C.muted, marginTop: 20, marginBottom: 10 },
  courseCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  selectedCard: { borderColor: C.navy, borderLeftWidth: 3, borderLeftColor: C.gold },
  courseTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  courseMeta: { fontSize: 12, color: C.muted, marginTop: 4 },
  selectedBox: { backgroundColor: C.navy, borderRadius: 12, padding: 16, marginVertical: 16 },
  selectedLabel: { fontSize: 10, color: C.gold, letterSpacing: 1 },
  selectedTitle: { fontSize: 16, fontWeight: "700", color: C.white, marginTop: 4 },
  selectedMeta: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  starCard: { backgroundColor: C.card, borderRadius: 12, padding: 20, alignItems: "center", borderWidth: 1, borderColor: C.border },
  starRow: { flexDirection: "row", gap: 8 },
  star: { fontSize: 36, color: "#cfd6e4" },
  starActive: { color: C.gold },
  input: { backgroundColor: C.card, borderRadius: 12, padding: 14, minHeight: 80, borderWidth: 1, borderColor: C.border },
  submitBtn: { backgroundColor: C.navy, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  submitText: { color: C.white, fontWeight: "700" },
  ratingCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  ratingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  studentName: { fontSize: 14, fontWeight: "600", color: C.text },
  ratingStars: { fontSize: 14, color: C.gold },
  ratingCourse: { fontSize: 12, color: C.muted, marginBottom: 6 },
  ratingComment: { fontSize: 13, color: C.text, fontStyle: "italic", marginBottom: 6 },
  ratingDate: { fontSize: 10, color: C.muted },
  avgBox: { backgroundColor: C.navy, borderRadius: 12, padding: 20, alignItems: "center", marginBottom: 20 },
  avgNumber: { fontSize: 48, fontWeight: "700", color: C.white },
  avgStars: { fontSize: 20, color: C.gold, marginVertical: 8 },
  avgCount: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  emptyText: { textAlign: "center", color: C.muted, padding: 40 },
});
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { auth, db } from "../firebase/config";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";

/* ───────────────────────── STAR PICKER ───────────────────────── */
function StarPicker({ value, onChange }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[styles.star, n <= value && styles.starLit]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ───────────────────────── CARD ───────────────────────── */
function RatingCard({ item, showLecturer = false }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>
        {item.studentName} → {item.courseName}
      </Text>
      {showLecturer && (
        <Text style={styles.cardSub}>{item.lecturerName}</Text>
      )}
      <Text style={styles.cardSub}>⭐ {item.rating}</Text>
    </View>
  );
}

/* ───────────────────────── MAIN ───────────────────────── */
export default function RatingScreen() {
  const user = auth.currentUser;

  const [role, setRole] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lecturer, setLecturer] = useState("");
  const [course, setCourse] = useState("");
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setRole(snap.data()?.role);

        const r = await getDocs(collection(db, "ratings"));
        setRatings(r.docs.map((d) => d.data()));
      } catch (e) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  const submitRating = async () => {
    await addDoc(collection(db, "ratings"), {
      studentId: user.uid,
      studentName: user.displayName || "Student",
      lecturerName: lecturer,
      courseName: course,
      rating,
      createdAt: new Date().toISOString(),
    });

    setLecturer("");
    setCourse("");
    setRating(0);
  };


  if (role === "lecturer") {
    const myRatings = ratings.filter(
      (r) => r.lecturerName === user.displayName
    );

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>My Ratings</Text>

        {myRatings.map((r, i) => (
          <RatingCard key={i} item={r} />
        ))}
      </ScrollView>
    );
  }

 
  if (role === "prl") {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>All Ratings (PRL)</Text>

        {ratings.map((r, i) => (
          <RatingCard key={i} item={r} showLecturer />
        ))}
      </ScrollView>
    );
  }

  
  if (role === "pl") {
    // group lecturers
    const map = {};

    ratings.forEach((r) => {
      const name = r.lecturerName || "Unknown";

      if (!map[name]) {
        map[name] = { name, total: 0, sum: 0 };
      }

      map[name].total += 1;
      map[name].sum += Number(r.rating || 0);
    });

    const lecturers = Object.values(map).map((l) => ({
      ...l,
      avg: l.total ? (l.sum / l.total).toFixed(1) : 0,
    }));

    const systemAvg =
      ratings.length > 0
        ? (
            ratings.reduce((a, b) => a + Number(b.rating), 0) /
            ratings.length
          ).toFixed(1)
        : 0;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}> PL Rating Analytics</Text>

        {/* SYSTEM SUMMARY */}
        <View style={styles.box}>
          <Text style={styles.text}>Total Ratings: {ratings.length}</Text>
          <Text style={styles.text}>System Average:  {systemAvg}</Text>
        </View>

       
        <Text style={styles.subtitle}>Lecturer Performance</Text>

        {lecturers.map((l, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.text}> {l.name}</Text>
            <Text style={styles.sub}>Reviews: {l.total}</Text>
            <Text style={styles.sub}>Avg:  {l.avg}</Text>

            <Text
              style={[
                styles.status,
                l.avg >= 4
                  ? styles.good
                  : l.avg >= 3
                  ? styles.medium
                  : styles.bad,
              ]}
            >
              {l.avg >= 4
                ? "Excellent"
                : l.avg >= 3
                ? "Average"
                : "Needs Improvement"}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  /* ───── STUDENT (default) ───── */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text>Student Rating </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────────────── STYLES ───────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 15 },

  title: { fontSize: 22, color: "white", fontWeight: "bold" },

  subtitle: { color: "#93c5fd", marginTop: 15 },

  box: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  text: { color: "white", fontWeight: "600" },

  sub: { color: "#94a3b8" },

  status: { marginTop: 5, fontWeight: "bold" },

  good: { color: "#22c55e" },
  medium: { color: "#facc15" },
  bad: { color: "#ef4444" },

  starRow: { flexDirection: "row" },

  star: { fontSize: 30, color: "#444" },

  starLit: { color: "#f5b942" },
});
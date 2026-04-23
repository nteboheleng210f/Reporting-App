import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { auth, db } from "../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export default function MonitoringScreen() {

  const user = auth.currentUser;

  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [attendance, setAttendance] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        setRole(userSnap.data()?.role);

        const attSnap = await getDocs(collection(db, "attendance"));
        const ratSnap = await getDocs(collection(db, "ratings"));
        const courseSnap = await getDocs(collection(db, "courses"));

        setAttendance(attSnap.docs.map(d => d.data()));
        setRatings(ratSnap.docs.map(d => d.data()));
        setCourses(courseSnap.docs.map(d => d.data()));

      } catch (e) {
        console.log(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="white" />
        <Text style={{ color: "white" }}>Loading Monitoring...</Text>
      </View>
    );
  }

  
  if (role === "pl") {

    // GROUP DATA BY LECTURER
    const lecturerMap = {};

    courses.forEach(c => {
      const name = c.lecturerName || "Unknown";

      if (!lecturerMap[name]) {
        lecturerMap[name] = {
          name,
          courses: 0,
          ratings: []
        };
      }

      lecturerMap[name].courses += 1;
    });

    ratings.forEach(r => {
      const name = r.lecturerName || "Unknown";

      if (lecturerMap[name]) {
        lecturerMap[name].ratings.push(Number(r.rating || 0));
      }
    });

    const lecturerStats = Object.values(lecturerMap).map(l => {
      const avg =
        l.ratings.length > 0
          ? (l.ratings.reduce((a, b) => a + b, 0) / l.ratings.length).toFixed(1)
          : 0;

      return { ...l, avg: Number(avg) };
    });

    const lowPerformers = lecturerStats.filter(l => l.avg > 0 && l.avg < 3);

    const topPerformers = lecturerStats.filter(l => l.avg >= 4);

    return (
      <ScrollView style={styles.container}>

        <Text style={styles.title}> PL Monitoring Dashboard</Text>

        {/* SYSTEM OVERVIEW */}
        <Text style={styles.section}>System Overview</Text>

        <View style={styles.card}>
          <Text style={styles.text}> Total Courses: {courses.length}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.text}> Attendance Records: {attendance.length}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.text}> Total Ratings: {ratings.length}</Text>
        </View>

        {/* LECTURER PERFORMANCE */}
        <Text style={styles.section}>Lecturer Performance</Text>

        {lecturerStats.map((l, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.text}>{l.name}</Text>
            <Text style={styles.sub}>Courses: {l.courses}</Text>
            <Text style={styles.sub}>Average Rating:  {l.avg}</Text>
          </View>
        ))}

        


      </ScrollView>
    );
  }

 
  return (
    <View style={styles.center}>
      <Text style={{ color: "white" }}>Access Denied</Text>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 15
  },

  title: {
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
    marginBottom: 15
  },

  section: {
    color: "#93c5fd",
    marginTop: 15,
    marginBottom: 8,
    fontWeight: "bold"
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },

  goodCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e"
  },

  badCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444"
  },

  text: {
    color: "white",
    fontWeight: "600"
  },

  sub: {
    color: "#94a3b8"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
});
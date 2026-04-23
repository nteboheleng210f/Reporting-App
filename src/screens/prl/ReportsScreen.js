import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from "react-native";

import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";

export default function ReportsScreen({ navigation }) {

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // FETCH FINAL APPROVED REPORTS ONLY (PL VIEW)
  // =========================
  const fetchReports = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "reports"));

      const data = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(r =>
          r.status === "approved" || r.reviewedByPRL === true
        );

      setReports(data);

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // =========================
  // ANALYTICS (BASIC)
  // =========================
  const totalReports = reports.length;

  const courseMap = {};
  reports.forEach(r => {
    const key = r.courseCode || r.courseName;
    if (!courseMap[key]) {
      courseMap[key] = {
        courseName: r.courseName,
        count: 0,
        totalAttendance: 0
      };
    }
    courseMap[key].count += 1;
    courseMap[key].totalAttendance += Number(r.actualStudents || 0);
  });

  const courseStats = Object.keys(courseMap).map(key => ({
    key,
    ...courseMap[key],
    avgAttendance:
      courseMap[key].count > 0
        ? Math.round(courseMap[key].totalAttendance / courseMap[key].count)
        : 0
  }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Loading final reports...</Text>
      </View>
    );
  }

  // =========================
  // REPORT ITEM
  // =========================
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("PRLReportDetails", { report: item })
      }
    >
      <Text style={styles.title}>
        {item.courseName} ({item.courseCode})
      </Text>

      <Text style={styles.text}>
        👨‍🏫 {item.lecturerName}
      </Text>

      <Text style={styles.text}>
        📅 {item.date}
      </Text>

      <Text style={styles.badge}>
        STATUS: APPROVED
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <Text style={styles.header}>📊 PL Reports Dashboard</Text>

      {/* SUMMARY */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          Total Approved Reports: {totalReports}
        </Text>
      </View>

      {/* COURSE ANALYTICS */}
      <Text style={styles.sectionTitle}>📘 Course Performance</Text>

      {courseStats.map(item => (
        <View key={item.key} style={styles.analyticsCard}>
          <Text style={styles.courseName}>
            {item.courseName}
          </Text>

          <Text style={styles.analyticsText}>
            Reports: {item.count}
          </Text>

          <Text style={styles.analyticsText}>
            Avg Attendance: {item.avgAttendance}
          </Text>
        </View>
      ))}

      {/* REPORT LIST */}
      <Text style={styles.sectionTitle}>📄 Final Reports</Text>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
      />

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
    padding: 16
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#070b18"
  },

  loadingText: {
    color: "#94a3b8",
    marginTop: 10
  },

  header: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 12
  },

  summaryCard: {
    backgroundColor: "#0f172a",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#1e293b"
  },

  summaryText: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "600"
  },

  sectionTitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 10
  },

  analyticsCard: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#1e293b"
  },

  courseName: {
    color: "#93c5fd",
    fontWeight: "700"
  },

  analyticsText: {
    color: "#94a3b8",
    fontSize: 12
  },

  card: {
    backgroundColor: "#0f172a",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb"
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc"
  },

  text: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 12
  },

  badge: {
    marginTop: 8,
    fontSize: 10,
    color: "#4ade80",
    fontWeight: "700"
  }
});
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import api from "../services/api";

export default function ReportsScreen() {
  const [role, setRole] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);

  // Get user role
  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  // Load reports based on role
  const loadReports = async () => {
    try {
      const response = await api.get("/reports");
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Load pending reports for PRL
  const loadPendingReports = async () => {
    try {
      const response = await api.get("/reports/pending");
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Load reviewed reports for PL
  const loadReviewedReports = async () => {
    try {
      const response = await api.get("/reports/reviewed");
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // EXPORT REPORTS TO EXCEL (PL only)
  const exportReports = async () => {
    setExporting(true);
    try {
      const response = await api.get("/export/reports", {
        responseType: "blob",
      });

      const date = new Date();
      const filename = `lecture_reports_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.xlsx`;
      const fileUri = FileSystem.documentDirectory + filename;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Success", `Report saved to ${fileUri}`);
        }
      };
      reader.readAsDataURL(response.data);

    } catch (error) {
      Alert.alert("Export Error", error.response?.data?.error || "Failed to export reports");
    } finally {
      setExporting(false);
    }
  };

  // Submit feedback (PRL only)
  const submitFeedback = async (id) => {
    const feedback = feedbackMap[id];

    if (!feedback || !feedback.trim()) {
      Alert.alert("Error", "Please enter feedback first");
      return;
    }

    try {
      const response = await api.put(`/reports/${id}/feedback`, { prlFeedback: feedback });
      if (response.data.success) {
        Alert.alert("Success", "Feedback saved");

        setFeedbackMap(prev => ({ ...prev, [id]: "" }));

        setReports(prev =>
          prev.map(r =>
            r.id === id
              ? { ...r, prlFeedback: feedback, status: "reviewed" }
              : r
          )
        );
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit feedback");
    }
  };

  const ReportDetails = ({ report, onClose }) => {
    return (
      <ScrollView style={styles.fullView}>
        <Text style={styles.title}>📄 Full Report</Text>

        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: "#60a5fa", marginBottom: 10 }}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.item}>Course: {report.courseName} ({report.courseCode})</Text>
        <Text style={styles.item}>Lecturer: {report.lecturerName}</Text>
        <Text style={styles.item}>Faculty: {report.facultyName}</Text>
        <Text style={styles.item}>Class: {report.className}</Text>
        <Text style={styles.item}>Venue: {report.venue}</Text>
        <Text style={styles.item}>Time: {report.scheduledTime}</Text>
        <Text style={styles.item}>Week: {report.week}</Text>
        <Text style={styles.item}>Date: {report.date}</Text>
        <Text style={styles.item}>Topic: {report.topic}</Text>
        <Text style={styles.item}>Outcomes: {report.outcomes}</Text>
        <Text style={styles.item}>Recommendations: {report.recommendations}</Text>
        <Text style={styles.item}>
          Attendance: {report.actualPresent}/{report.totalRegistered}
        </Text>
        <Text style={styles.feedbackBox}>
          PRL Feedback: {report.prlFeedback || "No feedback yet"}
        </Text>
      </ScrollView>
    );
  };

  useEffect(() => {
    const init = async () => {
      const userRole = await getUserRole();
      
      if (userRole === "prl") {
        await loadPendingReports();
      } else if (userRole === "pl") {
        await loadReviewedReports();
      } else {
        await loadReports();
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={{ color: "white", marginTop: 10 }}>Loading Reports...</Text>
      </View>
    );
  }

  if (selectedReport) {
    return (
      <ReportDetails
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    );
  }

  // ========== PRL VIEW (Can give feedback) ==========
  if (role === "prl") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>📊 PRL Review Dashboard</Text>
          <Text style={styles.subtitle}>Review pending reports</Text>
        </View>

        {reports.length === 0 ? (
          <Text style={styles.emptyText}>No pending reports.</Text>
        ) : (
          reports.map(r => (
            <View key={r.id} style={styles.card}>
              <TouchableOpacity onPress={() => setSelectedReport(r)}>
                <Text style={styles.text}>
                  {r.courseName} ({r.courseCode})
                </Text>
                <Text style={styles.sub}>Lecturer: {r.lecturerName}</Text>
                <Text style={styles.sub}>Class: {r.className}</Text>
                <Text style={styles.sub}>Topic: {r.topic}</Text>
                <Text style={styles.sub}>Week: {r.week}</Text>
                <Text style={styles.status}>
                  Status: {r.status || "pending"}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Enter PRL feedback..."
                placeholderTextColor="#94a3b8"
                value={feedbackMap[r.id] || ""}
                onChangeText={(t) =>
                  setFeedbackMap(prev => ({ ...prev, [r.id]: t }))
                }
              />

              <TouchableOpacity
                style={styles.btn}
                onPress={() => submitFeedback(r.id)}
              >
                <Text style={styles.btnText}>Submit Feedback</Text>
              </TouchableOpacity>

              {r.prlFeedback && (
                <Text style={styles.feedback}>
                  Previous Feedback: {r.prlFeedback}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  // ========== PL VIEW (View only, no feedback) ==========
  if (role === "pl") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>📘 PL Final Reports</Text>
          
          <TouchableOpacity 
            style={styles.exportBtn} 
            onPress={exportReports}
            disabled={exporting}
          >
            <Text style={styles.exportBtnText}>
              {exporting ? "⏳" : "📊"} {exporting ? "Exporting..." : "Export"}
            </Text>
          </TouchableOpacity>
        </View>

        {reports.length === 0 ? (
          <Text style={styles.emptyText}>No reviewed reports yet.</Text>
        ) : (
          reports.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.card}
              onPress={() => setSelectedReport(r)}
            >
              <Text style={styles.text}>
                {r.courseName} ({r.courseCode})
              </Text>
              <Text style={styles.sub}>Lecturer: {r.lecturerName}</Text>
              <Text style={styles.sub}>Class: {r.className}</Text>
              <Text style={styles.sub}>Topic: {r.topic}</Text>
              <Text style={styles.sub}>Week: {r.week}</Text>
              <Text style={styles.status}>
                Status: {r.status || "pending"}
              </Text>
              {r.prlFeedback && (
                <Text style={styles.feedback}>
                  PRL Feedback: {r.prlFeedback}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  // ========== LECTURER VIEW (View own reports) ==========
  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>📘 My Lecture Reports</Text>
        
        <TouchableOpacity 
          style={styles.exportBtn} 
          onPress={exportReports}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>
            {exporting ? "⏳" : "📊"} {exporting ? "Exporting..." : "Export"}
          </Text>
        </TouchableOpacity>
      </View>

      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No reports submitted yet.</Text>
      ) : (
        reports.map(r => (
          <TouchableOpacity
            key={r.id}
            style={styles.card}
            onPress={() => setSelectedReport(r)}
          >
            <Text style={styles.text}>
              {r.courseName} ({r.courseCode})
            </Text>
            <Text style={styles.sub}>Class: {r.className}</Text>
            <Text style={styles.sub}>Topic: {r.topic}</Text>
            <Text style={styles.sub}>Week: {r.week}</Text>
            <Text style={styles.status}>
              Status: {r.status || "pending"}
            </Text>
            {r.prlFeedback && (
              <Text style={styles.feedback}>
                PRL Feedback: {r.prlFeedback}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1220",
    padding: 15,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b1220",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
    marginLeft: 10,
  },
  exportBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  card: {
    backgroundColor: "#111c3a",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  text: {
    color: "#60a5fa",
    fontWeight: "bold",
  },
  sub: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },
  status: {
    color: "#fbbf24",
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#1e293b",
    color: "white",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  btn: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
  },
  feedback: {
    color: "#4ade80",
    marginTop: 8,
    fontSize: 12,
  },
  fullView: {
    flex: 1,
    backgroundColor: "#0b1220",
    padding: 15,
  },
  item: {
    color: "white",
    marginBottom: 8,
  },
  feedbackBox: {
    marginTop: 10,
    color: "#fbbf24",
    fontWeight: "bold",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
});
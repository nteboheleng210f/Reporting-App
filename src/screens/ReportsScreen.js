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
  Platform,
  Modal,
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTarget, setExportTarget] = useState(null);

  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

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

  const exportSingleReport = async (report, format) => {
    if (exporting) return;
    
    setExporting(true);
    setShowExportModal(false);
    
    try {
      const endpoint = format === 'excel' 
        ? `/reports/export/${report.id}/excel` 
        : `/reports/export/${report.id}/pdf`;
      const fileExtension = format === 'excel' ? 'xlsx' : 'pdf';
      const mimeType = format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const response = await api.get(endpoint, {
        responseType: "blob",
        timeout: 30000,
      });

      const date = new Date();
      const filename = `${report.courseCode}_report_week${report.week}.${fileExtension}`;
      
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Alert.alert("Success", `Report exported as ${format.toUpperCase()}`);
        setExporting(false);
        return;
      }
      
      const fileUri = FileSystem.documentDirectory + filename;
      
      const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      
      const base64Data = await blobToBase64(response.data);
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: `Export Report as ${format.toUpperCase()}`,
        });
        Alert.alert("Success", `Report exported as ${format.toUpperCase()}`);
      } else {
        Alert.alert("Success", `Report saved to ${fileUri}`);
      }
      
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Error", error.response?.data?.error || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const exportAllReports = async (format) => {
    if (exporting) return;
    
    setExporting(true);
    
    try {
      const endpoint = format === 'excel' ? "/reports/export/all/excel" : "/reports/export/all/pdf";
      const fileExtension = format === 'excel' ? 'xlsx' : 'pdf';
      const mimeType = format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const response = await api.get(endpoint, {
        responseType: "blob",
        timeout: 60000,
      });

      const date = new Date();
      const filename = `all_reports_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.${fileExtension}`;
      
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Alert.alert("Success", `All reports exported as ${format.toUpperCase()}`);
        setExporting(false);
        return;
      }
      
      const fileUri = FileSystem.documentDirectory + filename;
      
      const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      
      const base64Data = await blobToBase64(response.data);
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: `Export All Reports as ${format.toUpperCase()}`,
        });
        Alert.alert("Success", `All reports exported as ${format.toUpperCase()}`);
      } else {
        Alert.alert("Success", `Reports saved to ${fileUri}`);
      }
      
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Error", error.response?.data?.error || "Failed to export reports");
    } finally {
      setExporting(false);
    }
  };

  const SingleExportModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showExportModal}
      onRequestClose={() => {
        setShowExportModal(false);
        setExportTarget(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Export Report</Text>
          <Text style={styles.modalSubtitle}>
            {exportTarget?.courseName}
          </Text>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={() => exportSingleReport(exportTarget, 'excel')}
            disabled={exporting}
          >
            <Text style={styles.modalOptionIcon}>📊</Text>
            <View style={styles.modalOptionTextContainer}>
              <Text style={styles.modalOptionTitle}>Microsoft Excel</Text>
              <Text style={styles.modalOptionDesc}>Export as .xlsx spreadsheet</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={() => exportSingleReport(exportTarget, 'pdf')}
            disabled={exporting}
          >
            <Text style={styles.modalOptionIcon}>📄</Text>
            <View style={styles.modalOptionTextContainer}>
              <Text style={styles.modalOptionTitle}>PDF Document</Text>
              <Text style={styles.modalOptionDesc}>Export as .pdf document</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, styles.cancelButton]}
            onPress={() => {
              setShowExportModal(false);
              setExportTarget(null);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportDetailBtn}
            onPress={() => {
              setExportTarget(report);
              setShowExportModal(true);
            }}
          >
            <Text style={styles.exportDetailBtnText}>📊 Export</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.title}>Full Report</Text>
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
      <>
        <ReportDetails
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
        <SingleExportModal />
      </>
    );
  }

  if (role === "prl") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>PRL Review Dashboard</Text>
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
        <SingleExportModal />
      </ScrollView>
    );
  }

  if (role === "pl") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>PL Final Reports</Text>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.exportAllBtn, exporting && styles.exportBtnDisabled]} 
              onPress={() => exportAllReports('excel')}
              disabled={exporting}
            >
              <Text style={styles.exportAllBtnText}>
                {exporting ? "..." : "📊 All Excel"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportAllBtn, exporting && styles.exportBtnDisabled]} 
              onPress={() => exportAllReports('pdf')}
              disabled={exporting}
            >
              <Text style={styles.exportAllBtnText}>
                {exporting ? "..." : "📄 All PDF"}
              </Text>
            </TouchableOpacity>
          </View>
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
              <View style={styles.cardHeader}>
                <Text style={styles.text}>
                  {r.courseName} ({r.courseCode})
                </Text>
                <TouchableOpacity 
                  style={styles.smallExportBtn}
                  onPress={() => {
                    setExportTarget(r);
                    setShowExportModal(true);
                  }}
                >
                  <Text style={styles.smallExportBtnText}>Export</Text>
                </TouchableOpacity>
              </View>
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
        <SingleExportModal />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Reports</Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.exportAllBtn, exporting && styles.exportBtnDisabled]} 
            onPress={() => exportAllReports('excel')}
            disabled={exporting}
          >
            <Text style={styles.exportAllBtnText}>
              {exporting ? "..." : "📊 All Excel"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.exportAllBtn, exporting && styles.exportBtnDisabled]} 
            onPress={() => exportAllReports('pdf')}
            disabled={exporting}
          >
            <Text style={styles.exportAllBtnText}>
              {exporting ? "..." : "📄 All PDF"}
            </Text>
          </TouchableOpacity>
        </View>
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
            <View style={styles.cardHeader}>
              <Text style={styles.text}>
                {r.courseName} ({r.courseCode})
              </Text>
              <TouchableOpacity 
                style={styles.smallExportBtn}
                onPress={() => {
                  setExportTarget(r);
                  setShowExportModal(true);
                }}
              >
                <Text style={styles.smallExportBtnText}>Export</Text>
              </TouchableOpacity>
            </View>
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
      <SingleExportModal />
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
  headerButtons: {
    flexDirection: "row",
    gap: 8,
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
  exportAllBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportAllBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  exportBtnDisabled: {
    backgroundColor: "#475569",
    opacity: 0.7,
  },
  card: {
    backgroundColor: "#111c3a",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  smallExportBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  smallExportBtnText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  text: {
    color: "#60a5fa",
    fontWeight: "bold",
    flex: 1,
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
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  backButton: {
    color: "#60a5fa",
    fontSize: 16,
  },
  exportDetailBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportDetailBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalOptionIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  modalOptionTextContainer: {
    flex: 1,
  },
  modalOptionTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalOptionDesc: {
    color: "#94a3b8",
    fontSize: 12,
  },
  cancelButton: {
    backgroundColor: "#475569",
    justifyContent: "center",
    borderWidth: 0,
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
});
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
  Modal,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import api from "../services/api";
import StructuredFeedbackModal from "../../components/Feedback";

export default function ReportsScreen() {
  const [role, setRole] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedReportForFeedback, setSelectedReportForFeedback] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    lecturerId: "",
    courseId: "",
    status: "",
  });
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);

  // Get user role
  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const [lecturersRes, coursesRes] = await Promise.all([
        api.get("/courses/lecturers"),
        api.get("/courses"),
      ]);
      if (lecturersRes.data.success) setLecturers(lecturersRes.data.lecturers);
      if (coursesRes.data.success) setCourses(coursesRes.data.courses);
    } catch (error) {
      console.log("Failed to load filter options");
    }
  };

  // Apply filters
  const getFilteredReports = () => {
    let filtered = [...reports];
    
    if (filters.startDate) {
      filtered = filtered.filter(r => new Date(r.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filtered = filtered.filter(r => new Date(r.date) <= new Date(filters.endDate));
    }
    if (filters.lecturerId) {
      filtered = filtered.filter(r => r.lecturerId === filters.lecturerId);
    }
    if (filters.courseId) {
      filtered = filtered.filter(r => r.courseId === filters.courseId);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    
    return filtered;
  };

  // Load reports with pagination
  const loadReportsPaginated = async (isLoadMore = false) => {
    if (isLoadMore && (!hasMore || loadingMore)) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      let url = `/reports/paginated?limit=10`;
      if (nextCursor && isLoadMore) {
        url = `/reports/paginated?limit=10&startAfter=${nextCursor}`;
      }
      
      const response = await api.get(url);
      if (response.data.success) {
        if (isLoadMore) {
          setReports(prev => [...prev, ...response.data.reports]);
        } else {
          setReports(response.data.reports);
        }
        setHasMore(response.data.hasMore);
        setNextCursor(response.data.nextCursor);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load pending reports with pagination (PRL)
  const loadPendingReportsPaginated = async (isLoadMore = false) => {
    if (isLoadMore && (!hasMore || loadingMore)) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      let url = `/reports/pending/paginated?limit=10`;
      if (nextCursor && isLoadMore) {
        url = `/reports/pending/paginated?limit=10&startAfter=${nextCursor}`;
      }
      
      const response = await api.get(url);
      if (response.data.success) {
        if (isLoadMore) {
          setReports(prev => [...prev, ...response.data.reports]);
        } else {
          setReports(response.data.reports);
        }
        setHasMore(response.data.hasMore);
        setNextCursor(response.data.nextCursor);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load reviewed reports (PL)
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

  // Load lecturer's own reports
  const loadMyReports = async () => {
    try {
      const response = await api.get("/reports/my");
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    setExporting(true);
    setShowExportModal(false);
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
      Alert.alert("Export Error", "Failed to export reports");
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true);
    setShowExportModal(false);
    try {
      const filteredReports = getFilteredReports();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lecture Reports</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #0f1f3d; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #0f1f3d; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Lecture Reports Summary</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Reports: ${filteredReports.length}</p>
          <table>
            <thead><tr>
              <th>Course</th><th>Lecturer</th><th>Topic</th><th>Date</th><th>Attendance</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${filteredReports.map(r => `
                <tr>
                  <td>${r.courseName || ''}</td>
                  <td>${r.lecturerName || ''}</td>
                  <td>${r.topic || ''}</td>
                  <td>${r.date || ''}</td>
                  <td>${r.actualPresent || 0}/${r.totalRegistered || 0}</td>
                  <td>${r.status || 'pending'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Success", `PDF saved to ${uri}`);
      }
    } catch (error) {
      Alert.alert("Export Error", "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  // Submit structured feedback
  const handleStructuredFeedback = async (feedbackData) => {
    if (!selectedReportForFeedback) return;
    
    setSubmittingFeedback(true);
    try {
      const response = await api.post(
        `/reports/${selectedReportForFeedback.id}/structured-feedback`,
        feedbackData
      );
      
      if (response.data.success) {
        Alert.alert("Success", response.data.message);
        setShowFeedbackModal(false);
        setSelectedReportForFeedback(null);
        await loadPendingReportsPaginated();
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Filter Modal
  const FilterModal = () => (
    <Modal visible={showFilters} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <Text style={styles.modalTitle}>Filter Reports</Text>
          
          <Text style={styles.filterLabel}>Start Date</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748b"
            value={filters.startDate}
            onChangeText={(text) => setFilters({...filters, startDate: text})}
          />
          
          <Text style={styles.filterLabel}>End Date</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748b"
            value={filters.endDate}
            onChangeText={(text) => setFilters({...filters, endDate: text})}
          />
          
          <Text style={styles.filterLabel}>Lecturer</Text>
          <Picker
            selectedValue={filters.lecturerId}
            onValueChange={(value) => setFilters({...filters, lecturerId: value})}
            style={styles.picker}
          >
            <Picker.Item label="All Lecturers" value="" />
            {lecturers.map(l => (
              <Picker.Item key={l.id} label={l.username || l.email} value={l.id} />
            ))}
          </Picker>
          
          <Text style={styles.filterLabel}>Course</Text>
          <Picker
            selectedValue={filters.courseId}
            onValueChange={(value) => setFilters({...filters, courseId: value})}
            style={styles.picker}
          >
            <Picker.Item label="All Courses" value="" />
            {courses.map(c => (
              <Picker.Item key={c.id} label={c.courseName} value={c.id} />
            ))}
          </Picker>
          
          <Text style={styles.filterLabel}>Status</Text>
          <Picker
            selectedValue={filters.status}
            onValueChange={(value) => setFilters({...filters, status: value})}
            style={styles.picker}
          >
            <Picker.Item label="All" value="" />
            <Picker.Item label="Pending" value="pending" />
            <Picker.Item label="Reviewed" value="reviewed" />
            <Picker.Item label="Revision Needed" value="revision_needed" />
          </Picker>
          
          <View style={styles.filterButtons}>
            <TouchableOpacity onPress={() => {
              setFilters({startDate: "", endDate: "", lecturerId: "", courseId: "", status: ""});
              setShowFilters(false);
            }}>
              <Text style={styles.clearFilterText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFilterBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyFilterText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Export Modal
  const ExportModal = () => (
    <Modal visible={showExportModal} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Export Reports</Text>
          <Text style={styles.modalSubtitle}>Choose export format</Text>
          
          <TouchableOpacity style={styles.exportOption} onPress={exportToExcel}>
            <Text style={styles.exportOptionIcon}>📊</Text>
            <View style={styles.exportOptionText}>
              <Text style={styles.exportOptionTitle}>Excel Format</Text>
              <Text style={styles.exportOptionDesc}>Export as .xlsx file</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportOption} onPress={exportToPDF}>
            <Text style={styles.exportOptionIcon}>📄</Text>
            <View style={styles.exportOptionText}>
              <Text style={styles.exportOptionTitle}>PDF Format</Text>
              <Text style={styles.exportOptionDesc}>Export for printing</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExportModal(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const ReportDetails = ({ report, onClose }) => (
    <ScrollView style={styles.fullView}>
      <View style={styles.fullViewHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.fullViewTitle}>Full Report</Text>
      </View>
      
      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Course:</Text>
        <Text style={styles.detailValue}>{report.courseName} ({report.courseCode})</Text>
        
        <Text style={styles.detailLabel}>Lecturer:</Text>
        <Text style={styles.detailValue}>{report.lecturerName}</Text>
        
        <Text style={styles.detailLabel}>Faculty:</Text>
        <Text style={styles.detailValue}>{report.facultyName}</Text>
        
        <Text style={styles.detailLabel}>Class:</Text>
        <Text style={styles.detailValue}>{report.className}</Text>
        
        <Text style={styles.detailLabel}>Venue & Time:</Text>
        <Text style={styles.detailValue}>{report.venue} • {report.scheduledTime}</Text>
        
        <Text style={styles.detailLabel}>Week & Date:</Text>
        <Text style={styles.detailValue}>Week {report.week} • {report.date}</Text>
        
        <Text style={styles.detailLabel}>Topic:</Text>
        <Text style={styles.detailValue}>{report.topic}</Text>
        
        <Text style={styles.detailLabel}>Learning Outcomes:</Text>
        <Text style={styles.detailValue}>{report.outcomes || "Not specified"}</Text>
        
        <Text style={styles.detailLabel}>Recommendations:</Text>
        <Text style={styles.detailValue}>{report.recommendations || "None"}</Text>
        
        <Text style={styles.detailLabel}>Attendance:</Text>
        <Text style={styles.detailValue}>{report.actualPresent}/{report.totalRegistered} students</Text>
        
        <View style={styles.feedbackSection}>
          <Text style={styles.detailLabel}>PRL Feedback:</Text>
          <Text style={styles.feedbackText}>{report.prlFeedback || "No feedback yet"}</Text>
        </View>
      </View>
    </ScrollView>
  );

  useEffect(() => {
    const init = async () => {
      const userRole = await getUserRole();
      await loadFilterOptions();
      
      if (userRole === "prl") {
        await loadPendingReportsPaginated();
      } else if (userRole === "pl") {
        await loadReviewedReports();
      } else if (userRole === "lecturer") {
        await loadMyReports();
      } else {
        await loadReportsPaginated();
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
    return <ReportDetails report={selectedReport} onClose={() => setSelectedReport(null)} />;
  }

  const filteredReports = getFilteredReports();
  const displayReports = showFilters ? filteredReports : reports;

  // PRL View
  if (role === "prl") {
    return (
      <View style={styles.container}>
        <ExportModal />
        <FilterModal />
        <StructuredFeedbackModal
          visible={showFeedbackModal}
          report={selectedReportForFeedback}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedReportForFeedback(null);
          }}
          onSubmit={handleStructuredFeedback}
          submitting={submittingFeedback}
        />
        
        <View style={styles.headerRow}>
          <Text style={styles.title}>📊 PRL Review Dashboard</Text>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterBtnText}>🔍 Filter</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>Review pending reports</Text>

        <FlatList
          data={displayReports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => setSelectedReport(item)}>
                <Text style={styles.text}>{item.courseName} ({item.courseCode})</Text>
                <Text style={styles.sub}>Lecturer: {item.lecturerName}</Text>
                <Text style={styles.sub}>Class: {item.className}</Text>
                <Text style={styles.sub}>Topic: {item.topic}</Text>
                <Text style={styles.sub}>Week: {item.week}</Text>
                <Text style={[styles.status, item.status === 'pending' && styles.statusPending]}>
                  Status: {item.status || "pending"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => {
                  setSelectedReportForFeedback(item);
                  setShowFeedbackModal(true);
                }}
              >
                <Text style={styles.btnText}>Give Structured Feedback</Text>
              </TouchableOpacity>

              {item.prlFeedback && (
                <Text style={styles.feedback}>Previous: {item.prlFeedback}</Text>
              )}
            </View>
          )}
          onEndReached={() => loadPendingReportsPaginated(true)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} /> : null}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending reports.</Text>}
        />
      </View>
    );
  }

  // PL View
  if (role === "pl") {
    return (
      <View style={styles.container}>
        <ExportModal />
        <FilterModal />
        
        <View style={styles.headerRow}>
          <Text style={styles.title}>📘 PL Final Reports</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
              <Text style={styles.filterBtnText}>🔍 Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportModal(true)} disabled={exporting}>
              <Text style={styles.exportBtnText}>{exporting ? "⏳" : "📊"} Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={displayReports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedReport(item)}>
              <Text style={styles.text}>{item.courseName} ({item.courseCode})</Text>
              <Text style={styles.sub}>Lecturer: {item.lecturerName}</Text>
              <Text style={styles.sub}>Class: {item.className}</Text>
              <Text style={styles.sub}>Topic: {item.topic}</Text>
              <Text style={[styles.status, item.status === 'reviewed' && styles.statusReviewed]}>
                Status: {item.status || "pending"}
              </Text>
              {item.prlFeedback && <Text style={styles.feedback}>PRL: {item.prlFeedback}</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No reviewed reports yet.</Text>}
        />
      </View>
    );
  }

  // Lecturer View
  return (
    <View style={styles.container}>
      <ExportModal />
      <FilterModal />
      
      <View style={styles.headerRow}>
        <Text style={styles.title}>📘 My Lecture Reports</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterBtnText}>🔍 Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportModal(true)} disabled={exporting}>
            <Text style={styles.exportBtnText}>{exporting ? "⏳" : "📊"} Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayReports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedReport(item)}>
            <Text style={styles.text}>{item.courseName} ({item.courseCode})</Text>
            <Text style={styles.sub}>Class: {item.className}</Text>
            <Text style={styles.sub}>Topic: {item.topic}</Text>
            <Text style={[styles.status, item.status === 'pending' && styles.statusPending]}>
              Status: {item.status || "pending"}
            </Text>
            {item.prlFeedback && <Text style={styles.feedback}>PRL Feedback: {item.prlFeedback}</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No reports submitted yet.</Text>}
      />
    </View>
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
    marginBottom: 5,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 15,
  },
  filterBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterBtnText: {
    color: "white",
    fontSize: 12,
  },
  exportBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
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
    fontSize: 12,
    marginTop: 4,
  },
  statusPending: {
    color: "#fbbf24",
  },
  statusReviewed: {
    color: "#4ade80",
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
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    width: "85%",
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 15,
  },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  exportOptionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  exportOptionDesc: {
    color: "#94a3b8",
    fontSize: 11,
  },
  cancelBtn: {
    backgroundColor: "#334155",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "white",
  },
  // Filter Modal
  filterModal: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    width: "90%",
  },
  filterLabel: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  filterInput: {
    backgroundColor: "#0f172a",
    color: "white",
    padding: 10,
    borderRadius: 8,
  },
  picker: {
    backgroundColor: "#0f172a",
    color: "white",
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  clearFilterText: {
    color: "#ef4444",
    padding: 10,
  },
  applyFilterBtn: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 8,
  },
  applyFilterText: {
    color: "white",
  },
  // Full Report View
  fullView: {
    flex: 1,
    backgroundColor: "#0b1220",
    padding: 15,
  },
  fullViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    color: "#60a5fa",
    fontSize: 16,
    marginRight: 15,
  },
  fullViewTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  detailSection: {
    backgroundColor: "#111c3a",
    padding: 15,
    borderRadius: 12,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 2,
  },
  detailValue: {
    color: "white",
    fontSize: 14,
    marginBottom: 8,
  },
  feedbackSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 10,
  },
  feedbackText: {
    color: "#fbbf24",
    fontSize: 13,
  },
});
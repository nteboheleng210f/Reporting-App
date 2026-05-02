import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";

const C = {
  navy: "#0f1f3d",
  gold: "#c9a84c",
  white: "#ffffff",
  bg: "#f5f7fb",
  card: "#ffffff",
  border: "#e4e8f0",
  text: "#102040",
  muted: "#6c7a96",
  danger: "#dc2626",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",
};

// CRUD Modal Component
function CRUDModal({ visible, onClose, title, fields, onSubmit, initialData = {} }) {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setFormData(initialData);
    }
  }, [visible, initialData]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <Text style={s.modalTitle}>{title}</Text>
          
          {fields.map((field) => (
            <View key={field.name} style={s.inputGroup}>
              <Text style={s.inputLabel}>{field.label}</Text>
              {field.multiline ? (
                <TextInput
                  style={[s.input, s.textArea]}
                  value={formData[field.name] || ""}
                  onChangeText={(text) => setFormData({ ...formData, [field.name]: text })}
                  placeholder={field.placeholder}
                  multiline
                  numberOfLines={4}
                />
              ) : (
                <TextInput
                  style={s.input}
                  value={formData[field.name] || ""}
                  onChangeText={(text) => setFormData({ ...formData, [field.name]: text })}
                  placeholder={field.placeholder}
                  keyboardType={field.type || "default"}
                />
              )}
            </View>
          ))}
          
          <View style={s.modalButtons}>
            <TouchableOpacity style={[s.modalBtn, s.modalBtnCancel]} onPress={onClose}>
              <Text style={s.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalBtn, s.modalBtnSubmit]} onPress={handleSubmit}>
              {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.modalBtnText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// List Item Component
function ListItem({ item, type, onEdit, onDelete, onView }) {
  const getTitle = () => {
    switch (type) {
      case "course":
        return item.name;
      case "class":
        return item.className;
      case "report":
        return `Report - ${item.date || new Date(item.createdAt).toLocaleDateString()}`;
      case "rating":
        return `${item.lecturerName || "Lecturer"} - ${item.rating}★`;
      default:
        return item.name || item.title;
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case "course":
        return `Code: ${item.code} | Lecturer: ${item.lecturerName || "Unassigned"}`;
      case "class":
        return `Course: ${item.courseName} | Students: ${item.studentCount || 0}`;
      case "report":
        return `Status: ${item.status} | Present: ${item.actualPresent}/${item.totalRegistered}`;
      case "rating":
        return item.comment || "No comment provided";
      default:
        return item.description || "";
    }
  };

  return (
    <TouchableOpacity style={s.listItem} onPress={() => onView?.(item)}>
      <View style={s.listItemContent}>
        <Text style={s.listItemTitle}>{getTitle()}</Text>
        <Text style={s.listItemSubtitle}>{getSubtitle()}</Text>
      </View>
      <View style={s.listItemActions}>
        {onEdit && (
          <TouchableOpacity style={s.actionBtn} onPress={() => onEdit(item)}>
            <Text style={s.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => onDelete(item)}>
            <Text style={[s.actionBtnText, s.actionBtnTextDanger]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function PRLDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    courses: 0,
    lecturers: 0,
    pendingReports: 0,
    reviewedReports: 0,
    totalStudents: 0,
    totalClasses: 0,
  });
  
  // Data states
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  const fetchAllData = async () => {
    try {
      const [statsRes, coursesRes, classesRes, reportsRes, ratingsRes, lecturersRes] = await Promise.all([
        api.get("/prl/stats"),
        api.get("/prl/courses"),
        api.get("/prl/classes"),
        api.get("/prl/reports"),
        api.get("/prl/ratings"),
        api.get("/prl/lecturers"),
      ]);
      
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (coursesRes.data.success) setCourses(coursesRes.data.courses);
      if (classesRes.data.success) setClasses(classesRes.data.classes);
      if (reportsRes.data.success) setReports(reportsRes.data.reports);
      if (ratingsRes.data.success) setRatings(ratingsRes.data.ratings);
      if (lecturersRes.data.success) setLecturers(lecturersRes.data.lecturers);
    } catch (error) {
      console.log("Error fetching data:", error);
      Alert.alert("Error", "Failed to load data");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/prl/stats");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.log("Error fetching stats:", error);
    }
  };

  const getUserName = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setUserName(user.username || user.email || "PRL");
    }
  };

  const loadData = async () => {
    setLoading(true);
    await fetchAllData();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useEffect(() => {
    getUserName();
    loadData();
  }, []);

  // CRUD Operations
  const handleCreateCourse = async (data) => {
    const response = await api.post("/prl/courses", data);
    if (response.data.success) {
      await fetchAllData();
      Alert.alert("Success", "Course created successfully");
    }
  };

  const handleUpdateCourse = async (data) => {
    const response = await api.put(`/prl/courses/${data.id}`, data);
    if (response.data.success) {
      await fetchAllData();
      Alert.alert("Success", "Course updated successfully");
    }
  };

  const handleDeleteCourse = (course) => {
    Alert.alert(
      "Delete Course",
      `Are you sure you want to delete "${course.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const response = await api.delete(`/prl/courses/${course.id}`);
            if (response.data.success) {
              await fetchAllData();
              Alert.alert("Success", "Course deleted successfully");
            }
          },
        },
      ]
    );
  };

  const handleCreateClass = async (data) => {
    const response = await api.post("/prl/classes", data);
    if (response.data.success) {
      await fetchAllData();
      Alert.alert("Success", "Class created successfully");
    }
  };

  const handleUpdateClass = async (data) => {
    const response = await api.put(`/prl/classes/${data.id}`, data);
    if (response.data.success) {
      await fetchAllData();
      Alert.alert("Success", "Class updated successfully");
    }
  };

  const handleDeleteClass = (classItem) => {
    Alert.alert(
      "Delete Class",
      `Are you sure you want to delete "${classItem.className}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const response = await api.delete(`/prl/classes/${classItem.id}`);
            if (response.data.success) {
              await fetchAllData();
              Alert.alert("Success", "Class deleted successfully");
            }
          },
        },
      ]
    );
  };

  const handleReviewReport = async (report) => {
    navigation.navigate("ReportReview", { reportId: report.id });
  };

  const handleDeleteReport = (report) => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to delete this report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const response = await api.delete(`/prl/reports/${report.id}`);
            if (response.data.success) {
              await fetchAllData();
              Alert.alert("Success", "Report deleted successfully");
            }
          },
        },
      ]
    );
  };

  const openCreateModal = (type) => {
    setEditingItem(null);
    setModalType(type);
    setModalVisible(true);
  };

  const openEditModal = (type, item) => {
    setEditingItem(item);
    setModalType(type);
    setModalVisible(true);
  };

  const getModalFields = () => {
    switch (modalType) {
      case "course":
        return [
          { name: "name", label: "Course Name", placeholder: "Enter course name" },
          { name: "code", label: "Course Code", placeholder: "e.g., CS101" },
          { name: "description", label: "Description", placeholder: "Course description", multiline: true },
          { name: "credits", label: "Credits", placeholder: "3", type: "numeric" },
        ];
      case "class":
        return [
          { name: "className", label: "Class Name", placeholder: "Enter class name" },
          { name: "courseId", label: "Course ID", placeholder: "Associated course ID" },
          { name: "schedule", label: "Schedule", placeholder: "Mon/Wed 10:00 AM" },
          { name: "room", label: "Room", placeholder: "Room number" },
        ];
      default:
        return [];
    }
  };

  const handleModalSubmit = async (data) => {
    if (editingItem) {
      if (modalType === "course") await handleUpdateCourse({ ...data, id: editingItem.id });
      if (modalType === "class") await handleUpdateClass({ ...data, id: editingItem.id });
    } else {
      if (modalType === "course") await handleCreateCourse(data);
      if (modalType === "class") await handleCreateClass(data);
    }
    setModalVisible(false);
    setEditingItem(null);
  };

  const renderOverview = () => (
    <>
      <View style={s.statsGrid}>
        <View style={s.statCard}>
          <Text style={s.statCardNum}>{stats.courses}</Text>
          <Text style={s.statCardLabel}>Courses</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statCardNum}>{stats.totalClasses}</Text>
          <Text style={s.statCardLabel}>Classes</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statCardNum}>{stats.lecturers}</Text>
          <Text style={s.statCardLabel}>Lecturers</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statCardNum}>{stats.totalStudents}</Text>
          <Text style={s.statCardLabel}>Students</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statCardNum, { color: C.warning }]}>{stats.pendingReports}</Text>
          <Text style={s.statCardLabel}>Pending</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statCardNum, { color: C.success }]}>{stats.reviewedReports}</Text>
          <Text style={s.statCardLabel}>Reviewed</Text>
        </View>
      </View>

      <View style={s.quickActions}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionGrid}>
          <TouchableOpacity style={s.actionCard} onPress={() => openCreateModal("course")}>
            <Text style={s.actionIcon}>📚</Text>
            <Text style={s.actionLabel}>Add Course</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={() => openCreateModal("class")}>
            <Text style={s.actionIcon}>👨‍🎓</Text>
            <Text style={s.actionLabel}>Add Class</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate("AssignLecturer")}>
            <Text style={s.actionIcon}>👨‍🏫</Text>
            <Text style={s.actionLabel}>Assign Lecturer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate("BulkUpload")}>
            <Text style={s.actionIcon}>📤</Text>
            <Text style={s.actionLabel}>Bulk Upload</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderCourses = () => (
    <View style={s.tabContent}>
      <TouchableOpacity style={s.addButton} onPress={() => openCreateModal("course")}>
        <Text style={s.addButtonText}>+ Add Course</Text>
      </TouchableOpacity>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem
            item={item}
            type="course"
            onEdit={() => openEditModal("course", item)}
            onDelete={handleDeleteCourse}
            onView={(course) => navigation.navigate("CourseDetails", { courseId: course.id })}
          />
        )}
        ListEmptyComponent={<Text style={s.emptyText}>No courses found</Text>}
      />
    </View>
  );

  const renderClasses = () => (
    <View style={s.tabContent}>
      <TouchableOpacity style={s.addButton} onPress={() => openCreateModal("class")}>
        <Text style={s.addButtonText}>+ Add Class</Text>
      </TouchableOpacity>
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem
            item={item}
            type="class"
            onEdit={() => openEditModal("class", item)}
            onDelete={handleDeleteClass}
            onView={(classItem) => navigation.navigate("ClassDetails", { classId: classItem.id })}
          />
        )}
        ListEmptyComponent={<Text style={s.emptyText}>No classes found</Text>}
      />
    </View>
  );

  const renderReports = () => (
    <View style={s.tabContent}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem
            item={item}
            type="report"
            onEdit={() => handleReviewReport(item)}
            onDelete={handleDeleteReport}
            onView={(report) => navigation.navigate("ReportDetails", { reportId: report.id })}
          />
        )}
        ListEmptyComponent={<Text style={s.emptyText}>No reports found</Text>}
      />
    </View>
  );

  const renderRatings = () => (
    <View style={s.tabContent}>
      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem
            item={item}
            type="rating"
            onView={(rating) => navigation.navigate("RatingDetails", { ratingId: rating.id })}
          />
        )}
        ListEmptyComponent={<Text style={s.emptyText}>No ratings found</Text>}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.header}>
          <Text style={s.eyebrow}>Principal Lecturer</Text>
          <Text style={s.headerTitle}>{userName}</Text>
          <Text style={s.headerSub}>Supervisor Dashboard</Text>
        </View>

        {/* Tab Navigation */}
        <View style={s.tabBar}>
          {["overview", "courses", "classes", "reports", "ratings"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.body}>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "courses" && renderCourses()}
          {activeTab === "classes" && renderClasses()}
          {activeTab === "reports" && renderReports()}
          {activeTab === "ratings" && renderRatings()}
        </View>
      </ScrollView>

      <CRUDModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
        title={`${editingItem ? "Edit" : "Add"} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`}
        fields={getModalFields()}
        onSubmit={handleModalSubmit}
        initialData={editingItem || {}}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  loadingText: { color: C.muted, fontSize: 14, marginTop: 10 },

  header: {
    backgroundColor: C.navy,
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  eyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 1.2, color: C.gold, marginBottom: 6 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 0 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: C.gold },
  tabText: { fontSize: 13, color: C.muted, fontWeight: "600" },
  activeTabText: { color: C.gold },

  body: { padding: 16, paddingBottom: 48 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: "33.33%",
    padding: 6,
  },
  statCardInner: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  statCardNum: { fontSize: 28, fontWeight: "700", color: C.text, marginBottom: 4 },
  statCardLabel: { fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },

  quickActions: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 12 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  actionCard: {
    width: "50%",
    padding: 6,
  },
  actionCardInner: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 12, color: C.text, fontWeight: "500" },

  tabContent: { flex: 1 },
  addButton: {
    backgroundColor: C.navy,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: { color: C.white, fontWeight: "600", fontSize: 14 },

  listItem: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 4 },
  listItemSubtitle: { fontSize: 12, color: C.muted },
  listItemActions: { flexDirection: "row", gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: C.info },
  actionBtnDanger: { backgroundColor: "#fee2e2" },
  actionBtnText: { fontSize: 12, color: C.white, fontWeight: "500" },
  actionBtnTextDanger: { color: C.danger },

  emptyText: { textAlign: "center", color: C.muted, padding: 40, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modalContent: { backgroundColor: C.white, borderRadius: 16, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "500", color: C.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, fontSize: 14 },
  textArea: { height: 80, textAlignVertical: "top" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, borderRadius: 8, padding: 12, alignItems: "center" },
  modalBtnCancel: { backgroundColor: C.border },
  modalBtnSubmit: { backgroundColor: C.navy },
  modalBtnText: { color: C.white, fontWeight: "600" },
});

// Update the stat card render to include inner view
const statCardStyles = StyleSheet.create({
  // Add this to the existing styles
  statCardInner: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
});

// Fix the stat card rendering in renderOverview
const renderOverviewFixed = () => (
  <View style={s.statsGrid}>
    {[
      { label: "Courses", value: stats.courses },
      { label: "Classes", value: stats.totalClasses },
      { label: "Lecturers", value: stats.lecturers },
      { label: "Students", value: stats.totalStudents },
      { label: "Pending", value: stats.pendingReports, color: C.warning },
      { label: "Reviewed", value: stats.reviewedReports, color: C.success },
    ].map((stat, index) => (
      <View key={index} style={s.statCard}>
        <View style={s.statCardInner}>
          <Text style={[s.statCardNum, stat.color && { color: stat.color }]}>{stat.value}</Text>
          <Text style={s.statCardLabel}>{stat.label}</Text>
        </View>
      </View>
    ))}
  </View>
);
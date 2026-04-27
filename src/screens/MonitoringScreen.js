import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
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
  green:  "#16a34a",
  greenBg:"#dcfce7",
  red:    "#dc2626",
  redBg:  "#fee2e2",
  amber:  "#d97706",
  amberBg:"#fef3c7",
};

function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function pct(present, total) {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

function StatItem({ label, value, color }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statNum, color && { color }]}>{value}</Text>
      <Text style={styles.statMeta}>{label}</Text>
    </View>
  );
}

function StatStrip({ children }) {
  return <View style={styles.statStrip}>{children}</View>;
}

function StatDivider() {
  return <View style={styles.statDivider} />;
}

function AttendanceRow({ report, present }) {
  const color  = present ? C.green : C.red;
  const bgCol  = present ? C.greenBg : C.redBg;
  const label  = present ? "Present" : "Absent";

  return (
    <View style={styles.attRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.attTopic} numberOfLines={1}>{report.topic || report.courseName}</Text>
        <Text style={styles.attMeta}>
          {report.courseCode}  •  {fmtDate(report.date || report.createdAt)}
        </Text>
        {!!report.week && (
          <Text style={styles.attMeta}>Week {report.week}  •  {report.scheduledTime}</Text>
        )}
      </View>
      <View style={[styles.statusPill, { backgroundColor: bgCol }]}>
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

function ReportRow({ item }) {
  const attPct = pct(
    Number(item.actualPresent || 0),
    Number(item.totalRegistered || 1)
  );
  const pillColor = attPct >= 75 ? C.green : attPct >= 50 ? C.amber : C.red;
  const pillBg    = attPct >= 75 ? C.greenBg : attPct >= 50 ? C.amberBg : C.redBg;

  return (
    <View style={styles.reportRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.attTopic} numberOfLines={1}>
          {item.topic || item.courseName}
        </Text>
        <Text style={styles.attMeta}>
          {item.lecturerName}  •  {item.courseCode}
        </Text>
        <Text style={styles.attMeta}>
          {fmtDate(item.date || item.createdAt)}
          {item.week ? `  •  Week ${item.week}` : ""}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
        <Text style={[styles.statusText, { color: pillColor }]}>{attPct}%</Text>
      </View>
    </View>
  );
}

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Header({ eyebrow, title, sub }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.headerTitle}>{title}</Text>
      {sub && <Text style={styles.headerSub}>{sub}</Text>}
    </View>
  );
}

export default function MonitoringScreen() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [courses, setCourses] = useState([]);

  // Get user role from storage
  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  // Load data based on role
  const loadData = async () => {
    const userRole = await getUserRole();
    
    try {
      if (userRole === "student") {
        // Student: load attendance records
        const attendanceRes = await api.get("/attendance/student");
        if (attendanceRes.data.success) {
          setAttendance(attendanceRes.data.attendance);
        }
        
        // Also load reports for their class
        const reportsRes = await api.get("/reports");
        if (reportsRes.data.success) {
          setReports(reportsRes.data.reports);
        }
        
      } else if (userRole === "lecturer") {
        // Lecturer: load their own reports
        const reportsRes = await api.get("/reports");
        if (reportsRes.data.success) {
          // Filter reports for this lecturer (in real app, backend does this)
          setMyReports(reportsRes.data.reports);
        }
        
        // Load their courses
        const coursesRes = await api.get("/courses");
        if (coursesRes.data.success) {
          setCourses(coursesRes.data.courses);
        }
        
      } else if (userRole === "prl") {
        // PRL: load all reports for review
        const reportsRes = await api.get("/reports");
        if (reportsRes.data.success) {
          setReports(reportsRes.data.reports);
        }
        
      } else if (userRole === "pl") {
        // PL: load all reports and system stats
        const reportsRes = await api.get("/reports");
        if (reportsRes.data.success) {
          setReports(reportsRes.data.reports);
        }
        
        const coursesRes = await api.get("/courses");
        if (coursesRes.data.success) {
          setCourses(coursesRes.data.courses);
        }
      }
      
    } catch (error) {
      console.log("Loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
    // Match attendance with reports
    const lecturesWithStatus = reports.map((report) => {
      const attDoc = attendance.find(
        (a) => a.courseId === report.courseId || a.courseName === report.courseName
      );
      const present = attDoc?.status?.toLowerCase() === "present";
      return { report, present };
    });

    const totalLectures = lecturesWithStatus.length;
    const attended = lecturesWithStatus.filter((l) => l.present).length;
    const attendancePct = pct(attended, totalLectures);
    const pillColor = attendancePct >= 75 ? C.green : attendancePct >= 50 ? C.amber : C.red;

    return (
      <View style={styles.screen}>
        <Header
          eyebrow="Student Portal"
          title="My Monitoring"
          sub="Track your attendance and performance"
        />

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <StatItem label="Attendance" value={`${attendancePct}%`} color={pillColor} />
            <StatDivider />
            <StatItem label="Present" value={attended} />
            <StatDivider />
            <StatItem label="Absent" value={totalLectures - attended} />
            <StatDivider />
            <StatItem label="Lectures" value={totalLectures} />
          </StatStrip>

          <SectionLabel text="Your Attendance Records" />

          {attendance.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records yet.</Text>
          ) : (
            attendance.map((item) => (
              <View key={item.id} style={styles.attRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attTopic}>{item.courseName}</Text>
                  <Text style={styles.attMeta}>
                    {fmtDate(item.date)}
                  </Text>
                </View>
                <View style={[
                  styles.statusPill,
                  item.status === "Present" ? { backgroundColor: C.greenBg } : { backgroundColor: C.redBg }
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === "Present" ? { color: C.green } : { color: C.red }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ========== LECTURER VIEW ==========
  if (role === "lecturer") {
    // Calculate lecturer's stats
    const totalClasses = myReports.length;
    const totalStudents = 0; // Would need separate endpoint
    
    return (
      <View style={styles.screen}>
        <Header
          eyebrow="Lecturer Portal"
          title="My Monitoring"
          sub="Track your reports and class performance"
        />

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <StatItem label="Reports" value={myReports.length} />
            <StatDivider />
            <StatItem label="Courses" value={courses.length} />
            <StatDivider />
            <StatItem label="Classes" value={courses.length} />
          </StatStrip>

          <SectionLabel text="Your Recent Reports" />

          {myReports.length === 0 ? (
            <Text style={styles.emptyText}>No reports submitted yet.</Text>
          ) : (
            myReports.slice(0, 10).map((item) => (
              <ReportRow key={item.id} item={item} />
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ========== PRL VIEW ==========
  if (role === "prl") {
    const pendingReports = reports.filter(r => r.status === "pending").length;
    const reviewedReports = reports.filter(r => r.status === "reviewed").length;
    
    return (
      <View style={styles.screen}>
        <Header
          eyebrow="PRL Portal"
          title="Academic Monitoring"
          sub="Review lecturer reports and provide feedback"
        />

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <StatItem label="Total Reports" value={reports.length} />
            <StatDivider />
            <StatItem label="Pending" value={pendingReports} color={C.amber} />
            <StatDivider />
            <StatItem label="Reviewed" value={reviewedReports} color={C.green} />
          </StatStrip>

          <SectionLabel text="Pending Reports for Review" />

          {pendingReports === 0 ? (
            <Text style={styles.emptyText}>All reports have been reviewed.</Text>
          ) : (
            reports.filter(r => r.status === "pending").map((item) => (
              <ReportRow key={item.id} item={item} />
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ========== PL VIEW ==========
  if (role === "pl") {
    const totalReports = reports.length;
    const pendingReports = reports.filter(r => r.status === "pending").length;
    const reviewedReports = reports.filter(r => r.status === "reviewed").length;
    
    // Calculate overall attendance percentage from reports
    let totalPresent = 0;
    let totalRegistered = 0;
    reports.forEach(r => {
      totalPresent += Number(r.actualPresent) || 0;
      totalRegistered += Number(r.totalRegistered) || 0;
    });
    const overallAttendance = totalRegistered > 0 ? pct(totalPresent, totalRegistered) : 0;
    const attColor = overallAttendance >= 75 ? C.green : overallAttendance >= 50 ? C.amber : C.red;

    return (
      <View style={styles.screen}>
        <Header
          eyebrow="Programme Leader"
          title="System Monitoring"
          sub="Complete overview of academic performance"
        />

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <StatItem label="Total Reports" value={totalReports} />
            <StatDivider />
            <StatItem label="Pending" value={pendingReports} color={C.amber} />
            <StatDivider />
            <StatItem label="Reviewed" value={reviewedReports} color={C.green} />
          </StatStrip>

          <StatStrip>
            <StatItem label="Courses" value={courses.length} />
            <StatDivider />
            <StatItem label="Overall Attendance" value={`${overallAttendance}%`} color={attColor} />
          </StatStrip>

          <SectionLabel text="All Recent Reports" />

          {reports.length === 0 ? (
            <Text style={styles.emptyText}>No reports available.</Text>
          ) : (
            reports.slice(0, 20).map((item) => (
              <ReportRow key={item.id} item={item} />
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // Fallback loading
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={C.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },

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

  body: { padding: 16, paddingBottom: 40 },

  statStrip: {
    flexDirection: "row",
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "700",
    color: C.white,
    marginBottom: 2,
  },
  statMeta: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
  },

  attRow: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  attTopic: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 3,
  },
  attMeta: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 1,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 10,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  reportRow: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  emptyText: {
    color: C.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
});
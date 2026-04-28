import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const C = {
  navy:    "#0f1f3d",
  gold:    "#c9a84c",
  white:   "#ffffff",
  bg:      "#f5f7fb",
  card:    "#ffffff",
  border:  "#e4e8f0",
  text:    "#102040",
  muted:   "#6c7a96",
  empty:   "#f0f4ff",
  green:   "#16a34a",  greenBg: "#dcfce7",
  red:     "#dc2626",  redBg:   "#fee2e2",
  amber:   "#d97706",  amberBg: "#fef3c7",
};

const fmtDate = (str) => {
  if (!str) return "";
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const pct = (a, b) => (!b ? 0 : Math.round((a / b) * 100));

function SectionLabel({ text }) {
  return <Text style={s.sectionLabel}>{text}</Text>;
}

function StatStrip({ children }) {
  return <View style={s.statStrip}>{children}</View>;
}

function Div() { return <View style={s.statDivider} />; }

function Stat({ label, value, color }) {
  return (
    <View style={s.statItem}>
      <Text style={[s.statNum, color && { color }]}>{value}</Text>
      <Text style={s.statMeta}>{label}</Text>
    </View>
  );
}

function AttRow({ item }) {
  const present = item.status === "Present";
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{item.courseName || "Class"}</Text>
        <Text style={s.rowMeta}>{fmtDate(item.date)}</Text>
      </View>
      <View style={[s.pill, { backgroundColor: present ? C.greenBg : C.redBg }]}>
        <Text style={[s.pillText, { color: present ? C.green : C.red }]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

function ReportRow({ item }) {
  const p   = pct(Number(item.actualPresent || 0), Number(item.totalRegistered || 1));
  const col = p >= 75 ? C.green : p >= 50 ? C.amber : C.red;
  const bg  = p >= 75 ? C.greenBg : p >= 50 ? C.amberBg : C.redBg;
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.topic || item.courseName}</Text>
        <Text style={s.rowMeta}>{item.lecturerName}  •  {item.courseCode}</Text>
        <Text style={s.rowMeta}>{fmtDate(item.date || item.createdAt)}{item.week ? `  •  Week ${item.week}` : ""}</Text>
      </View>
      <View style={[s.pill, { backgroundColor: bg }]}>
        <Text style={[s.pillText, { color: col }]}>{p}%</Text>
      </View>
    </View>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={s.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MonitoringScreen() {
  const [role, setRole]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [data, setData]           = useState({});

  useEffect(() => {
    const load = async () => {
      const userRole = await AsyncStorage.getItem("user_role");
      setRole(userRole);

      try {
        // ✅ Each role calls its own filtered endpoint — no shared unfiltered /reports or /courses
        if (userRole === "student") {
          const res = await api.get("/monitoring/student");
          if (res.data.success) setData(res.data);

        } else if (userRole === "lecturer") {
          const res = await api.get("/monitoring/lecturer");
          if (res.data.success) setData(res.data);

        } else if (userRole === "prl") {
          const res = await api.get("/monitoring/prl");
          if (res.data.success) setData(res.data);

        } else if (userRole === "pl") {
          const res = await api.get("/monitoring/pl");
          if (res.data.success) setData(res.data);
        }
      } catch (error) {
        console.log("Monitoring load error:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  // ─── STUDENT ────────────────────────────────────────────────────────────────
  if (role === "student") {
    const { attendance = [], reports = [], stats = {} } = data;
    const attColor = stats.attendancePercent >= 75 ? C.green
                   : stats.attendancePercent >= 50 ? C.amber : C.red;

    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <Text style={s.eyebrow}>Student Portal</Text>
          <Text style={s.headerTitle}>My Monitoring</Text>
          <Text style={s.headerSub}>Track your attendance and performance</Text>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <Stat label="Attendance" value={`${stats.attendancePercent ?? 0}%`} color={attColor} />
            <Div />
            <Stat label="Present"  value={stats.present ?? 0} />
            <Div />
            <Stat label="Absent"   value={stats.absent ?? 0} />
            <Div />
            <Stat label="Total"    value={stats.total ?? 0} />
          </StatStrip>

          <SectionLabel text="Attendance Records" />
          {attendance.length === 0 ? (
            <EmptyState
              title="No Records Yet"
              subtitle="Your attendance will appear here once your class starts."
            />
          ) : (
            attendance.map(item => <AttRow key={item.id} item={item} />)
          )}

          {reports.length > 0 && (
            <>
              <SectionLabel text="Class Lecture History" />
              {reports.map(item => <ReportRow key={item.id} item={item} />)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LECTURER ───────────────────────────────────────────────────────────────
  if (role === "lecturer") {
    const { reports = [], courses = [], stats = {} } = data;
    const attColor = (stats.attendancePercent ?? 0) >= 75 ? C.green
                   : (stats.attendancePercent ?? 0) >= 50 ? C.amber : C.red;

    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <Text style={s.eyebrow}>Lecturer Portal</Text>
          <Text style={s.headerTitle}>My Monitoring</Text>
          <Text style={s.headerSub}>Your reports and class performance</Text>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <Stat label="Reports" value={stats.totalReports ?? 0} />
            <Div />
            <Stat label="Courses" value={stats.totalCourses ?? 0} />
            <Div />
            <Stat label="Avg Attendance" value={`${stats.attendancePercent ?? 0}%`} color={attColor} />
          </StatStrip>

          <SectionLabel text="Your Recent Reports" />
          {reports.length === 0 ? (
            <EmptyState
              title="No Reports Yet"
              subtitle="Reports you submit will appear here."
            />
          ) : (
            reports.map(item => <ReportRow key={item.id} item={item} />)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── PRL ────────────────────────────────────────────────────────────────────
  if (role === "prl") {
    const { pending = [], reports = [], stats = {} } = data;

    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <Text style={s.eyebrow}>PRL Portal</Text>
          <Text style={s.headerTitle}>Academic Monitoring</Text>
          <Text style={s.headerSub}>Review lecturer reports and provide feedback</Text>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <Stat label="Total"    value={stats.total ?? 0} />
            <Div />
            <Stat label="Pending"  value={stats.pending ?? 0}  color={C.amber} />
            <Div />
            <Stat label="Reviewed" value={stats.reviewed ?? 0} color={C.green} />
          </StatStrip>

          <SectionLabel text="Pending Reports" />
          {pending.length === 0 ? (
            <EmptyState title="All Caught Up" subtitle="No reports are pending review." />
          ) : (
            pending.map(item => <ReportRow key={item.id} item={item} />)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── PL ─────────────────────────────────────────────────────────────────────
  if (role === "pl") {
    const { reports = [], stats = {} } = data;
    const attColor = (stats.attendancePercent ?? 0) >= 75 ? C.green
                   : (stats.attendancePercent ?? 0) >= 50 ? C.amber : C.red;

    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <Text style={s.eyebrow}>Programme Leader</Text>
          <Text style={s.headerTitle}>System Monitoring</Text>
          <Text style={s.headerSub}>Complete academic performance overview</Text>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <StatStrip>
            <Stat label="Reports"  value={stats.totalReports ?? 0} />
            <Div />
            <Stat label="Pending"  value={stats.pending ?? 0}  color={C.amber} />
            <Div />
            <Stat label="Reviewed" value={stats.reviewed ?? 0} color={C.green} />
          </StatStrip>

          <StatStrip>
            <Stat label="Courses"    value={stats.totalCourses ?? 0} />
            <Div />
            <Stat label="Lecturers"  value={stats.totalLecturers ?? 0} />
            <Div />
            <Stat label="Students"   value={stats.totalStudents ?? 0} />
            <Div />
            <Stat label="Attendance" value={`${stats.attendancePercent ?? 0}%`} color={attColor} />
          </StatStrip>

          <SectionLabel text="Recent Reports" />
          {reports.length === 0 ? (
            <EmptyState title="No Reports Yet" subtitle="Submitted reports will appear here." />
          ) : (
            reports.map(item => <ReportRow key={item.id} item={item} />)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // All roles handled — should never reach here
  return null;
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  centered:{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },

  header: {
    backgroundColor: C.navy,
    paddingTop: 52, paddingBottom: 24, paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1.2,
    color: C.gold, textTransform: "uppercase", marginBottom: 6,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.5)" },

  body: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 10,
  },

  statStrip: {
    flexDirection: "row", backgroundColor: C.navy,
    borderRadius: 12, paddingVertical: 16, marginBottom: 12,
  },
  statItem:   { flex: 1, alignItems: "center" },
  statNum:    { fontSize: 22, fontWeight: "700", color: C.white, marginBottom: 2 },
  statMeta:   { fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider:{ width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  row: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, padding: 14, flexDirection: "row",
    alignItems: "center", marginBottom: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 3 },
  rowMeta:  { fontSize: 12, color: C.muted, marginBottom: 1 },

  pill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 10, flexShrink: 0 },
  pillText: { fontSize: 12, fontWeight: "700" },

  emptyCard: {
    backgroundColor: C.empty, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 28, alignItems: "center", marginBottom: 10,
  },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
});
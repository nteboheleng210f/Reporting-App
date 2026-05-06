import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, SafeAreaView,
  StatusBar, Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import api from "../services/api";

const C = {
  navy: "#0f1f3d", navy2: "#1a2f52", gold: "#c9a84c",
  white: "#ffffff", bg: "#f5f7fb", card: "#ffffff",
  border: "#e4e8f0", text: "#102040", muted: "#6c7a96",
  badge: "#edf0f7", green: "#16a34a", greenBg: "#dcfce7",
  red: "#dc2626", redBg: "#fee2e2",
  amber: "#92400e", amberBg: "#fef9ec", amberBorder: "#fde68a",
};

const PAGE_SIZE = 10;

const FEEDBACK_TYPES = [
  { key: "approved",       label: "✓  Approved",         color: C.green,  bg: C.greenBg },
  { key: "excellent",      label: "★  Excellent",         color: "#1d4ed8", bg: "#dbeafe" },
  { key: "needs_revision", label: "⚠  Needs Revision",   color: C.amber,  bg: C.amberBg },
];

function SectionLabel({ text }) {
  return <Text style={s.sectionLabel}>{text}</Text>;
}

function StatusBadge({ status }) {
  const map = {
    pending:        { label: "Pending",          color: C.amber,  bg: C.amberBg  },
    reviewed:       { label: "Reviewed",         color: C.green,  bg: C.greenBg  },
    needs_revision: { label: "Needs Revision",   color: C.red,    bg: C.redBg    },
  };
  const cfg = map[status] || map.pending;
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, lecturers, courses }) {
  const [open, setOpen] = useState(false);

  const hasActive =
    filters.lecturer || filters.course ||
    filters.dateFrom || filters.dateTo  || filters.status;

  const clear = () =>
    setFilters({ lecturer: "", course: "", dateFrom: "", dateTo: "", status: "" });

  return (
    <View style={s.filterWrap}>
      <View style={s.filterTopRow}>
        <TouchableOpacity
          style={[s.filterToggleBtn, hasActive && s.filterToggleBtnActive]}
          onPress={() => setOpen(!open)}
          activeOpacity={0.8}
        >
          <Text style={[s.filterToggleText, hasActive && s.filterToggleTextActive]}>
            {open ? "▲  Hide Filters" : "▼  Filter Reports"}
            {hasActive ? "  •" : ""}
          </Text>
        </TouchableOpacity>
        {hasActive && (
          <TouchableOpacity style={s.clearBtn} onPress={clear} activeOpacity={0.8}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {open && (
        <View style={s.filterPanel}>
          {/* Status */}
          <Text style={s.filterLabel}>Status</Text>
          <View style={s.filterChipRow}>
            {["", "pending", "reviewed", "needs_revision"].map(v => (
              <TouchableOpacity
                key={v}
                style={[s.filterChip, filters.status === v && s.filterChipActive]}
                onPress={() => setFilters(f => ({ ...f, status: v }))}
                activeOpacity={0.8}
              >
                <Text style={[s.filterChipText, filters.status === v && s.filterChipTextActive]}>
                  {v === "" ? "All" : v === "needs_revision" ? "Needs Revision" : v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Lecturer */}
          {lecturers.length > 0 && (
            <>
              <Text style={s.filterLabel}>Lecturer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={s.filterChipRow}>
                  {["", ...lecturers].map(l => (
                    <TouchableOpacity
                      key={l}
                      style={[s.filterChip, filters.lecturer === l && s.filterChipActive]}
                      onPress={() => setFilters(f => ({ ...f, lecturer: l }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.filterChipText, filters.lecturer === l && s.filterChipTextActive]}>
                        {l === "" ? "All Lecturers" : l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Course */}
          {courses.length > 0 && (
            <>
              <Text style={s.filterLabel}>Course</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={s.filterChipRow}>
                  {["", ...courses].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.filterChip, filters.course === c && s.filterChipActive]}
                      onPress={() => setFilters(f => ({ ...f, course: c }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.filterChipText, filters.course === c && s.filterChipTextActive]}>
                        {c === "" ? "All Courses" : c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Date range */}
          <Text style={s.filterLabel}>Date Range</Text>
          <View style={s.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.dateSubLabel}>From (YYYY-MM-DD)</Text>
              <TextInput
                style={s.dateInput}
                value={filters.dateFrom}
                onChangeText={v => setFilters(f => ({ ...f, dateFrom: v }))}
                placeholder="2025-01-01"
                placeholderTextColor={C.muted}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.dateSubLabel}>To (YYYY-MM-DD)</Text>
              <TextInput
                style={s.dateInput}
                value={filters.dateTo}
                onChangeText={v => setFilters(f => ({ ...f, dateTo: v }))}
                placeholder="2025-12-31"
                placeholderTextColor={C.muted}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Structured feedback modal (PRL only) ──────────────────────────────────────
function FeedbackModal({ visible, report, onClose, onSubmit, submitting }) {
  const [feedbackType, setFeedbackType]   = useState("approved");
  const [prlFeedback, setPrlFeedback]     = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");

  useEffect(() => {
    if (visible && report) {
      setFeedbackType(report.feedbackType || "approved");
      setPrlFeedback(report.prlFeedback   || "");
      setRevisionNotes(report.revisionNotes || "");
    }
  }, [visible, report]);

  if (!report) return null;

  const isRevision = feedbackType === "needs_revision";

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>PRL Feedback</Text>
          <Text style={s.modalSub}>
            {report.courseName}  ·  {report.lecturerName}
          </Text>

          {/* Feedback type */}
          <Text style={s.modalFieldLabel}>Feedback Type</Text>
          <View style={s.feedbackTypeRow}>
            {FEEDBACK_TYPES.map(ft => (
              <TouchableOpacity
                key={ft.key}
                style={[
                  s.feedbackTypeBtn,
                  { borderColor: ft.color },
                  feedbackType === ft.key && { backgroundColor: ft.bg },
                ]}
                onPress={() => setFeedbackType(ft.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.feedbackTypeBtnText, { color: ft.color }]}>
                  {ft.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* General feedback */}
          <Text style={s.modalFieldLabel}>General Feedback *</Text>
          <TextInput
            style={[s.modalInput, { minHeight: 80 }]}
            multiline
            value={prlFeedback}
            onChangeText={setPrlFeedback}
            placeholder="Write your feedback on this report…"
            placeholderTextColor={C.muted}
            textAlignVertical="top"
          />

          {/* Revision notes — only shown when needs_revision selected */}
          {isRevision && (
            <>
              <Text style={s.modalFieldLabel}>Revision Notes *</Text>
              <TextInput
                style={[s.modalInput, { minHeight: 80, borderColor: C.red }]}
                multiline
                value={revisionNotes}
                onChangeText={setRevisionNotes}
                placeholder="Describe specifically what needs to be corrected…"
                placeholderTextColor={C.muted}
                textAlignVertical="top"
              />
            </>
          )}

          <View style={s.modalBtns}>
            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalConfirmBtn, submitting && { opacity: 0.6 }]}
              onPress={() => {
                if (!prlFeedback.trim()) {
                  return Alert.alert("Required", "Please enter feedback.");
                }
                if (isRevision && !revisionNotes.trim()) {
                  return Alert.alert("Required", "Please specify what needs revision.");
                }
                onSubmit({ feedbackType, prlFeedback, revisionNotes, requiresRevision: isRevision });
              }}
              disabled={submitting}
            >
              <Text style={s.modalConfirmText}>
                {submitting ? "Submitting…" : "Submit Feedback"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({ r, isPRL, onPress, onFeedbackPress, onMarkRevision }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{r.courseName} ({r.courseCode})</Text>
          <Text style={s.cardSub}>Lecturer: {r.lecturerName}</Text>
        </View>
        <StatusBadge status={r.status} />
      </View>

      <View style={s.cardMeta}>
        <Text style={s.cardMetaText}>📚 {r.className}</Text>
        <Text style={s.cardMetaText}>📅 Week {r.week}  ·  {r.date}</Text>
        <Text style={s.cardMetaText}>📝 {r.topic}</Text>
        <Text style={s.cardMetaText}>
          👥 {r.actualPresent}/{r.totalRegistered} students
        </Text>
      </View>

      {!!r.prlFeedback && (
        <View style={s.prevFeedback}>
          <Text style={s.prevFeedbackLabel}>PRL Feedback</Text>
          <Text style={s.prevFeedbackText}>{r.prlFeedback}</Text>
          {!!r.revisionNotes && (
            <Text style={s.revisionNoteText}>⚠ {r.revisionNotes}</Text>
          )}
        </View>
      )}

      {isPRL && (
        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.feedbackBtn}
            onPress={onFeedbackPress}
            activeOpacity={0.8}
          >
            <Text style={s.feedbackBtnText}>
              {r.prlFeedback ? "Edit Feedback" : "Add Feedback"}
            </Text>
          </TouchableOpacity>

          {r.status !== "needs_revision" && (
            <TouchableOpacity
              style={s.revisionBtn}
              onPress={onMarkRevision}
              activeOpacity={0.8}
            >
              <Text style={s.revisionBtnText}>Mark Revision</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const [role, setRole]         = useState(null);
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [feedbackReport, setFeedbackReport] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    lecturer: "", course: "", dateFrom: "", dateTo: "", status: "",
  });

  // Pagination
  const [page, setPage] = useState(1);

  const getUserRole = async () => {
    const userRole = await AsyncStorage.getItem("user_role");
    setRole(userRole);
    return userRole;
  };

  const loadReports = async (userRole) => {
    try {
      let endpoint = "/reports";
      if (userRole === "prl")      endpoint = "/reports/pending";
      else if (userRole === "pl")  endpoint = "/reports/reviewed";
      // lecturer gets their own via /reports (backend filters by x-user-id)

      const response = await api.get(endpoint);
      if (response.data.success) setReports(response.data.reports);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const exportReports = async () => {
    setExporting(true);
    try {
      const response = await api.get("/export/reports", { responseType: "blob" });
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
          Alert.alert("Saved", `File saved to ${fileUri}`);
        }
      };
      reader.readAsDataURL(response.data);
    } catch (error) {
      Alert.alert("Export Error", error.response?.data?.error || "Failed to export");
    } finally {
      setExporting(false);
    }
  };

  // Submit structured feedback
  const submitFeedback = async ({ feedbackType, prlFeedback, revisionNotes, requiresRevision }) => {
    if (!feedbackReport) return;
    setSubmittingFeedback(true);
    try {
      const res = await api.put(`/reports/${feedbackReport.id}/feedback`, {
        prlFeedback, feedbackType, revisionNotes, requiresRevision,
      });
      if (res.data.success) {
        setReports(prev =>
          prev.map(r =>
            r.id === feedbackReport.id
              ? { ...r, prlFeedback, feedbackType, revisionNotes,
                  requiresRevision, status: requiresRevision ? "needs_revision" : "reviewed" }
              : r
          )
        );
        setFeedbackReport(null);
        Alert.alert("Done", "Feedback submitted.");
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Quick-mark as needing revision (without opening modal)
  const markRevision = (report) => {
    Alert.alert(
      "Mark as Requiring Revision",
      `Mark "${report.courseName}" report as needing revision?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark",
          style: "destructive",
          onPress: async () => {
            try {
              await api.patch(`/reports/${report.id}/revision`, {
                revisionNotes: "Marked as requiring revision by PRL.",
              });
              setReports(prev =>
                prev.map(r =>
                  r.id === report.id
                    ? { ...r, status: "needs_revision", requiresRevision: true }
                    : r
                )
              );
            } catch (err) {
              Alert.alert("Error", err.response?.data?.error || "Failed to mark revision");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const init = async () => {
      const userRole = await getUserRole();
      await loadReports(userRole);
    };
    init();
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filters]);

  // ── Derive unique lecturer/course lists for filter chips ───────────────────
  const lecturers = [...new Set(reports.map(r => r.lecturerName).filter(Boolean))];
  const courses   = [...new Set(reports.map(r => r.courseName).filter(Boolean))];

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    if (filters.status   && r.status      !== filters.status)       return false;
    if (filters.lecturer && r.lecturerName !== filters.lecturer)     return false;
    if (filters.course   && r.courseName   !== filters.course)       return false;
    if (filters.dateFrom && r.date < filters.dateFrom)               return false;
    if (filters.dateTo   && r.date > filters.dateTo)                 return false;
    return true;
  });

  // ── Paginate ───────────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isPRL = role === "prl";
  const isPL  = role === "pl";

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={{ color: C.muted, marginTop: 10 }}>Loading Reports…</Text>
      </View>
    );
  }

  // ── Full report detail view ────────────────────────────────────────────────
  if (selectedReport) {
    const r = selectedReport;
    return (
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSelectedReport(null)} style={{ marginBottom: 12 }}>
            <Text style={s.backLink}>← Back to Reports</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Full Report</Text>
          <Text style={s.headerSub}>{r.courseName}</Text>
        </View>
        <ScrollView contentContainerStyle={s.body}>
          {[
            ["Course",       `${r.courseName} (${r.courseCode})`],
            ["Lecturer",     r.lecturerName],
            ["Faculty",      r.facultyName],
            ["Class",        r.className],
            ["Venue",        r.venue],
            ["Time",         r.scheduledTime],
            ["Week",         r.week],
            ["Date",         r.date],
            ["Topic",        r.topic],
            ["Outcomes",     r.outcomes],
            ["Recommendations", r.recommendations],
            ["Attendance",   `${r.actualPresent} / ${r.totalRegistered}`],
          ].map(([label, value]) => (
            <View key={label} style={s.detailRow}>
              <Text style={s.detailLabel}>{label}</Text>
              <Text style={s.detailValue}>{value || "—"}</Text>
            </View>
          ))}

          <View style={[s.detailRow, { alignItems: "flex-start" }]}>
            <Text style={s.detailLabel}>Status</Text>
            <StatusBadge status={r.status} />
          </View>

          {!!r.prlFeedback && (
            <View style={s.detailFeedback}>
              <Text style={s.detailFeedbackLabel}>PRL Feedback</Text>
              <Text style={s.detailFeedbackText}>{r.prlFeedback}</Text>
              {!!r.revisionNotes && (
                <>
                  <Text style={[s.detailFeedbackLabel, { color: C.red, marginTop: 10 }]}>
                    Revision Notes
                  </Text>
                  <Text style={[s.detailFeedbackText, { color: C.red }]}>{r.revisionNotes}</Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Feedback modal */}
      <FeedbackModal
        visible={!!feedbackReport}
        report={feedbackReport}
        onClose={() => setFeedbackReport(null)}
        onSubmit={submitFeedback}
        submitting={submittingFeedback}
      />

      <View style={s.header}>
        <Text style={s.eyebrow}>
          {isPRL ? "PRL Portal" : isPL ? "Programme Leader" : "Lecturer Portal"}
        </Text>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>
              {isPRL ? "Review Dashboard" : isPL ? "Final Reports" : "My Reports"}
            </Text>
            <Text style={s.headerSub}>
              {filtered.length} report{filtered.length !== 1 ? "s" : ""}
              {filtered.length !== reports.length ? ` (filtered from ${reports.length})` : ""}
            </Text>
          </View>
          {(isPL || role === "lecturer") && (
            <TouchableOpacity
              style={[s.exportBtn, exporting && { opacity: 0.6 }]}
              onPress={exportReports}
              disabled={exporting}
              activeOpacity={0.8}
            >
              <Text style={s.exportBtnText}>
                {exporting ? "⏳ Exporting…" : "📊 Export"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Filters — PRL and PL only */}
        {(isPRL || isPL) && (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            lecturers={lecturers}
            courses={courses}
          />
        )}

        {paginated.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No reports found</Text>
            <Text style={s.emptyText}>
              {filtered.length === 0 && reports.length > 0
                ? "No reports match your current filters."
                : isPRL ? "No pending reports at the moment." : "No reports submitted yet."}
            </Text>
          </View>
        ) : (
          paginated.map(r => (
            <ReportCard
              key={r.id}
              r={r}
              isPRL={isPRL}
              onPress={() => setSelectedReport(r)}
              onFeedbackPress={() => setFeedbackReport(r)}
              onMarkRevision={() => markRevision(r)}
            />
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity
              style={[s.pageBtn, page === 1 && s.pageBtnDisabled]}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              activeOpacity={0.8}
            >
              <Text style={s.pageBtnText}>← Prev</Text>
            </TouchableOpacity>

            <Text style={s.pageInfo}>
              Page {page} of {totalPages}
            </Text>

            <TouchableOpacity
              style={[s.pageBtn, page === totalPages && s.pageBtnDisabled]}
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              activeOpacity={0.8}
            >
              <Text style={s.pageBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  center:  { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },

  header: {
    backgroundColor: C.navy,
    paddingTop: 52, paddingBottom: 24, paddingHorizontal: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  eyebrow: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1.2,
    color: C.gold, textTransform: "uppercase", marginBottom: 6,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: C.white, marginBottom: 2 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  backLink:    { fontSize: 13, color: C.gold, fontWeight: "600" },

  exportBtn: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12,
  },
  exportBtnText: { color: C.white, fontWeight: "600", fontSize: 12 },

  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    color: C.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 10,
  },

  // ── Filter bar ──────────────────────────────────────────────────────────────
  filterWrap:  { marginBottom: 12 },
  filterTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterToggleBtn: {
    flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  filterToggleBtnActive: { borderColor: C.navy },
  filterToggleText:      { fontSize: 13, fontWeight: "600", color: C.muted },
  filterToggleTextActive:{ color: C.navy },
  clearBtn: {
    backgroundColor: C.redBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  clearBtnText: { fontSize: 12, fontWeight: "600", color: C.red },

  filterPanel: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, marginTop: 8,
  },
  filterLabel:    { fontSize: 11, fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  filterChipRow:  { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  filterChip: {
    backgroundColor: C.badge, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border,
  },
  filterChipActive:     { backgroundColor: C.navy, borderColor: C.navy },
  filterChipText:       { fontSize: 12, fontWeight: "500", color: C.muted },
  filterChipTextActive: { color: C.white },

  dateRow:      { flexDirection: "row" },
  dateSubLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  dateInput: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: C.text,
  },

  // ── Report card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  cardHeader:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  cardTitle:    { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  cardSub:      { fontSize: 12, color: C.muted },
  cardMeta:     { gap: 3, marginBottom: 10 },
  cardMetaText: { fontSize: 12, color: C.muted },

  prevFeedback: {
    backgroundColor: C.greenBg, borderRadius: 8, padding: 10, marginBottom: 10,
  },
  prevFeedbackLabel: { fontSize: 10, fontWeight: "600", color: C.green, textTransform: "uppercase", marginBottom: 4 },
  prevFeedbackText:  { fontSize: 12, color: C.text },
  revisionNoteText:  { fontSize: 12, color: C.red, marginTop: 6, fontWeight: "500" },

  cardActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  feedbackBtn: {
    flex: 1, backgroundColor: C.navy, borderRadius: 8,
    paddingVertical: 10, alignItems: "center",
  },
  feedbackBtnText: { color: C.white, fontWeight: "600", fontSize: 12 },
  revisionBtn: {
    flex: 1, backgroundColor: C.redBg, borderWidth: 1, borderColor: "#fca5a5",
    borderRadius: 8, paddingVertical: 10, alignItems: "center",
  },
  revisionBtnText: { color: C.red, fontWeight: "600", fontSize: 12 },

  // ── Status badge ────────────────────────────────────────────────────────────
  badge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // ── Detail view ─────────────────────────────────────────────────────────────
  detailRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailLabel: { fontSize: 12, fontWeight: "600", color: C.muted, flex: 1 },
  detailValue: { fontSize: 13, color: C.text, flex: 2, textAlign: "right" },
  detailFeedback: {
    backgroundColor: C.greenBg, borderRadius: 12, padding: 14, marginTop: 16,
  },
  detailFeedbackLabel: { fontSize: 11, fontWeight: "600", color: C.green, textTransform: "uppercase", marginBottom: 6 },
  detailFeedbackText:  { fontSize: 13, color: C.text, lineHeight: 20 },

  // ── Feedback modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: "90%",
  },
  modalTitle:      { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 4 },
  modalSub:        { fontSize: 13, color: C.muted, marginBottom: 20 },
  modalFieldLabel: { fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 8 },
  modalInput: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 12, fontSize: 14, color: C.text, marginBottom: 16,
  },

  feedbackTypeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  feedbackTypeBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  feedbackTypeBtnText: { fontSize: 11, fontWeight: "700" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    padding: 14, alignItems: "center",
  },
  modalCancelText:  { fontSize: 14, fontWeight: "600", color: C.muted },
  modalConfirmBtn: {
    flex: 2, backgroundColor: C.navy, borderRadius: 10,
    padding: 14, alignItems: "center",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: C.white },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 28, alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6 },
  emptyText:  { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  // ── Pagination ──────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 20,
  },
  pageBtn: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText:     { fontSize: 13, fontWeight: "600", color: C.navy },
  pageInfo:        { fontSize: 13, color: C.muted, fontWeight: "500" },
});
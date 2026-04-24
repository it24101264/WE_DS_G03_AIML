import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, FlatList, Alert,
  ScrollView, StyleSheet, ActivityIndicator,
} from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { KUPPI_TOPICS } from "../constants/kuppiTopics";
import SlotTimePicker from "../ui/SlotTimePicker";

const LOCATION_MAX_LENGTH = 120;
const DEFAULT_MIN_SIZE = 3;
const DEFAULT_MAX_CLUSTERS = 8;
const DEFAULT_TOP_CLUSTERS = 3;

function isValidMeetLink(value) {
  if (!value) return false;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDateTime(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const day = d.getDate();
  let hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${month} ${day}, ${hour}:${minute} ${meridiem}`;
}

function isFuture(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return !isNaN(d.getTime()) && d.getTime() > Date.now();
}

// ── Status & cohesion badges ──────────────────────────────────────────────────
function StatusBadge({ value }) {
  const status = String(value || "").toUpperCase();
  const palette = {
    DRAFT: { bg: theme.colors.warningBg, text: theme.colors.warningText },
    PUBLISHED: { bg: theme.colors.successBg, text: theme.colors.successText },
    REJECTED: { bg: "#ffdede", text: "#8c1d18" },
  }[status] || { bg: theme.colors.neutralBg, text: theme.colors.neutralText };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{status || "UNKNOWN"}</Text>
    </View>
  );
}

function CohesionBadge({ value }) {
  const score = typeof value === "number" ? value : null;
  if (score === null) return null;
  const pct = Math.round(score * 100);
  let bg, text, label;
  if (score >= 0.65) { bg = "#d1fae5"; text = "#065f46"; label = "High"; }
  else if (score >= 0.35) { bg = "#fef3c7"; text = "#92400e"; label = "Med"; }
  else { bg = "#fee2e2"; text = "#991b1b"; label = "Low"; }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>Cohesion {pct}% · {label}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function RepScreen({ user, onLogout }) {
  const [selectedModule, setSelectedModule] = useState("WMT");
  const [requests, setRequests] = useState([]);
  const [draftSessions, setDraftSessions] = useState([]);

  // date picker state per session (Date objects)
  const [dateBySession, setDateBySession] = useState({});
  // text fields per session
  const [locationBySession, setLocationBySession] = useState({});
  const [meetLinkBySession, setMeetLinkBySession] = useState({});

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState("");

  async function loadDraftSessions() {
    const res = await api.sessions();
    const all = res.data || [];
    const drafts = all.filter((s) => String(s.status || "").toUpperCase() === "DRAFT");
    setDraftSessions(drafts);
    // Pre-populate date picker with AI-recommended scheduledAt
    setDateBySession((prev) => {
      const next = { ...prev };
      for (const draft of drafts) {
        if (!next[draft.id] && draft.scheduledAt) {
          const d = new Date(draft.scheduledAt);
          if (!isNaN(d.getTime())) next[draft.id] = d;
        }
      }
      return next;
    });
  }

  async function loadAllRequests() {
    const res = await api.allRequests();
    setRequests(res.data || []);
  }

  useEffect(() => {
    loadDraftSessions().catch(() => {});
    loadAllRequests().catch(() => {});
  }, []);

  async function previewClusters() {
    setPreviewErr("");
    setPreviewData(null);
    setPreviewLoading(true);
    try {
      const res = await api.mlGroups(DEFAULT_MIN_SIZE, DEFAULT_MAX_CLUSTERS, DEFAULT_TOP_CLUSTERS, selectedModule);
      setPreviewData({ groups: res.data?.groups || [], meta: res.meta || {} });
    } catch (e) {
      setPreviewErr(e.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function confirmCreateSessions() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.applyMlGroups(DEFAULT_MIN_SIZE, DEFAULT_MAX_CLUSTERS, DEFAULT_TOP_CLUSTERS, selectedModule);
      const created = res.data?.createdSessions?.length || 0;
      Alert.alert("Done", `Created ${created} draft session(s). Review them below.`);
      setPreviewData(null);
      await loadDraftSessions();
      await loadAllRequests();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id, decision) {
    setErr("");
    const pickedDate = dateBySession[id];
    const scheduledAt = pickedDate instanceof Date ? pickedDate.toISOString() : null;
    const location = String(locationBySession[id] || "").trim();
    const meetLink = String(meetLinkBySession[id] || "").trim();

    if (decision === "accept") {
      if (!isFuture(pickedDate)) {
        setErr("Select a future date and time before publishing");
        return;
      }
      if (!location && !meetLink) {
        setErr("Provide either a physical location or a meet link before publishing");
        return;
      }
      if (location && location.length > LOCATION_MAX_LENGTH) {
        setErr(`Location must be ${LOCATION_MAX_LENGTH} characters or less`);
        return;
      }
      if (meetLink && !isValidMeetLink(meetLink)) {
        setErr("Meet link must be a valid https URL");
        return;
      }
    }

    setLoading(true);
    try {
      await api.decideSession(id, {
        decision,
        scheduledAt: scheduledAt || null,
        location: location || null,
        meetLink: meetLink || null,
      });
      await loadDraftSessions();
      await loadAllRequests();
      Alert.alert("Updated", `Session ${decision}ed successfully.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = requests.filter(
    (r) => String(r.status || "").toUpperCase() === "PENDING" && (!selectedModule || r.topic === selectedModule)
  ).length;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <View style={styles.heroTopRow}>
          <View style={styles.flexItem}>
            <Text style={styles.title}>Batch Rep Dashboard</Text>
            <Text style={styles.subtitle}>{user.email}</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{requests.length}</Text>
            <Text style={styles.statLabel}>All Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{draftSessions.length}</Text>
            <Text style={styles.statLabel}>Drafts</Text>
          </View>
        </View>
      </View>

      {/* Cluster Controls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cluster Controls</Text>
        <Text style={styles.muted}>Select a module, preview AI clusters, then confirm to create draft sessions.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleRow}>
          {KUPPI_TOPICS.map((module) => {
            const active = module === selectedModule;
            return (
              <Pressable
                key={module}
                style={[styles.moduleChip, active && styles.moduleChipActive]}
                onPress={() => { setSelectedModule(module); setPreviewData(null); setPreviewErr(""); }}
              >
                <Text style={[styles.moduleChipText, active && styles.moduleChipTextActive]}>{module}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable style={[styles.outlineBtn, previewLoading && styles.btnDisabled]} onPress={previewClusters} disabled={previewLoading}>
          {previewLoading
            ? <ActivityIndicator size="small" color={theme.colors.primary} />
            : <Text style={styles.outlineBtnText}>Preview Clusters for {selectedModule}</Text>}
        </Pressable>
        {previewErr ? <Text style={styles.error}>{previewErr}</Text> : null}
      </View>

      {/* Preview Results */}
      {previewData !== null && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Preview — {selectedModule}</Text>
            <Pressable onPress={() => setPreviewData(null)}>
              <Text style={[styles.muted, { textDecorationLine: "underline" }]}>Clear</Text>
            </Pressable>
          </View>
          {previewData.groups.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No clusters found</Text>
              <Text style={styles.muted}>Not enough PENDING requests (min {DEFAULT_MIN_SIZE}) for {selectedModule}.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.muted}>{previewData.groups.length} cluster(s) detected.</Text>
              {previewData.groups.map((group, index) => (
                <View key={group.group_id || index} style={styles.previewItem}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.itemTitle, { flex: 1 }]}>{group.topic || "General Discussion"}</Text>
                    <CohesionBadge value={group.cohesion} />
                  </View>
                  <Text style={styles.muted}>{group.size} request(s) · {(group.keywords || []).join(", ")}</Text>
                  {(group.queries || []).slice(0, 3).map((q, i) => (
                    <Text key={i} style={styles.queryPreview}>• {q}</Text>
                  ))}
                  {(group.queries || []).length > 3 && <Text style={styles.muted}>+ {group.queries.length - 3} more</Text>}
                </View>
              ))}
              <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={confirmCreateSessions} disabled={loading}>
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.primaryBtnText}>Confirm & Create {previewData.groups.length} Draft Session(s)</Text>}
              </Pressable>
              {err ? <Text style={styles.error}>{err}</Text> : null}
            </>
          )}
        </View>
      )}

      {/* All Requests */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>All Requests</Text>
          <Text style={styles.muted}>{requests.filter((r) => !selectedModule || r.topic === selectedModule).length} in {selectedModule}</Text>
        </View>
        <FlatList
          data={requests.filter((item) => !selectedModule || item.topic === selectedModule)}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.muted}>No requests for this module.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.rowBetween}>
                <Text style={[styles.itemTitle, { flex: 1 }]}>{item.topic}</Text>
                <Text style={styles.meta}>{String(item.status || "").toUpperCase()}</Text>
              </View>
              <Text style={styles.itemText}>{item.description || "No description provided."}</Text>
              <Text style={styles.muted}>Availability: {(item.availabilitySlots || []).join(", ") || "N/A"}</Text>
            </View>
          )}
        />
      </View>

      {/* Draft Sessions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Draft Sessions</Text>
        {err && !previewData ? <Text style={styles.error}>{err}</Text> : null}
        <FlatList
          data={draftSessions}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.muted}>No draft sessions yet. Use Preview Clusters above.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.rowBetween}>
                <Text style={[styles.itemTitle, { flex: 1 }]}>{item.topic}</Text>
                <View style={styles.row}>
                  {item.cohesion != null && <CohesionBadge value={item.cohesion} />}
                  <StatusBadge value={item.status} />
                </View>
              </View>
              <Text style={styles.itemText}>{item.description}</Text>
              <Text style={styles.muted}>Requests: {item.requestCount || (item.requestIds || []).length}</Text>

              {/* Native date + time picker */}
              <SlotTimePicker
                value={dateBySession[item.id] || null}
                onChange={(date) => setDateBySession((prev) => ({ ...prev, [item.id]: date }))}
                label="Session Date & Time"
                placeholder="Tap to select date and time"
                minDate={new Date()}
              />

              {/* AI recommended time hint */}
              {item.scheduledAt && !dateBySession[item.id] && (
                <Text style={styles.aiHint}>
                  AI suggested: {formatDateTime(new Date(item.scheduledAt))}
                </Text>
              )}

              <TextInput
                placeholder="Physical location"
                placeholderTextColor={theme.colors.textMuted}
                value={locationBySession[item.id] || ""}
                onChangeText={(v) => setLocationBySession((prev) => ({ ...prev, [item.id]: v }))}
                style={styles.input}
              />
              <TextInput
                placeholder="Meet link (optional, https://...)"
                placeholderTextColor={theme.colors.textMuted}
                value={meetLinkBySession[item.id] || ""}
                onChangeText={(v) => setMeetLinkBySession((prev) => ({ ...prev, [item.id]: v }))}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <View style={styles.row}>
                <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={() => decide(item.id, "accept")} disabled={loading}>
                  <Text style={styles.primaryBtnText}>Accept & Publish</Text>
                </Pressable>
                <Pressable style={[styles.rejectBtn, loading && styles.btnDisabled]} onPress={() => decide(item.id, "reject")} disabled={loading}>
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.bg },
  pageContent: { padding: 16, paddingBottom: 40, gap: 12 },

  heroCard: {
    backgroundColor: "#0a3cae", borderRadius: theme.radius.lg,
    padding: 16, overflow: "hidden", ...theme.shadow.soft,
  },
  bgOrbOne: {
    position: "absolute", width: 180, height: 180, borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.16)", top: -70, right: -40,
  },
  bgOrbTwo: {
    position: "absolute", width: 120, height: 120, borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.13)", bottom: -40, left: -30,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  flexItem: { flex: 1, marginRight: 10 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#e8eeff", marginTop: 4 },
  logoutBtn: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.sm },
  logoutBtnText: { color: theme.colors.primaryDeep, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: theme.radius.md,
    padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  statValue: { color: "#fff", fontSize: 24, fontWeight: "900" },
  statLabel: { color: "#e5ecff", fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 14,
    borderWidth: 1, borderColor: theme.colors.border, gap: 8, ...theme.shadow.soft,
  },
  cardTitle: { fontWeight: "800", color: theme.colors.text, fontSize: 16, marginBottom: 2 },

  moduleRow: { gap: 8, paddingVertical: 2 },
  moduleChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt,
  },
  moduleChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  moduleChipText: { color: theme.colors.text, fontWeight: "700" },
  moduleChipTextActive: { color: "#fff" },

  outlineBtn: {
    borderWidth: 2, borderColor: theme.colors.primary, borderRadius: theme.radius.sm,
    alignItems: "center", paddingVertical: 11, backgroundColor: "#fff",
  },
  outlineBtnText: { color: theme.colors.primary, fontWeight: "800" },

  primaryBtn: {
    flex: 1, backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm,
    alignItems: "center", paddingVertical: 11,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  rejectBtn: {
    borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.danger,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: "#fff",
  },
  rejectBtnText: { color: theme.colors.danger, fontWeight: "800" },
  btnDisabled: { opacity: 0.7 },

  aiHint: { color: theme.colors.primary, fontSize: 12, fontStyle: "italic", marginTop: 2 },

  emptyBox: { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm, padding: 14, gap: 4 },
  emptyTitle: { fontWeight: "700", color: theme.colors.text },

  previewItem: {
    borderWidth: 1, borderColor: "#c7d2fe", borderRadius: theme.radius.sm,
    padding: 10, marginBottom: 6, backgroundColor: "#f5f7ff", gap: 4,
  },
  listItem: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm,
    padding: 10, marginBottom: 8, backgroundColor: "#fdfefe", gap: 6,
  },
  itemTitle: { fontWeight: "700", color: theme.colors.text },
  itemText: { color: theme.colors.neutralText },
  meta: { color: theme.colors.neutralText, fontWeight: "700", fontSize: 12 },
  muted: { color: theme.colors.textMuted },
  queryPreview: { color: theme.colors.text, fontSize: 13, lineHeight: 18 },

  badge: { borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "800" },

  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  row: { flexDirection: "row", gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  error: { color: theme.colors.danger, fontSize: 13 },
});

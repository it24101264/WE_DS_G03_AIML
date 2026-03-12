import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert, ScrollView, StyleSheet } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";
import ModuleSidebar from "../components/ModuleSidebar";

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

export default function RepScreen({ user, onLogout }) {
  const [minSize, setMinSize] = useState("5");
  const [maxClusters, setMaxClusters] = useState("8");
  const [topClusters, setTopClusters] = useState("3");
  const [groups, setGroups] = useState([]);
  const [draftSessions, setDraftSessions] = useState([]);
  const [slotBySession, setSlotBySession] = useState({});
  const [locationBySession, setLocationBySession] = useState({});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadDraftSessions() {
    const res = await api.sessions();
    const all = res.data || [];
    setDraftSessions(all.filter((s) => String(s.status || "").toUpperCase() === "DRAFT"));
  }

  useEffect(() => {
    loadDraftSessions().catch(() => {});
  }, []);

  async function loadGroups() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.mlGroups(Number(minSize), Number(maxClusters), Number(topClusters));
      setGroups(res.data?.groups || res.groups || []);
      await loadDraftSessions();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function autoCreateSessions() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.applyMlGroups(Number(minSize), Number(maxClusters), Number(topClusters));
      const created = res.data?.createdSessions?.length || 0;
      Alert.alert("Automation Complete", `Created ${created} draft session(s) from qualifying clusters.`);
      setGroups(res.data?.groups || []);
      await loadDraftSessions();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id, decision) {
    setErr("");
    setLoading(true);
    try {
      await api.decideSession(id, {
        decision,
        scheduledAt: slotBySession[id] || null,
        location: locationBySession[id] || null,
      });
      await loadDraftSessions();
      Alert.alert("Updated", `Session ${decision}ed successfully.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.pageShell}>
      <ModuleSidebar currentModule="study" />
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
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
              <Text style={styles.statValue}>{groups.length}</Text>
              <Text style={styles.statLabel}>Detected Clusters</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{draftSessions.length}</Text>
              <Text style={styles.statLabel}>Draft Sessions</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cluster Controls</Text>
          <View style={styles.paramRow}>
            <TextInput placeholder="minSize" placeholderTextColor={theme.colors.textMuted} value={minSize} onChangeText={setMinSize} style={styles.paramInput} keyboardType="number-pad" />
            <TextInput placeholder="maxClusters" placeholderTextColor={theme.colors.textMuted} value={maxClusters} onChangeText={setMaxClusters} style={styles.paramInput} keyboardType="number-pad" />
            <TextInput placeholder="topClusters" placeholderTextColor={theme.colors.textMuted} value={topClusters} onChangeText={setTopClusters} style={styles.paramInput} keyboardType="number-pad" />
          </View>
          <View style={styles.row}>
            <Pressable style={[styles.secondaryBtn, loading && styles.btnDisabled]} onPress={loadGroups} disabled={loading}>
              <Text style={styles.secondaryBtnText}>{loading ? "Loading..." : "Find Clusters"}</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={autoCreateSessions} disabled={loading}>
              <Text style={styles.primaryBtnText}>{loading ? "Processing..." : "Auto Create"}</Text>
            </Pressable>
          </View>
          {err ? <Text style={styles.error}>{err}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cluster Summary</Text>
          <FlatList
            data={groups}
            keyExtractor={(item) => item.group_id || item.groupId}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.muted}>No clusters loaded.</Text>}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemTitle}>{item.group_id || item.groupId}</Text>
                  <Text style={styles.meta}>size {item.size}</Text>
                </View>
                <Text style={styles.itemText}>Topic: {item.topic || "General Discussion"}</Text>
                <Text style={styles.muted}>Keywords: {(item.keywords || []).join(", ") || "N/A"}</Text>
              </View>
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Draft Sessions</Text>
          <FlatList
            data={draftSessions}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.muted}>No draft sessions available.</Text>}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemTitle}>{item.topic}</Text>
                  <StatusBadge value={item.status} />
                </View>
                <Text style={styles.itemText}>{item.description}</Text>
                <Text style={styles.muted}>Requests: {item.requestCount || (item.requestIds || []).length}</Text>

                <TextInput
                  placeholder="Time slot (e.g. Tue 4PM)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={slotBySession[item.id] || ""}
                  onChangeText={(value) => setSlotBySession((prev) => ({ ...prev, [item.id]: value }))}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Location / mode"
                  placeholderTextColor={theme.colors.textMuted}
                  value={locationBySession[item.id] || ""}
                  onChangeText={(value) => setLocationBySession((prev) => ({ ...prev, [item.id]: value }))}
                  style={styles.input}
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
    </View>
  );
}

const styles = StyleSheet.create({
  pageShell: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  pageContent: {
    paddingTop: 18,
    paddingRight: 16,
    paddingBottom: 28,
    paddingLeft: 94,
    gap: 12,
  },
  heroCard: {
    backgroundColor: "#0a3cae",
    borderRadius: theme.radius.lg,
    padding: 16,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  bgOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: -70,
    right: -40,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.13)",
    bottom: -40,
    left: -30,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  flexItem: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: "#e8eeff",
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  logoutBtnText: {
    color: theme.colors.primaryDeep,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: "#e5ecff",
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  cardTitle: {
    fontWeight: "800",
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 2,
  },
  paramRow: {
    flexDirection: "row",
    gap: 8,
  },
  paramInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    marginTop: 4,
    color: theme.colors.text,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 11,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    backgroundColor: "#fff",
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  rejectBtn: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  rejectBtnText: {
    color: theme.colors.danger,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  listItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fdfefe",
    gap: 4,
  },
  itemTitle: {
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  itemText: {
    color: theme.colors.neutralText,
  },
  meta: {
    color: theme.colors.neutralText,
    fontWeight: "700",
    fontSize: 12,
  },
  muted: {
    color: theme.colors.textMuted,
  },
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

import React, { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";

const EMPTY_FORM = {
  id: null,
  name: "",
  note: "",
  latitude: "",
  longitude: "",
  radiusMeters: "",
};

function formatCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function toForm(area) {
  return {
    id: area.id,
    name: area.name || "",
    note: area.note || "",
    latitude: formatCoordinate(area.center?.latitude),
    longitude: formatCoordinate(area.center?.longitude),
    radiusMeters: formatCoordinate(area.radiusMeters),
  };
}

export default function StudyAreaAdminScreen({ user, onLogout }) {
  const [areas, setAreas] = useState([]);
  const [summary, setSummary] = useState({ total: 0, free: 0, moderate: 0, crowded: 0 });
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  async function loadAreas() {
    const res = await api.studyAreas();
    setAreas(res.data || []);
    setSummary(res.summary || { total: 0, free: 0, moderate: 0, crowded: 0 });
  }

  useEffect(() => {
    loadAreas()
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM });
  }

  async function submit() {
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        name: form.name,
        note: form.note,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusMeters: Number(form.radiusMeters),
      };

      if (form.id) {
        await api.updateStudyArea(form.id, payload);
        setMessage("Study area updated.");
      } else {
        await api.createStudyArea(payload);
        setMessage("Study area created.");
      }

      resetForm();
      await loadAreas();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  function editArea(area) {
    setPendingDeleteId(null);
    setForm(toForm(area));
  }

  async function removeArea(area) {
    try {
      setMessage("");
      setPendingDeleteId(area.id);
      await api.deleteStudyArea(area.id);
      if (form.id === area.id) {
        resetForm();
      }
      await loadAreas();
      setPendingDeleteId(null);
      setMessage("Study area deleted.");
    } catch (err) {
      setPendingDeleteId(null);
      setMessage(err.message);
    }
  }

  function handleDeletePress(area) {
    if (pendingDeleteId === area.id) {
      removeArea(area);
      return;
    }

    setPendingDeleteId(area.id);
    setMessage(`Press delete again to remove "${area.name}".`);
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAreas} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Study Area Admin</Text>
        <Text style={styles.heroText}>{user?.email}</Text>
        <Text style={styles.heroText}>This seeded admin account is the only one allowed to configure study areas.</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{summary.total || 0}</Text>
            <Text style={styles.heroLabel}>Areas</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{summary.crowded || 0}</Text>
            <Text style={styles.heroLabel}>Crowded</Text>
          </View>
        </View>
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{form.id ? "Edit Study Area" : "Create Study Area"}</Text>
        <TextInput
          style={styles.input}
          placeholder="Area name"
          placeholderTextColor={theme.colors.textMuted}
          value={form.name}
          onChangeText={(value) => updateField("name", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Note"
          placeholderTextColor={theme.colors.textMuted}
          value={form.note}
          onChangeText={(value) => updateField("note", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Latitude"
          placeholderTextColor={theme.colors.textMuted}
          value={form.latitude}
          onChangeText={(value) => updateField("latitude", value)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Longitude"
          placeholderTextColor={theme.colors.textMuted}
          value={form.longitude}
          onChangeText={(value) => updateField("longitude", value)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Radius in meters"
          placeholderTextColor={theme.colors.textMuted}
          value={form.radiusMeters}
          onChangeText={(value) => updateField("radiusMeters", value)}
          keyboardType="numeric"
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.formActions}>
          <Pressable style={styles.primaryBtn} onPress={submit} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? "Saving..." : form.id ? "Update" : "Create"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={resetForm}>
            <Text style={styles.secondaryBtnText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configured Study Areas</Text>
        <FlatList
          data={areas}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No study areas configured yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.areaItem}>
              <View style={styles.areaHeader}>
                <View style={styles.areaTextWrap}>
                  <Text style={styles.areaTitle}>{item.name}</Text>
                  <Text style={styles.areaNote}>{item.note || "No special note"}</Text>
                </View>
                <View style={styles.areaActions}>
                  <Pressable style={styles.smallBtn} onPress={() => editArea(item)}>
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.smallBtn,
                      styles.smallBtnDanger,
                      pendingDeleteId === item.id && styles.smallBtnDangerActive,
                    ]}
                    onPress={() => handleDeletePress(item)}
                  >
                    <Text style={styles.smallBtnDangerText}>
                      {pendingDeleteId === item.id ? "Confirm" : "Delete"}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.areaMeta}>Students: {item.studentCount}</Text>
              <Text style={styles.areaMeta}>Density: {item.density}</Text>
              <Text style={styles.areaMeta}>Radius: {item.radiusMeters ?? "N/A"} m</Text>
              <Text style={styles.areaMeta}>
                Center: {item.center?.latitude ?? "N/A"}, {item.center?.longitude ?? "N/A"}
              </Text>
              {!item.isConfigured ? <Text style={styles.areaWarning}>Complete the location and radius, then press Edit and Update.</Text> : null}
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  pageContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    backgroundColor: "#153fb7",
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  heroText: {
    color: "#dbe7ff",
  },
  heroStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  heroStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 12,
  },
  heroValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  heroLabel: {
    color: "#dbe7ff",
  },
  logoutBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutBtnText: {
    color: theme.colors.primaryDeep,
    fontWeight: "800",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: theme.colors.text,
  },
  message: {
    color: theme.colors.primaryDeep,
    fontWeight: "700",
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
  areaItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    gap: 4,
    marginBottom: 10,
  },
  areaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  areaTextWrap: {
    flex: 1,
    gap: 4,
  },
  areaTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  areaNote: {
    color: theme.colors.textMuted,
  },
  areaActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallBtnText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  smallBtnDanger: {
    borderColor: "#f1b7b2",
    backgroundColor: "#fff1ef",
  },
  smallBtnDangerActive: {
    borderColor: "#d92d20",
    backgroundColor: "#ffd9d6",
  },
  smallBtnDangerText: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  areaMeta: {
    color: theme.colors.neutralText,
    fontWeight: "600",
  },
  areaWarning: {
    color: theme.colors.warningText,
    fontWeight: "700",
    marginTop: 4,
  },
});

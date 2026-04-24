import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ScrollView, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../api";
import { theme } from "../ui/theme";
import { KUPPI_TOPICS } from "../constants/kuppiTopics";
import SlotTimePicker from "../ui/SlotTimePicker";

const DESCRIPTION_MAX_LENGTH = 500;

function createInitialSlotDate() {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

function formatSlotLabel(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ value }) {
  const status = String(value || "").toUpperCase();
  const palette = {
    PENDING: { bg: theme.colors.warningBg, text: theme.colors.warningText },
    GROUPED: { bg: theme.colors.infoBg, text: theme.colors.infoText },
    SCHEDULED: { bg: theme.colors.successBg, text: theme.colors.successText },
    PUBLISHED: { bg: theme.colors.successBg, text: theme.colors.successText },
  }[status] || { bg: theme.colors.neutralBg, text: theme.colors.neutralText };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{status || "UNKNOWN"}</Text>
    </View>
  );
}

export default function StudentScreen({ user, onLogout }) {
  const [topic, setTopic] = useState("");
  const [slotDateTime, setSlotDateTime] = useState(() => createInitialSlotDate());
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [description, setDescription] = useState("");
  const [mine, setMine] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [myReqRes, sessionRes] = await Promise.all([api.myRequests(), api.sessions()]);
      setMine(myReqRes.data || []);
      setSessions((sessionRes.data || []).filter((s) => String(s.status || "").toUpperCase() === "PUBLISHED"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    const safeTopic = topic.trim();
    const safeDescription = description.trim();

    if (!safeTopic) {
      setErr("Topic is required");
      return;
    }
    if (!safeDescription) {
      setErr("Description is required");
      return;
    }
    if (safeDescription.length > DESCRIPTION_MAX_LENGTH) {
      setErr(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`);
      return;
    }
    if (availabilitySlots.length === 0) {
      setErr("Add at least one availability slot");
      return;
    }

    setErr("");
    setLoading(true);
    try {
      await api.createRequest({ topic: safeTopic, description: safeDescription, availabilitySlots });
      setTopic("");
      setSlotDateTime(createInitialSlotDate());
      setAvailabilitySlots([]);
      setDescription("");
      await load();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  function addAvailabilitySlot() {
    if (slotDateTime.getTime() <= Date.now()) {
      setErr("Select a future date and time");
      return;
    }

    const next = formatSlotLabel(slotDateTime);
    if (availabilitySlots.includes(next)) {
      setErr("This slot is already added");
      return;
    }

    setErr("");
    setAvailabilitySlots((prev) => [...prev, next]);
    setSlotDateTime(createInitialSlotDate());
  }

  function removeAvailabilitySlot(slot) {
    setAvailabilitySlots((prev) => prev.filter((s) => s !== slot));
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />

        <View style={styles.heroTopRow}>
          <View style={styles.flexItem}>
            <Text style={styles.title}>Student Dashboard</Text>
            <Text style={styles.subtitle}>{user.email}</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mine.length}</Text>
            <Text style={styles.statLabel}>My Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Published Sessions</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>New Support Request</Text>
        <Text style={styles.helperLabel}>Topic</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={topic}
            style={styles.picker}
            itemStyle={styles.pickerItem}
            dropdownIconColor={theme.colors.primary}
            onValueChange={setTopic}
          >
            <Picker.Item label="-- Select Topic --" value="" />
            {KUPPI_TOPICS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
        <Text style={styles.helperLabel}>Availability Slot</Text>
        <SlotTimePicker
          value={slotDateTime}
          onChange={setSlotDateTime}
          label="Select Date & Time"
          placeholder="Tap to pick your available slot"
          minDate={new Date()}
        />
        <Pressable style={styles.secondaryBtn} onPress={addAvailabilitySlot}>
          <Text style={styles.secondaryBtnText}>Add Slot</Text>
        </Pressable>
        {availabilitySlots.length > 0 ? (
          <View style={styles.slotList}>
            {availabilitySlots.map((slot) => (
              <View key={slot} style={styles.slotChip}>
                <Text style={styles.slotChipText}>{slot}</Text>
                <Pressable onPress={() => removeAvailabilitySlot(slot)}>
                  <Text style={styles.slotRemove}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No slots added yet.</Text>
        )}
        <TextInput
          placeholder="Description"
          placeholderTextColor={theme.colors.textMuted}
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multilineInput]}
          multiline
        />
        {err ? <Text style={styles.error}>{err}</Text> : null}
        <View style={styles.row}>
          <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? "Submitting..." : "Create Request"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={load}>
            <Text style={styles.secondaryBtnText}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Requests</Text>
        <FlatList
          data={mine}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.muted}>No requests yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{item.topic}</Text>
                <StatusBadge value={item.status} />
              </View>
              <Text style={styles.itemText}>{item.description || "No description"}</Text>
              <Text style={styles.muted}>Slots: {(item.availabilitySlots || []).join(", ") || "N/A"}</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Published Sessions</Text>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.muted}>No published sessions yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{item.topic}</Text>
                <StatusBadge value={item.status} />
              </View>
              <Text style={styles.itemText}>Time: {item.scheduledAt || "TBD"}</Text>
              <Text style={styles.itemText}>Location: {item.location || "TBD"}</Text>
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
    gap: 12,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  picker: {
    color: theme.colors.text,
  },
  pickerItem: {
    color: theme.colors.text,
  },
  helperLabel: {
    color: theme.colors.text,
    fontWeight: "700",
    marginTop: 2,
  },
  slotList: {
    gap: 6,
  },
  slotChip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  slotChipText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  slotRemove: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  multilineInput: {
    minHeight: 74,
    textAlignVertical: "top",
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
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
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
});

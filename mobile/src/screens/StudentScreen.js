import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ScrollView, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";

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

const MODULES = [
  {
    key: "support",
    title: "Smart Study Support",
    subtitle: "Current module",
    icon: "lightbulb-outline",
    active: true,
  },
  {
    key: "lost-found",
    title: "Lost & Found",
    subtitle: "Link coming soon",
    icon: "magnify",
    active: false,
  },
  {
    key: "parking",
    title: "Parking Management",
    subtitle: "Open parking module",
    icon: "car-outline",
    active: true,
    route: "Parking",
  },
  {
    key: "marketplace",
    title: "Marketplace",
    subtitle: "Link coming soon",
    icon: "storefront-outline",
    active: false,
  },
  {
    key: "food",
    title: "Food",
    subtitle: "Link coming soon",
    icon: "silverware-fork-knife",
    active: false,
  },
];

export default function StudentScreen({ navigation, user, onLogout }) {
  const [topic, setTopic] = useState("");
  const [slotMonth, setSlotMonth] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotPeriod, setSlotPeriod] = useState("AM");
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [description, setDescription] = useState("");
  const [mine, setMine] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    setErr("");
    setLoading(true);
    try {
      await api.createRequest({ topic, description, availabilitySlots });
      setTopic("");
      setSlotMonth("");
      setSlotDate("");
      setSlotTime("");
      setAvailabilitySlots([]);
      setDescription("");
      await load();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  function addAvailabilitySlot() {
    const month = slotMonth.trim();
    const date = slotDate.trim();
    const time = slotTime.trim();
    const period = slotPeriod.trim().toUpperCase();

    if (!month || !date || !time || !period) {
      setErr("Enter month, date, time, and AM/PM to add a slot");
      return;
    }

    const next = `${month} ${date} ${time} ${period}`;
    if (availabilitySlots.includes(next)) {
      setErr("This slot is already added");
      return;
    }

    setErr("");
    setAvailabilitySlots((prev) => [...prev, next]);
    setSlotMonth("");
    setSlotDate("");
    setSlotTime("");
    setSlotPeriod("AM");
  }

  function removeAvailabilitySlot(slot) {
    setAvailabilitySlots((prev) => prev.filter((s) => s !== slot));
  }

  function handleModulePress(module) {
    if (module.route) {
      setMenuOpen(false);
      navigation.navigate(module.route);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.moduleShell}>
        <View style={styles.moduleHeader}>
          <View>
            <Text style={styles.moduleEyebrow}>Campus Hub</Text>
            <Text style={styles.moduleCaption}>Modules</Text>
          </View>
          <Pressable style={styles.moduleToggle} onPress={() => setMenuOpen((prev) => !prev)}>
            <Text style={styles.moduleToggleText}>{menuOpen ? "Close" : "Menu"}</Text>
            <MaterialCommunityIcons
              name={menuOpen ? "close" : "view-grid-outline"}
              size={18}
              color="#ffffff"
            />
          </Pressable>
        </View>

        {menuOpen ? (
          <View style={styles.moduleList}>
            {MODULES.map((module) => {
              const isInteractive = Boolean(module.route);
              return (
                <Pressable
                  key={module.key}
                  style={[styles.moduleItem, module.active && styles.moduleItemActive]}
                  onPress={() => handleModulePress(module)}
                  disabled={!isInteractive}
                >
                  <View style={styles.moduleIconWrap}>
                    <MaterialCommunityIcons
                      name={module.icon}
                      size={24}
                      color={module.active ? theme.colors.primary : "#dbe6ff"}
                    />
                  </View>
                  <View style={styles.moduleTextWrap}>
                    <Text style={[styles.moduleTitle, module.active && styles.moduleTitleActive]}>{module.title}</Text>
                    <Text style={[styles.moduleSubtitle, module.active && styles.moduleSubtitleActive]}>
                      {module.subtitle}
                    </Text>
                  </View>
                  {isInteractive ? (
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#ffffff" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

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
        <TextInput placeholder="Topic" placeholderTextColor={theme.colors.textMuted} value={topic} onChangeText={setTopic} style={styles.input} />
        <Text style={styles.helperLabel}>Availability Slot</Text>
        <View style={styles.slotRow}>
          <TextInput
            placeholder="Month"
            placeholderTextColor={theme.colors.textMuted}
            value={slotMonth}
            onChangeText={setSlotMonth}
            style={[styles.input, styles.slotInput]}
          />
          <TextInput
            placeholder="Date"
            placeholderTextColor={theme.colors.textMuted}
            value={slotDate}
            onChangeText={setSlotDate}
            style={[styles.input, styles.slotInput]}
          />
          <TextInput
            placeholder="Time"
            placeholderTextColor={theme.colors.textMuted}
            value={slotTime}
            onChangeText={setSlotTime}
            style={[styles.input, styles.slotInput]}
          />
        </View>
        <View style={styles.periodRow}>
          <Pressable
            style={[styles.periodChip, slotPeriod === "AM" && styles.periodChipActive]}
            onPress={() => setSlotPeriod("AM")}
          >
            <Text style={[styles.periodText, slotPeriod === "AM" && styles.periodTextActive]}>AM</Text>
          </Pressable>
          <Pressable
            style={[styles.periodChip, slotPeriod === "PM" && styles.periodChipActive]}
            onPress={() => setSlotPeriod("PM")}
          >
            <Text style={[styles.periodText, slotPeriod === "PM" && styles.periodTextActive]}>PM</Text>
          </Pressable>
        </View>
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
  moduleShell: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 14,
    gap: 12,
    ...theme.shadow.soft,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  moduleEyebrow: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    textTransform: "none",
  },
  moduleCaption: {
    color: "#dfe8ff",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  moduleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primaryDeep,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
  },
  moduleToggleText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  moduleList: {
    gap: 10,
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(13, 48, 153, 0.34)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  moduleItemActive: {
    backgroundColor: "#ffffff",
  },
  moduleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  moduleTextWrap: {
    flex: 1,
  },
  moduleTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  moduleTitleActive: {
    color: theme.colors.text,
  },
  moduleSubtitle: {
    color: "#dbe6ff",
    marginTop: 2,
    fontSize: 13,
  },
  moduleSubtitleActive: {
    color: theme.colors.textMuted,
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
  helperLabel: {
    color: theme.colors.text,
    fontWeight: "700",
    marginTop: 2,
  },
  slotRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  periodChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  periodTextActive: {
    color: "#fff",
  },
  slotInput: {
    flex: 1,
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

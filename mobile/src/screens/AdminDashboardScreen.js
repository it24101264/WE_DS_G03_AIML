import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Banned", value: "banned" },
];

function initialsFor(user) {
  const name = String(user?.name || user?.email || "U").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(value) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleDateString();
}

export default function AdminDashboardScreen({ navigation, user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ totalUsers: 0, activeUsers: 0, bannedUsers: 0, roleCounts: {} });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.adminUsers({ q: search, status });
      setUsers(Array.isArray(res?.data) ? res.data : []);
      setMeta(res?.meta || { totalUsers: 0, activeUsers: 0, bannedUsers: 0, roleCounts: {} });
    } catch (err) {
      setError(err.message || "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function setBan(userRow, banned) {
    setActionId(userRow.id);
    setError("");
    try {
      await api.adminSetUserBan(userRow.id, { banned, reason: banned ? banReason : "" });
      if (banned) setBanReason("");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Could not update user status");
    } finally {
      setActionId("");
    }
  }

  function confirmDelete(userRow) {
    Alert.alert("Delete account", `Delete ${userRow.email}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setActionId(userRow.id);
          setError("");
          try {
            await api.adminDeleteUser(userRow.id);
            await loadUsers();
          } catch (err) {
            setError(err.message || "Could not delete user");
          } finally {
            setActionId("");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.eyebrow}>Administration</Text>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>{user?.email || "Default admin"}</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{meta.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{meta.activeUsers || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{meta.bannedUsers || 0}</Text>
            <Text style={styles.statLabel}>Banned</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsPanel}>
        <Pressable style={styles.actionCard} onPress={() => navigation.navigate("StudyAreaAdmin")}>
          <View style={styles.actionIcon}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Study Area Administration</Text>
            <Text style={styles.actionText}>Configure areas, capacity, coordinates, and crowd monitoring.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primaryDeep} />
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => navigation.navigate("UserProfile")}>
          <View style={[styles.actionIcon, styles.profileActionIcon]}>
            <MaterialCommunityIcons name="account-cog-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Admin Profile</Text>
            <Text style={styles.actionText}>Update admin name, email, password, or account settings.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primaryDeep} />
        </Pressable>
      </View>

      <View style={styles.usersPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelEyebrow}>User Management</Text>
            <Text style={styles.panelTitle}>Monitor Accounts</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={loadUsers}>
            <MaterialCommunityIcons name="refresh" size={18} color={theme.colors.primaryDeep} />
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, or user id"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
        />

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((item) => {
            const active = item.value === status;
            return (
              <Pressable key={item.value || "all"} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setStatus(item.value)}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={banReason}
          onChangeText={setBanReason}
          placeholder="Optional ban reason"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading accounts...</Text>
          </View>
        ) : null}

        {!loading && users.length === 0 ? <Text style={styles.emptyText}>No accounts found.</Text> : null}

        {users.map((row) => {
          const isMe = String(row.id) === String(user?.id);
          const busy = actionId === row.id;
          return (
            <View key={row.id} style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsFor(row)}</Text>
                </View>
                <View style={styles.userMain}>
                  <Text style={styles.userName}>{row.name || "Unnamed user"}</Text>
                  <Text style={styles.userEmail}>{row.email}</Text>
                  <Text style={styles.userMeta}>
                    {String(row.role || "student").toUpperCase()} · Joined {formatDate(row.createdAt)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, row.isBanned ? styles.statusBanned : styles.statusActive]}>
                  <Text style={[styles.statusText, row.isBanned ? styles.statusTextBanned : styles.statusTextActive]}>
                    {row.isBanned ? "BANNED" : "ACTIVE"}
                  </Text>
                </View>
              </View>

              {row.isBanned && row.bannedReason ? <Text style={styles.banReason}>Reason: {row.bannedReason}</Text> : null}

              <View style={styles.userActions}>
                <Pressable
                  style={[styles.smallBtn, row.isBanned ? styles.unbanBtn : styles.banBtn, (isMe || busy) && styles.disabledBtn]}
                  disabled={isMe || busy}
                  onPress={() => setBan(row, !row.isBanned)}
                >
                  <Text style={[styles.smallBtnText, row.isBanned ? styles.unbanText : styles.banText]}>
                    {busy ? "Saving..." : row.isBanned ? "Unban" : "Ban"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, styles.deleteBtn, (isMe || busy) && styles.disabledBtn]}
                  disabled={isMe || busy}
                  onPress={() => confirmDelete(row)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
              {isMe ? <Text style={styles.selfNote}>This is your current admin account.</Text> : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#eef4ff" },
  content: { padding: 16, paddingBottom: 30, gap: 14 },
  hero: {
    backgroundColor: "#153fae",
    borderRadius: 24,
    padding: 18,
    gap: 14,
    ...theme.shadow.soft,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  eyebrow: { color: "#cfe0ff", fontWeight: "900", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  title: { color: "#ffffff", fontWeight: "900", fontSize: 28, lineHeight: 32 },
  subtitle: { color: "#e6eeff", fontWeight: "700", marginTop: 2 },
  logoutBtn: { backgroundColor: "#ffffff", borderRadius: theme.radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  logoutBtnText: { color: theme.colors.primaryDeep, fontWeight: "900" },
  statRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16, padding: 12 },
  statValue: { color: "#ffffff", fontWeight: "900", fontSize: 24 },
  statLabel: { color: "#dbe7ff", fontWeight: "700", fontSize: 12 },
  actionsPanel: { gap: 10 },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...theme.shadow.soft,
  },
  actionIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  profileActionIcon: { backgroundColor: "#0f9f8f" },
  actionCopy: { flex: 1, gap: 2 },
  actionTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 15 },
  actionText: { color: theme.colors.textMuted, lineHeight: 18, fontSize: 12 },
  usersPanel: { backgroundColor: "#ffffff", borderRadius: 22, borderWidth: 1, borderColor: "#d7e2f3", padding: 14, gap: 12, ...theme.shadow.soft },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  panelEyebrow: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  panelTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 18 },
  refreshBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#edf3ff", alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderColor: "#d7e2f3", backgroundColor: "#f8fbff", borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip: { borderRadius: theme.radius.pill, borderWidth: 1, borderColor: "#d7e2f3", backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { color: theme.colors.textMuted, fontWeight: "900", fontSize: 12 },
  filterChipTextActive: { color: "#ffffff" },
  loadingState: { alignItems: "center", paddingVertical: 18, gap: 8 },
  loadingText: { color: theme.colors.textMuted, fontWeight: "700" },
  emptyText: { color: theme.colors.textMuted, lineHeight: 20 },
  error: { color: theme.colors.danger, fontWeight: "800", backgroundColor: "#fff1f2", borderRadius: theme.radius.sm, padding: 10 },
  userCard: { borderWidth: 1, borderColor: "#e1e8f5", borderRadius: 16, padding: 12, gap: 10, backgroundColor: "#fbfdff" },
  userTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#eaf1ff", alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.colors.primaryDeep, fontWeight: "900" },
  userMain: { flex: 1, gap: 2 },
  userName: { color: theme.colors.text, fontWeight: "900", fontSize: 15 },
  userEmail: { color: theme.colors.textMuted, fontWeight: "700", fontSize: 12 },
  userMeta: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" },
  statusBadge: { borderRadius: theme.radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusActive: { backgroundColor: theme.colors.successBg },
  statusBanned: { backgroundColor: "#ffe2df" },
  statusText: { fontSize: 10, fontWeight: "900" },
  statusTextActive: { color: theme.colors.successText },
  statusTextBanned: { color: theme.colors.danger },
  banReason: { color: theme.colors.danger, fontWeight: "700", fontSize: 12 },
  userActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  smallBtn: { borderRadius: theme.radius.sm, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  smallBtnText: { fontWeight: "900" },
  banBtn: { backgroundColor: "#fff1f2", borderColor: "#fecaca" },
  banText: { color: theme.colors.danger },
  unbanBtn: { backgroundColor: theme.colors.successBg, borderColor: "#bbf7d0" },
  unbanText: { color: theme.colors.successText },
  deleteBtn: { backgroundColor: "#ffffff", borderColor: theme.colors.danger },
  deleteText: { color: theme.colors.danger, fontWeight: "900" },
  disabledBtn: { opacity: 0.45 },
  selfNote: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" },
});

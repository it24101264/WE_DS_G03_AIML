import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../ui/theme";
import { api } from "../../api";
import { marketplacePalette as p } from "./palette";

const FILTERS = ["all", "pending", "accepted", "rejected", "cancelled"];

function parsePickupStart(request) {
  if (!request?.pickupDate) return null;
  const base = new Date(request.pickupDate);
  if (Number.isNaN(base.getTime())) return null;

  const start = request?.pickupTime?.split("-")?.[0]?.trim();
  if (!start) return base;
  const match = start.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return base;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = String(match[3] || "").toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const parsed = new Date(base);
  parsed.setHours(hour, minute, 0, 0);
  return parsed;
}

function isUpcomingPickup(request) {
  if (request?.status !== "accepted") return false;
  const pickupStart = parsePickupStart(request);
  if (!pickupStart) return false;
  const diff = pickupStart.getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

export default function MarketplaceMyRequests({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await api.marketplaceMyRequests();
      setRequests(res?.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  async function cancelRequest(id) {
    try {
      await api.marketplaceCancelRequest(id);
      await fetchRequests();
      Alert.alert("Marketplace", "Request cancelled");
    } catch (err) {
      Alert.alert("Marketplace", err.message || "Failed to cancel request");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const filteredRequests =
    filter === "all" ? requests : requests.filter((request) => request.status === filter);
  const upcomingPickups = requests.filter(isUpcomingPickup);

  const countFor = (status) =>
    status === "all" ? requests.length : requests.filter((request) => request.status === status).length;

  return (
    <View style={styles.page}>
      <Text style={styles.title}>My Requests</Text>
      <Text style={styles.subtitle}>Track all your buy requests here</Text>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.tabList}
        contentContainerStyle={styles.tabRow}
        renderItem={({ item }) => {
          const active = item === filter;
          const label = item.charAt(0).toUpperCase() + item.slice(1);
          return (
            <Pressable
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label} ({countFor(item)})
              </Text>
            </Pressable>
          );
        }}
      />

      {upcomingPickups.length > 0 ? (
        <View style={styles.reminderBox}>
          <View style={styles.reminderHead}>
            <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#0f3fae" />
            <Text style={styles.reminderTitle}>Pickup Reminder</Text>
          </View>
          {upcomingPickups.map((request) => (
            <View key={request._id} style={styles.reminderRow}>
              <Text style={styles.reminderText}>
                {request?.item?.title || "Item"} - {request?.pickupLocationName || "Campus Location"} -{" "}
                {new Date(request.pickupDate).toLocaleDateString()} - {request?.pickupTime || "Time not set"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {filteredRequests.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="bell-outline" size={54} color="#c0c7d4" />
          <Text style={styles.emptyText}>You haven't sent any requests yet</Text>
          <Pressable style={styles.browseBtn} onPress={() => navigation.navigate("MarketplaceBrowse")}>
            <Text style={styles.browseBtnText}>Browse Items</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ gap: 10, paddingBottom: 26 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item?.item?.title || "Item"}</Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
              {item.offerPrice ? (
                <Text style={styles.meta}>Offer: Rs. {Number(item.offerPrice).toLocaleString()}</Text>
              ) : null}
              {item.message ? <Text style={styles.meta}>Message: {item.message}</Text> : null}
              {item.status === "pending" ? (
                <Pressable style={styles.cancelBtn} onPress={() => cancelRequest(item._id)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: p.bg, padding: 12 },
  center: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  title: { color: p.text, fontSize: 30, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: p.muted, fontSize: 15, marginBottom: 8 },
  tabList: { maxHeight: 46, flexGrow: 0 },
  tabRow: { gap: 8, paddingBottom: 6, alignItems: "center" },
  tab: {
    backgroundColor: "#f8f9fb",
    borderWidth: 1,
    borderColor: "#d2d9e5",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  tabActive: { backgroundColor: p.primaryDeep, borderColor: p.primaryDeep },
  tabText: { color: "#586a86", fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: "#ffffff" },
  reminderBox: {
    backgroundColor: p.panelSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c7dcfa",
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  reminderHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  reminderTitle: { color: p.primaryDeep, fontWeight: "900", fontSize: 16 },
  reminderRow: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9e6fb",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reminderText: { color: "#445778", fontWeight: "700", fontSize: 13 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: 60 },
  emptyText: { color: "#a0abbd", fontSize: 15 },
  browseBtn: {
    backgroundColor: p.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 11,
    ...theme.shadow.soft,
  },
  browseBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 4,
  },
  cardTitle: { color: theme.colors.text, fontWeight: "800", fontSize: 16 },
  meta: { color: theme.colors.textMuted },
  cancelBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelText: { color: theme.colors.danger, fontWeight: "700" },
});

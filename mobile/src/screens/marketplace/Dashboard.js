import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../ui/theme";
import { api } from "../../api";
import { marketplacePalette as p } from "./palette";

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

function StatCard({ label, value, onPress, icon, tint }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardIconWrap, { backgroundColor: tint.bg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={tint.fg} />
      </View>
      <View style={styles.cardMid}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <MaterialCommunityIcons name="arrow-right" size={20} color="#98a3bb" />
    </Pressable>
  );
}

export default function MarketplaceDashboard({ navigation, user }) {
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    Promise.all([api.marketplaceSavedItems(), api.marketplaceMyRequests()])
      .then(([savedRes, reqRes]) => {
        setSavedCount(savedRes?.items?.length || 0);
        setRequests(reqRes?.requests || []);
      })
      .catch(() => {
        setSavedCount(0);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const pending = requests.filter((r) => r.status === "pending").length;
  const accepted = requests.filter((r) => r.status === "accepted").length;
  const displayName = user?.name || "User";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "U";
  const displayId = user?.studentId || user?.id || "N/A";
  const displayEmail = user?.email || "N/A";
  const upcomingPickups = requests.filter(isUpcomingPickup);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroRow}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayInitial}</Text>
          </View>
          <View>
            <Text style={styles.title}>Hello, {displayName}!</Text>
            <Text style={styles.subtitle}>{displayId} - {displayEmail}</Text>
          </View>
        </View>

        <Pressable style={styles.browseBtn} onPress={() => navigation.navigate("MarketplaceBrowse")}>
          <MaterialCommunityIcons name="shopping-outline" size={16} color="#fff" />
          <Text style={styles.browseBtnText}>Browse Items</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <StatCard
            label="TOTAL REQUESTS"
            value={requests.length}
            icon="bell-outline"
            tint={{ bg: "#d8f2e3", fg: "#0a8f4c" }}
            onPress={() => navigation.navigate("MarketplaceMyRequests")}
          />
        </View>
        <View style={styles.gridItem}>
          <StatCard
            label="SAVED ITEMS"
            value={savedCount}
            icon="heart-outline"
            tint={{ bg: "#f5deeb", fg: "#d63f83" }}
            onPress={() => navigation.navigate("MarketplaceSavedItems")}
          />
        </View>
        <View style={styles.gridItem}>
          <StatCard
            label="PENDING REQUESTS"
            value={pending}
            icon="clock-outline"
            tint={{ bg: "#f9efc8", fg: "#b57e09" }}
            onPress={() => navigation.navigate("MarketplaceMyRequests")}
          />
        </View>
        <View style={styles.gridItem}>
          <StatCard
            label="ACCEPTED REQUESTS"
            value={accepted}
            icon="check-circle-outline"
            tint={{ bg: "#cff0e2", fg: "#0a8f6d" }}
            onPress={() => navigation.navigate("MarketplaceMyRequests")}
          />
        </View>
      </View>

      {upcomingPickups.length > 0 ? (
        <View style={styles.reminderBox}>
          <View style={styles.reminderHead}>
            <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#0f3fae" />
            <Text style={styles.reminderTitle}>Upcoming Pickup Reminder</Text>
          </View>
          {upcomingPickups.map((request) => (
            <View key={request._id} style={styles.reminderRow}>
              <Text style={styles.reminderText}>
                {request?.item?.title || "Item"} - {request?.pickupLocationName || "Campus Location"} -{" "}
                {new Date(request.pickupDate).toLocaleDateString()} - {request?.pickupTime || "Time not set"}
              </Text>
            </View>
          ))}
          <Pressable style={styles.reminderBtn} onPress={() => navigation.navigate("MarketplaceMyRequests")}>
            <Text style={styles.reminderBtnText}>View Requests</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bottomRow}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Recent Requests</Text>
            <Pressable onPress={() => navigation.navigate("MarketplaceMyRequests")}>
              <Text style={styles.panelLink}>View all</Text>
            </Pressable>
          </View>
          <View style={styles.panelBody}>
            <MaterialCommunityIcons name="bell-outline" size={30} color="#9fb2c9" />
            <Text style={styles.panelText}>No requests yet</Text>
            <Pressable style={styles.panelBtn} onPress={() => navigation.navigate("MarketplaceBrowse")}>
              <Text style={styles.panelBtnText}>Browse Items</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickGrid}>
            <Pressable style={styles.quickCell} onPress={() => navigation.navigate("MarketplaceBrowse")}>
              <MaterialCommunityIcons name="shopping-outline" size={24} color="#102b8f" />
              <Text style={styles.quickText}>BROWSE ITEMS</Text>
            </Pressable>
            <Pressable style={styles.quickCell} onPress={() => navigation.navigate("MarketplaceSavedItems")}>
              <MaterialCommunityIcons name="heart-outline" size={24} color="#102b8f" />
              <Text style={styles.quickText}>SAVED ITEMS</Text>
            </Pressable>
            <Pressable style={styles.quickCell} onPress={() => navigation.navigate("MarketplaceMyRequests")}>
              <MaterialCommunityIcons name="bell-outline" size={24} color="#102b8f" />
              <Text style={styles.quickText}>MY REQUESTS</Text>
            </Pressable>
            <Pressable style={styles.quickCell} onPress={() => navigation.navigate("MarketplaceProfile")}>
              <MaterialCommunityIcons name="account-outline" size={24} color="#102b8f" />
              <Text style={styles.quickText}>EDIT PROFILE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: p.bg },
  pageContent: { padding: 12, paddingBottom: 30, gap: 10 },
  center: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  heroRow: {
    backgroundColor: p.bg,
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 10,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0f3fb6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 22 },
  title: { color: p.text, fontSize: 30, fontWeight: "900" },
  subtitle: { color: p.muted, fontSize: 13, fontWeight: "600" },
  browseBtn: {
    alignSelf: "flex-end",
    backgroundColor: p.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...theme.shadow.soft,
  },
  browseBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  gridItem: { width: "50%", paddingHorizontal: 4, marginBottom: 8 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: p.borderSoft,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMid: { flex: 1 },
  cardLabel: { color: "#8b98b1", fontWeight: "800", fontSize: 13 },
  cardValue: { color: p.primaryDeep, fontSize: 28, fontWeight: "900", lineHeight: 30 },
  reminderBox: {
    backgroundColor: p.panelSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c7dcfa",
    padding: 12,
    gap: 8,
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
  reminderBtn: {
    alignSelf: "flex-start",
    backgroundColor: p.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reminderBtnText: { color: "#fff", fontWeight: "800" },
  bottomRow: { gap: 10 },
  panel: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: p.panelSoft,
    borderWidth: 1,
    borderColor: "#bdd8ea",
  },
  panelHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: { color: p.text, fontWeight: "800", fontSize: 18 },
  panelLink: { color: "#0b3a95", fontWeight: "800", fontSize: 15 },
  panelBody: {
    backgroundColor: "#d7edf9",
    borderTopWidth: 1,
    borderTopColor: "#c2deef",
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  panelText: { color: p.muted, fontSize: 15 },
  panelBtn: {
    backgroundColor: p.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    ...theme.shadow.soft,
  },
  panelBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "#c2deef",
  },
  quickCell: {
    width: "50%",
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#c2deef",
    backgroundColor: "#9ed0ec",
  },
  quickText: { color: "#011d7f", fontWeight: "800", letterSpacing: 0.4 },
});

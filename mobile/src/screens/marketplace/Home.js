import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../ui/theme";
import { api } from "../../api";
import { marketplacePalette as p } from "./palette";

const CATEGORY_CARDS = [
  { label: "Books & Notes", icon: "book-open-outline", category: "Books & Notes", bg: "#e6f3ec" },
  { label: "Electronics", icon: "laptop", category: "Electronics", bg: "#e7eefb" },
  { label: "Stationery", icon: "cube-outline", category: "Stationery", bg: "#fff2d8" },
  { label: "Clothing", icon: "tshirt-crew-outline", category: "Clothing", bg: "#f7e8f2" },
  { label: "View All", icon: "cube-outline", category: "", bg: "#e8edf9" },
];

function ItemCard({ item, onPress }) {
  return (
    <Pressable style={styles.itemCard} onPress={onPress}>
      <Text style={styles.itemCategory}>{item.category}</Text>
      <Text style={styles.itemTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.itemPrice}>Rs. {Number(item.price || 0).toLocaleString()}</Text>
      <Text style={styles.itemMeta}>Views: {item.views || 0}</Text>
    </Pressable>
  );
}

function StatCard({ label, value, icon, tint, onPress }) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIconWrap, { backgroundColor: tint.bg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tint.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <MaterialCommunityIcons name="arrow-right" size={18} color="#98a3bb" />
    </Pressable>
  );
}

export default function MarketplaceHome({ navigation, user }) {
  const [search, setSearch] = useState("");
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    let mounted = true;
    api
      .marketplaceFeaturedItems()
      .then((res) => {
        if (mounted) setFeaturedItems(res?.items || []);
      })
      .catch(() => {
        if (mounted) setFeaturedItems([]);
      })
      .finally(() => {
        if (mounted) setLoadingItems(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
      .finally(() => setLoadingDashboard(false));
  }, []);

  const pending = requests.filter((r) => r.status === "pending").length;
  const accepted = requests.filter((r) => r.status === "accepted").length;
  const recent = requests.slice(0, 3);
  const displayName = user?.name || "User";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "U";
  const displayId = user?.studentId || user?.id || "N/A";
  const displayEmail = user?.email || "N/A";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroOrb} />
        <Text style={styles.heroTitle}>UniMarket</Text>
        <Text style={styles.heroSubtitle}>
          Buy, sell, and discover items within your university community. Powered by AI for smarter recommendations.
        </Text>
      </View>

      <View style={styles.dashboardHero}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardTitle}>Hello, {displayName}!</Text>
            <Text style={styles.dashboardSub}>{displayId} - {displayEmail}</Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.browseBtn} onPress={() => navigation.navigate("MarketplaceBrowse")}>
              <MaterialCommunityIcons name="shopping-outline" size={16} color="#fff" />
              <Text style={styles.browseBtnText}>Browse Items</Text>
            </Pressable>
            <Pressable style={styles.editBtn} onPress={() => navigation.navigate("MarketplaceProfile")}>
              <MaterialCommunityIcons name="account-outline" size={16} color={p.primaryDeep} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search for books, electronics, notes..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            onSubmitEditing={() => navigation.navigate("MarketplaceBrowse", { search })}
            returnKeyType="search"
          />
          <Pressable style={styles.searchBtn} onPress={() => navigation.navigate("MarketplaceBrowse", { search })}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>
      </View>

      {loadingDashboard ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={p.primary} />
        </View>
      ) : (
        <>
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

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Recent Requests</Text>
              <Pressable onPress={() => navigation.navigate("MarketplaceMyRequests")}>
                <Text style={styles.panelLink}>View all</Text>
              </Pressable>
            </View>
            {recent.length === 0 ? (
              <View style={styles.emptyBody}>
                <MaterialCommunityIcons name="bell-outline" size={28} color="#9fb2c9" />
                <Text style={styles.emptyText}>No requests yet</Text>
              </View>
            ) : (
              <View style={styles.listBody}>
                {recent.map((req) => (
                  <View key={req._id} style={styles.requestRow}>
                    <Text style={styles.requestTitle}>{req?.item?.title || "Item"}</Text>
                    <Text style={styles.requestMeta}>{req?.status || "pending"}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.divider, { marginTop: 14, marginBottom: 10 }]} />

          <View style={styles.categoryHeader}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <Pressable onPress={() => navigation.navigate("MarketplaceBrowse")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          <View style={styles.categoryGrid}>
            {CATEGORY_CARDS.map((item) => (
              <Pressable
                key={item.label}
                style={styles.categoryCard}
                onPress={() => navigation.navigate("MarketplaceBrowse", item.category ? { category: item.category } : {})}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                  <MaterialCommunityIcons name={item.icon} size={18} color="#123f9d" />
                </View>
                <Text style={styles.categoryText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recently Listed</Text>
          {loadingItems ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={p.primary} />
            </View>
          ) : featuredItems.length === 0 ? (
            <Text style={styles.emptyLine}>No items</Text>
          ) : (
            <View style={styles.itemsList}>
              {featuredItems.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onPress={() => navigation.navigate("MarketplaceItemDetail", { id: item._id })}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: p.bg },
  pageContent: { padding: 16, paddingBottom: 24 },

  heroCard: {
    backgroundColor: p.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: p.primaryDeep,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  heroOrb: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    right: -18,
    top: -22,
    backgroundColor: "rgba(242, 12, 12, 0.14)",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "900",
    letterSpacing: 1.2,
    fontSize: 9,
    marginBottom: 2,
  },
  heroTitle: { fontSize: 32, fontWeight: "900", color: "#ffffff", lineHeight: 34 },
  heroSubtitle: { color: "rgba(255,255,255,0.92)", marginTop: 4, marginBottom: 2, fontSize: 12 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 48,
  },
  searchInput: { flex: 1, paddingHorizontal: 2, paddingVertical: 8, color: theme.colors.text },
  searchBtn: {
    backgroundColor: p.primary,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    alignSelf: "stretch",
    paddingVertical: 0,
  },
  searchBtnText: { color: "#fff", fontWeight: "700" },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: p.text, marginBottom: 8 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  seeAll: { color: p.primaryDeep, fontWeight: "700", fontSize: 12 },
  divider: { marginBottom: 10, height: 1, backgroundColor: p.borderSoft },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryCard: {
    width: 96,
    backgroundColor: p.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: p.borderSoft,
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
  },
  iconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  categoryText: { color: p.primaryDeep, fontSize: 10, fontWeight: "700", textAlign: "center" },

  centerBlock: { paddingVertical: 20, alignItems: "center" },
  emptyLine: { color: p.muted, fontSize: 14, marginBottom: 10 },
  itemsList: { gap: 10 },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: p.border,
    padding: 12,
  },
  itemCategory: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 4 },
  itemTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  itemPrice: { color: p.primary, fontWeight: "800", marginTop: 4 },
  itemMeta: { color: theme.colors.textMuted, marginTop: 4, fontSize: 12 },

  dashboardHero: {
    backgroundColor: p.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: p.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: p.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 20 },
  dashboardTitle: { color: p.text, fontSize: 22, fontWeight: "900" },
  dashboardSub: { color: p.muted, fontSize: 14, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end", alignItems: "center" },
  browseBtn: {
    backgroundColor: p.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...theme.shadow.soft,
  },
  browseBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  editBtn: {
    backgroundColor: p.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: p.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editBtnText: { color: p.primaryDeep, fontWeight: "800", fontSize: 13 },

  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginTop: 10 },
  gridItem: { width: "50%", paddingHorizontal: 4, marginBottom: 8 },
  statCard: {
    backgroundColor: p.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: p.borderSoft,
  },
  statIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { color: p.primaryDeep, fontSize: 22, fontWeight: "900", lineHeight: 24 },
  statLabel: { color: "#7f8ca5", fontWeight: "800", fontSize: 10 },

  panel: {
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: p.panelSoft,
    borderWidth: 1,
    borderColor: p.border,
  },
  panelHeader: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: { color: p.text, fontWeight: "900", fontSize: 20 },
  panelLink: { color: p.primaryDeep, fontWeight: "700", fontSize: 12 },
  emptyBody: {
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d7edf9",
    borderTopWidth: 1,
    borderTopColor: p.border,
    paddingVertical: 12,
  },
  emptyText: { color: p.muted, fontSize: 14 },
  panelBtn: { backgroundColor: p.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  panelBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  listBody: { borderTopWidth: 1, borderTopColor: p.border, padding: 10, gap: 8, backgroundColor: "#d7edf9" },
  requestRow: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestTitle: { color: p.text, fontWeight: "700", fontSize: 12, flex: 1, marginRight: 8 },
  requestMeta: { color: p.primaryDeep, fontWeight: "800", fontSize: 11, textTransform: "uppercase" },
});

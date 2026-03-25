import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../ui/theme";
import { api } from "../../api";
import { marketplacePalette as p } from "./palette";

const CATEGORIES = ["", "Books & Notes", "Electronics", "Stationery", "Sports", "Lab Equipment", "Furniture", "Other"];
const CONDITIONS = ["", "New", "Like New", "Good", "Fair"];

function ItemCard({ item, onPress }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImage}>
        <MaterialCommunityIcons name="image-outline" size={34} color="#97a8c4" />
        <Pressable style={styles.heartBtn}>
          <MaterialCommunityIcons name="heart-outline" size={18} color="#8b97ad" />
        </Pressable>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>{(item.category || "Other").toUpperCase()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardPrice}>Rs. {Number(item.price || 0).toLocaleString()}</Text>
          <Text style={styles.cardViews}>{item.views || 0}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function MarketplaceBrowse({ navigation, route }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(route?.params?.search || "");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await api.marketplaceItems({
        search,
        category,
        condition,
        sortBy,
        order,
        limit: 30,
      });
      setItems(res?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [category, condition, sortBy, order]);

  const orderLabel = useMemo(() => (order === "desc" ? "Descending" : "Ascending"), [order]);
  const sortLabel = useMemo(() => (sortBy === "price" ? "Price" : "Newest First"), [sortBy]);

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.title}>Browse Items</Text>
        <Text style={styles.subtitle}>Discover items listed by fellow students</Text>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8e9cb4" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search items..."
            placeholderTextColor="#9ca7bb"
            style={styles.searchInput}
          />
          <Pressable style={styles.searchBtn} onPress={fetchItems}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filters</Text>
          <Text style={styles.filtersLabel}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              const label = cat || "All";
              return (
                <Pressable
                  key={label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filtersLabel}>Condition</Text>
          <View style={styles.chips}>
            {CONDITIONS.map((c) => {
              const active = condition === c;
              const label = c || "Any";
              return (
                <Pressable key={label} style={[styles.chip, active && styles.chipActive]} onPress={() => setCondition(c)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.listPane}>
          <View style={styles.topRow}>
            <Text style={styles.itemCount}>{items.length} items</Text>
            <View style={styles.sortRow}>
              <Pressable
                style={styles.sortBtn}
                onPress={() => setSortBy((v) => (v === "createdAt" ? "price" : "createdAt"))}
              >
                <Text style={styles.sortText}>{sortLabel}</Text>
              </Pressable>
              <Pressable
                style={styles.sortBtn}
                onPress={() => setOrder((v) => (v === "desc" ? "asc" : "desc"))}
              >
                <Text style={styles.sortText}>{orderLabel}</Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.noItems}>No items</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item._id}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <ItemCard
                    item={item}
                    onPress={() => navigation.navigate("MarketplaceItemDetail", { id: item._id })}
                  />
                </View>
              )}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: p.bg },
  hero: {
    backgroundColor: p.panelSoft,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#bdd8ea",
  },
  title: { color: p.text, fontSize: 30, fontWeight: "900" },
  subtitle: { color: p.muted, fontSize: 16, marginTop: 6, marginBottom: 10 },
  searchWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: p.border,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 22, paddingVertical: 8 },
  searchBtn: {
    backgroundColor: p.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBtnText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  content: { flex: 1, flexDirection: "row", gap: 10, padding: 10 },
  filtersCard: {
    width: 140,
    backgroundColor: p.panelSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bdd8ea",
    padding: 10,
    gap: 8,
  },
  filtersTitle: { color: p.text, fontWeight: "900", fontSize: 18 },
  filtersLabel: {
    color: "#7c8ea9",
    fontWeight: "800",
    fontSize: 14,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d4dbe8",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: p.primaryDeep, borderColor: p.primaryDeep },
  chipText: { color: "#51627f", fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  listPane: { flex: 1, gap: 8 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemCount: { color: p.muted, fontWeight: "700", fontSize: 14 },
  sortRow: { flexDirection: "row", gap: 8 },
  sortBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d4dbe8",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortText: { color: "#475b79", fontWeight: "700", fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  noItems: { color: p.muted, fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d6ddea",
  },
  cardImage: {
    height: 120,
    backgroundColor: "#ecf1f9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 10, gap: 4 },
  cardCategory: { color: "#10307b", fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
  cardTitle: { color: p.primaryDeep, fontWeight: "800", fontSize: 14, minHeight: 34 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrice: { color: p.primaryDeep, fontSize: 15, fontWeight: "900" },
  cardViews: { color: "#8a99b0", fontSize: 13, fontWeight: "700" },
});

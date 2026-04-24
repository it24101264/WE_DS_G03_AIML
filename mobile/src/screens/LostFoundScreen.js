import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { theme } from "../ui/theme";
import {
  CATEGORY_OPTIONS,
  LOCATION_OPTIONS,
  POST_TYPE_OPTIONS,
  LostFoundCard,
  formatLocation,
} from "./lostFoundShared";

function FilterSection({ title, children }) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.filterWrap}>{children}</View>
    </View>
  );
}

export default function LostFoundScreen({ navigation }) {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [mineCount, setMineCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh(
    filters = { q: search, type: searchType, location: searchLocation, category: searchCategory, status: searchStatus }
  ) {
    setLoading(true);
    setError("");
    try {
      const [browseRes, mineRes] = await Promise.all([api.lostFoundItems(filters), api.myLostFoundItems()]);
      setItems(browseRes.data || []);
      setMineCount((mineRes.data || []).length);
    } catch (err) {
      setError(err.message || "Could not load lost and found items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh({ q: "", type: "", location: "", category: "", status: "" });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refresh({ q: search, type: searchType, location: searchLocation, category: searchCategory, status: searchStatus });
    }, [search, searchType, searchLocation, searchCategory, searchStatus])
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.pageOrbOne} />
      <View style={styles.pageOrbTwo} />

      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <View style={styles.bgGrid} />

        <Text style={styles.heroTitle}>Lost and Found</Text>
        <Text style={styles.heroSubtitle}>Browse campus posts, filter them fast, and open any card for full details.</Text>

        <View style={styles.quickRow}>
          <Pressable style={styles.quickCard} onPress={() => navigation.navigate("LostFoundCreate")}>
            <MaterialCommunityIcons name="plus-circle-outline" size={28} color="#ffffff" />
            <Text style={styles.quickTitle}>Post Item</Text>
            <Text style={styles.quickSubtitle}>Add Item</Text>
          </Pressable>

          <Pressable style={styles.quickCard} onPress={() => navigation.navigate("LostFoundMyPosts")}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#ffffff" />
            <Text style={styles.quickTitle}>My Posts</Text>
            <Text style={styles.quickSubtitle}>{mineCount} post(s)</Text>
          </Pressable>
        </View>

        <Pressable style={styles.aiSearchCard} onPress={() => navigation.navigate("LostFoundAiSearch")}>
          <View style={styles.aiSearchIcon}>
            <MaterialCommunityIcons name="creation-outline" size={22} color="#ffffff" />
          </View>
          <View style={styles.aiSearchCopy}>
            <Text style={styles.aiSearchTitle}>AI Search</Text>
            <Text style={styles.aiSearchSubtitle}>Find similar posts using your own description or an existing post.</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#ffffff" />
        </Pressable>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Browse</Text>
            <Text style={styles.cardTitle}>Search and Filter</Text>
          </View>
          <View style={styles.resultsPill}>
            <Text style={styles.resultsPillText}>{items.length} items</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search items"
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          <Pressable style={styles.filterIconBtn} onPress={() => setFiltersOpen((prev) => !prev)}>
            <MaterialCommunityIcons name="tune-variant" size={20} color={theme.colors.primaryDeep} />
          </Pressable>
        </View>

        {filtersOpen ? (
          <View style={styles.sliderPanel}>
            <FilterSection title="Post Status">
              <Pressable style={[styles.filterChip, searchType === "" && styles.filterChipActive]} onPress={() => setSearchType("")}>
                <Text style={[styles.filterChipText, searchType === "" && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {POST_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.filterChip, searchType === option && styles.filterChipActive]}
                  onPress={() => setSearchType(option)}
                >
                  <Text style={[styles.filterChipText, searchType === option && styles.filterChipTextActive]}>{option}</Text>
                </Pressable>
              ))}
            </FilterSection>

            <FilterSection title="Location">
              <Pressable style={[styles.filterChip, searchLocation === "" && styles.filterChipActive]} onPress={() => setSearchLocation("")}>
                <Text style={[styles.filterChipText, searchLocation === "" && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {LOCATION_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.filterChip, searchLocation === option && styles.filterChipActive]}
                  onPress={() => setSearchLocation(option)}
                >
                  <Text style={[styles.filterChipText, searchLocation === option && styles.filterChipTextActive]}>
                    {formatLocation(option)}
                  </Text>
                </Pressable>
              ))}
            </FilterSection>

            <FilterSection title="Item Type">
              <Pressable style={[styles.filterChip, searchCategory === "" && styles.filterChipActive]} onPress={() => setSearchCategory("")}>
                <Text style={[styles.filterChipText, searchCategory === "" && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.filterChip, searchCategory === option && styles.filterChipActive]}
                  onPress={() => setSearchCategory(option)}
                >
                  <Text style={[styles.filterChipText, searchCategory === option && styles.filterChipTextActive]}>
                    {formatLocation(option)}
                  </Text>
                </Pressable>
              ))}
            </FilterSection>

            <FilterSection title="Status">
              <Pressable style={[styles.filterChip, searchStatus === "" && styles.filterChipActive]} onPress={() => setSearchStatus("")}>
                <Text style={[styles.filterChipText, searchStatus === "" && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {["OPEN", "RESOLVED"].map((option) => (
                <Pressable
                  key={option}
                  style={[styles.filterChip, searchStatus === option && styles.filterChipActive]}
                  onPress={() => setSearchStatus(option)}
                >
                  <Text style={[styles.filterChipText, searchStatus === option && styles.filterChipTextActive]}>{option}</Text>
                </Pressable>
              ))}
            </FilterSection>

            <View style={styles.row}>
              <Pressable
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={() => {
                  refresh({ q: search, type: searchType, location: searchLocation, category: searchCategory, status: searchStatus });
                  setFiltersOpen(false);
                }}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>{loading ? "Loading..." : "Apply Filters"}</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  setSearch("");
                  setSearchType("");
                  setSearchLocation("");
                  setSearchCategory("");
                  setSearchStatus("");
                  refresh({ q: "", type: "", location: "", category: "", status: "" });
                  setFiltersOpen(false);
                }}
              >
                <Text style={styles.secondaryBtnText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.postsSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Listings</Text>
            <Text style={styles.cardTitle}>Posts</Text>
          </View>
        </View>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading lost and found items...</Text>
          </View>
        ) : null}
        {!loading && items.length === 0 ? <Text style={styles.muted}>No items found.</Text> : null}
        {!loading
          ? items.map((item) => (
              <LostFoundCard
                key={item.id}
                item={item}
                onPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id })}
                onItemFoundPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id })}
              />
            ))
          : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#eef4ff" },
  pageContent: { padding: 16, paddingBottom: 28, gap: 14 },
  pageOrbOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(33,87,242,0.10)",
    top: -80,
    right: -40,
  },
  pageOrbTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(18,184,134,0.08)",
    bottom: 120,
    left: -60,
  },
  heroCard: {
    backgroundColor: "#163fcb",
    borderRadius: 28,
    padding: 18,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  bgOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.12)",
    top: -70,
    right: -40,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.1)",
    bottom: -40,
    left: -30,
  },
  bgGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: "transparent",
  },
  heroTitle: { color: "#ffffff", fontSize: 30, fontWeight: "900", letterSpacing: -0.4 },
  heroSubtitle: { color: "#e6eeff", marginTop: 8, lineHeight: 22, maxWidth: "92%" },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  quickCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  quickTitle: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  quickSubtitle: { color: "#dce7ff", fontWeight: "600" },
  aiSearchCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  aiSearchIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  aiSearchCopy: { flex: 1, gap: 2 },
  aiSearchTitle: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  aiSearchSubtitle: { color: "#dce7ff", lineHeight: 19 },
  searchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  postsSection: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    gap: 8,
    ...theme.shadow.soft,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10,
  },
  sectionEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  cardTitle: { fontWeight: "800", color: theme.colors.text, fontSize: 16 },
  resultsPill: {
    backgroundColor: "#edf3ff",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#d4e0fb",
  },
  resultsPillText: {
    color: theme.colors.primaryDeep,
    fontWeight: "800",
    fontSize: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f5f8ff",
    color: theme.colors.text,
  },
  filterIconBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf1ff",
    borderWidth: 1,
    borderColor: "#cfe0ff",
  },
  sliderPanel: {
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#edf1f7",
  },
  filterSection: { gap: 6 },
  filterTitle: { color: theme.colors.text, fontWeight: "800", fontSize: 13 },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: "#d9e2f0",
    backgroundColor: "#ffffff",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: "#deecff", borderColor: theme.colors.primary },
  filterChipText: { color: theme.colors.textMuted, fontWeight: "700" },
  filterChipTextActive: { color: theme.colors.primaryDeep },
  row: { flexDirection: "row", gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: theme.colors.primary, fontWeight: "800" },
  btnDisabled: { opacity: 0.7 },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  muted: { color: theme.colors.textMuted, paddingTop: 4 },
  error: { color: theme.colors.danger, fontSize: 13 },
});

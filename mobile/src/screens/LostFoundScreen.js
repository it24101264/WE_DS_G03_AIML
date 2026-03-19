import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";

const LOCATION_OPTIONS = [
  { value: "CANTEEN", label: "Canteen" },
  { value: "BIRD_NEST", label: "Bird Nest" },
  { value: "AR", label: "AR" },
  { value: "LIBRARY", label: "Library" },
  { value: "LAB_COMPLEX", label: "Lab Complex" },
  { value: "AUDITORIUM", label: "Auditorium" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "OTHER", label: "Other" },
];

const ITEM_CATEGORY_OPTIONS = [
  { value: "DEVICE", label: "Devices" },
  { value: "BAG", label: "Bags" },
  { value: "PURSE", label: "Purses" },
  { value: "ID_CARD", label: "ID Cards" },
  { value: "BOOK", label: "Books" },
  { value: "KEYS", label: "Keys" },
  { value: "OTHER", label: "Other" },
];

function humanize(value) {
  return String(value || "").split("_").join(" ");
}

function formatTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function categoryIcon(category) {
  return (
    {
      DEVICE: "laptop",
      BAG: "bag-personal",
      PURSE: "wallet-outline",
      ID_CARD: "card-account-details-outline",
      BOOK: "book-open-page-variant",
      KEYS: "key-variant",
      OTHER: "shape-outline",
    }[String(category || "").toUpperCase()] || "shape-outline"
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TypePill({ type }) {
  const isLost = String(type || "").toUpperCase() === "LOST";
  return (
    <View style={[styles.typePill, isLost ? styles.typePillLost : styles.typePillFound]}>
      <Text style={[styles.typePillText, isLost ? styles.typePillTextLost : styles.typePillTextFound]}>
        {isLost ? "LOST" : "FOUND"}
      </Text>
    </View>
  );
}

function StatusPill({ status }) {
  const isResolved = String(status || "").toUpperCase() === "RESOLVED";
  return (
    <View style={[styles.statusPill, isResolved ? styles.statusPillResolved : styles.statusPillOpen]}>
      <Text style={[styles.statusPillText, isResolved ? styles.statusPillTextResolved : styles.statusPillTextOpen]}>
        {isResolved ? "RESOLVED" : "OPEN"}
      </Text>
    </View>
  );
}

export default function LostFoundScreen({ navigation, user }) {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("OPEN");
  const [filterLocation, setFilterLocation] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;
  const hasMountedRef = useRef(false);

  async function loadData() {
    setLoading(true);
    setErr("");
    try {
      const params = {
        type: filterType === "ALL" ? undefined : filterType,
        status: filterStatus === "ALL" ? undefined : filterStatus,
        location: filterLocation === "ALL" ? undefined : filterLocation,
        itemCategory: filterCategory === "ALL" ? undefined : filterCategory,
        q: searchText.trim() || undefined,
      };
      const allRes = await api.lostFoundItems(params);
      setItems(allRes.data || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      loadData();
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchText, filterType, filterStatus, filterLocation, filterCategory]);

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: filtersOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [filtersOpen, filterAnim]);

  const filterHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 520],
  });

  const filterOpacity = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <Text style={styles.title}>Lost & Found</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>

        <View style={styles.actionCard}>
          <Pressable style={styles.heroPrimaryBtn} onPress={() => navigation.navigate("LostFoundPost")}>
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />
            <Text style={styles.heroPrimaryBtnText}>Post Item</Text>
          </Pressable>
          <Pressable style={styles.heroSecondaryBtn} onPress={() => navigation.navigate("LostFoundMyItems")}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={theme.colors.primaryDeep} />
            <Text style={styles.heroSecondaryBtnText}>My Items</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.browseHeader}>
          <Text style={styles.cardTitle}>Browse Items</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.filterToggleBtn} onPress={loadData} disabled={loading}>
              <MaterialCommunityIcons name="refresh" size={18} color={theme.colors.primary} />
              <Text style={styles.filterToggleText}>{loading ? "Loading..." : "Refresh"}</Text>
            </Pressable>
            <Pressable style={styles.filterToggleBtn} onPress={() => setFiltersOpen((value) => !value)}>
              <MaterialCommunityIcons name={filtersOpen ? "tune-vertical" : "tune"} size={18} color={theme.colors.primary} />
              <Text style={styles.filterToggleText}>Filters</Text>
            </Pressable>
          </View>
        </View>

        <TextInput
          placeholder="Search by keyword"
          placeholderTextColor={theme.colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={loadData}
          style={styles.input}
        />

        <Animated.View style={[styles.filterSlider, { height: filterHeight, opacity: filterOpacity }]}>
          <View style={styles.filterSliderInner}>
            <Text style={styles.helperLabel}>Filter Type</Text>
            <View style={styles.chipRow}>
              <FilterChip label="All" active={filterType === "ALL"} onPress={() => setFilterType("ALL")} />
              <FilterChip label="Lost" active={filterType === "LOST"} onPress={() => setFilterType("LOST")} />
              <FilterChip label="Found" active={filterType === "FOUND"} onPress={() => setFilterType("FOUND")} />
            </View>

            <Text style={styles.helperLabel}>Filter Status</Text>
            <View style={styles.chipRow}>
              <FilterChip label="All" active={filterStatus === "ALL"} onPress={() => setFilterStatus("ALL")} />
              <FilterChip label="Open" active={filterStatus === "OPEN"} onPress={() => setFilterStatus("OPEN")} />
              <FilterChip label="Resolved" active={filterStatus === "RESOLVED"} onPress={() => setFilterStatus("RESOLVED")} />
            </View>

            <Text style={styles.helperLabel}>Filter Location</Text>
            <View style={styles.chipRow}>
              <FilterChip label="All" active={filterLocation === "ALL"} onPress={() => setFilterLocation("ALL")} />
              {LOCATION_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={filterLocation === option.value}
                  onPress={() => setFilterLocation(option.value)}
                />
              ))}
            </View>

            <Text style={styles.helperLabel}>Filter Category</Text>
            <View style={styles.chipRow}>
              <FilterChip label="All" active={filterCategory === "ALL"} onPress={() => setFilterCategory("ALL")} />
              {ITEM_CATEGORY_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={filterCategory === option.value}
                  onPress={() => setFilterCategory(option.value)}
                />
              ))}
            </View>

            <Pressable style={[styles.secondaryBtn, loading && styles.btnDisabled]} onPress={loadData} disabled={loading}>
              <Text style={styles.secondaryBtnText}>{loading ? "Loading..." : "Apply Filters"}</Text>
            </Pressable>
          </View>
        </Animated.View>

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.muted}>No matching items found.</Text>}
          renderItem={({ item }) => {
            const isLost = String(item.type || "").toUpperCase() === "LOST";
            const isResolved = String(item.status || "").toUpperCase() === "RESOLVED";
            return (
              <Pressable
                style={[
                  styles.listItem,
                  isResolved ? styles.listItemResolved : isLost ? styles.listItemLost : styles.listItemFound,
                ]}
                onPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id, item })}
              >
                <View style={styles.listTopRow}>
                  <View
                    style={[
                      styles.categoryIconWrap,
                      isResolved
                        ? styles.categoryIconWrapResolved
                        : isLost
                          ? styles.categoryIconWrapLost
                          : styles.categoryIconWrapFound,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={categoryIcon(item.itemCategory)}
                      size={20}
                      color={isResolved ? "#475467" : isLost ? "#b42318" : "#067647"}
                    />
                  </View>
                  <View style={styles.listMain}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {humanize(item.itemCategory)} | {humanize(item.location)}
                    </Text>
                    <Text style={styles.previewText} numberOfLines={2}>
                      {item.description || "Tap to view full details."}
                    </Text>
                  </View>
                </View>
                <View style={styles.footerRow}>
                  <View style={styles.pillStack}>
                    <TypePill type={item.type} />
                    <StatusPill status={item.status} />
                  </View>
                  <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
                </View>
              </Pressable>
            );
          }}
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
  title: {
    color: "#fff",
    fontSize: 24,
  },
  subtitle: {
    color: "#e8eeff",
    marginTop: 4,
  },
  actionCard: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    gap: 10,
  },
  heroPrimaryBtn: {
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
  },
  heroPrimaryBtnText: {
    color: "#fff",
  },
  heroSecondaryBtn: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
  },
  heroSecondaryBtnText: {
    color: theme.colors.primaryDeep,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  browseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    backgroundColor: "#fff",
  },
  filterToggleText: {
    color: theme.colors.primary,
    fontSize: 12,
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
  filterSlider: {
    overflow: "hidden",
  },
  filterSliderInner: {
    gap: 8,
    paddingTop: 2,
  },
  helperLabel: {
    color: theme.colors.text,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  secondaryBtn: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  secondaryBtnText: {
    color: theme.colors.primary,
  },
  listItem: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  listItemLost: {
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
  },
  listItemFound: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  listItemResolved: {
    borderColor: "#d0d5dd",
    backgroundColor: "#f2f4f7",
  },
  listTopRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconWrapLost: {
    backgroundColor: "#fee4e2",
  },
  categoryIconWrapFound: {
    backgroundColor: "#dcfce7",
  },
  categoryIconWrapResolved: {
    backgroundColor: "#eaecf0",
  },
  listMain: {
    flex: 1,
    gap: 4,
  },
  pillStack: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  itemTitle: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  previewText: {
    color: theme.colors.neutralText,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  typePill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillLost: {
    backgroundColor: "#fee4e2",
  },
  typePillFound: {
    backgroundColor: "#dcfce7",
  },
  typePillText: {
    fontSize: 11,
  },
  typePillTextLost: {
    color: "#b42318",
  },
  typePillTextFound: {
    color: "#067647",
  },
  statusPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillOpen: {
    backgroundColor: "#deecff",
  },
  statusPillResolved: {
    backgroundColor: "#eaecf0",
  },
  statusPillText: {
    fontSize: 11,
  },
  statusPillTextOpen: {
    color: "#184a9b",
  },
  statusPillTextResolved: {
    color: "#475467",
  },
  muted: {
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});

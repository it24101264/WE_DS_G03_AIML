import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { MARKETPLACE_STATUS, SellerPostCard } from "./marketplaceShared";

const CATEGORY_FILTERS = ["All", "Books", "Electronics", "Clothing", "Stationery", "Other"];
const STATUS_FILTERS = ["All", "Available", "Sold"];

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MarketplaceSellerHomeScreen({ navigation, user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionPostId, setActionPostId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.myMarketplacePosts();
      setPosts(res.data || []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load your marketplace posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  async function markAsSold(postId) {
    try {
      setActionPostId(postId);
      await api.updateMarketplacePostStatus(postId, { status: MARKETPLACE_STATUS.SOLD });
      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not mark this post as sold");
    } finally {
      setActionPostId("");
    }
  }

  function confirmDelete(postId) {
    Alert.alert("Delete post", "This will remove the listing permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setActionPostId(postId);
            await api.deleteMarketplacePost(postId);
            await loadPosts();
          } catch (err) {
            setError(err.message || "Could not delete this post");
          } finally {
            setActionPostId("");
          }
        },
      },
    ]);
  }

  const activeCount = posts.filter((post) => String(post.status || "").toUpperCase() !== MARKETPLACE_STATUS.SOLD).length;
  const soldCount = posts.length - activeCount;
  const totalAvailableValue = posts
    .filter((post) => String(post.status || "").toUpperCase() !== MARKETPLACE_STATUS.SOLD)
    .reduce((sum, post) => sum + Number(post.price || 0), 0);
  const totalRequests = posts.reduce(
    (sum, post) => sum + Number(post.requestCount || (Array.isArray(post.requests) ? post.requests.length : 0)),
    0
  );

  const filteredPosts = useMemo(() => {
    const q = String(searchText || "").trim().toLowerCase();
    const desiredCategory = String(categoryFilter || "All");
    const desiredStatus = String(statusFilter || "All");

    return posts.filter((post) => {
      const title = String(post?.title || "").toLowerCase();
      if (q && !title.includes(q)) return false;

      const category = String(post?.category || "Other");
      if (desiredCategory !== "All" && category !== desiredCategory) return false;

      const isSold = String(post?.status || "").toUpperCase() === MARKETPLACE_STATUS.SOLD;
      if (desiredStatus === "Available" && isSold) return false;
      if (desiredStatus === "Sold" && !isSold) return false;

      return true;
    });
  }, [posts, searchText, categoryFilter, statusFilter]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Seller</Text>
        <Text style={styles.title}>Your Listings</Text>
        <Text style={styles.userEmail}>{user?.email || "Signed in user"}</Text>
        <Text style={styles.subtitle}>Create posts, review buyer requests, and mark items as sold.</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{posts.length}</Text>
            <Text style={styles.statLabel}>Total posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{soldCount}</Text>
            <Text style={styles.statLabel}>Sold</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>LKR {totalAvailableValue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Available value</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalRequests}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("MarketplaceSellerForm")}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryBtnText}>New Post</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("MarketplaceSellerRequests")}>
            <Text style={styles.secondaryBtnText}>Requests</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("MarketplaceSellerSales")}>
            <Text style={styles.secondaryBtnText}>Sales</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("MarketplaceSellerAnalytics")}>
            <Text style={styles.secondaryBtnText}>Analytics</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={loadPosts}>
            <Text style={styles.secondaryBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Search & filters</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />

        <Text style={styles.filterLabel}>Category</Text>
        <View style={styles.filterRow}>
          {CATEGORY_FILTERS.map((label) => (
            <FilterChip
              key={label}
              label={label}
              active={label === categoryFilter}
              onPress={() => setCategoryFilter(label)}
            />
          ))}
        </View>

        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((label) => (
            <FilterChip
              key={label}
              label={label}
              active={label === statusFilter}
              onPress={() => setStatusFilter(label)}
            />
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Listings</Text>
        <Text style={styles.sectionMeta}>{filteredPosts.length} item(s)</Text>
      </View>

      {filteredPosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{posts.length ? "No matches" : "No items yet"}</Text>
          <Text style={styles.emptySubtitle}>
            {posts.length
              ? "Try changing your search or filters."
              : "Add your first item to start selling."}
          </Text>
        </View>
      ) : null}

      {filteredPosts.map((post) => (
        <SellerPostCard
          key={post.id}
          item={post}
          actionLoading={actionPostId === post.id}
          onPress={() => navigation.navigate("MarketplaceSellerDetail", { postId: post.id })}
          onEdit={() => navigation.navigate("MarketplaceSellerForm", { postId: post.id })}
          onMarkSold={() => markAsSold(post.id)}
          onDelete={() => confirmDelete(post.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#eef4ff",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    backgroundColor: "#123dc8",
    borderRadius: 28,
    padding: 18,
    gap: 12,
    ...theme.shadow.soft,
  },
  eyebrow: {
    color: "#cddafe",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "900",
    fontSize: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
  },
  userEmail: {
    color: "#e6ecff",
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    color: "#dce6ff",
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    minWidth: "22%",
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 12,
    gap: 3,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: "#dce6ff",
    fontWeight: "700",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.text,
  },
  sectionMeta: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
  filterCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  filterTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  filterLabel: {
    color: theme.colors.text,
    fontWeight: "800",
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  filterChipActive: {
    backgroundColor: theme.colors.infoBg,
    borderColor: theme.colors.infoBg,
  },
  filterChipText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: theme.colors.infoText,
  },
});

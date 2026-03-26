import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "price_desc", label: "Price High-Low" },
  { key: "price_asc", label: "Price Low-High" },
];

function matchesSearch(post, search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return true;

  return [post?.title, post?.description, post?.sellerName, post?.userName]
    .map((value) => String(value || "").toLowerCase())
    .some((value) => value.includes(q));
}

function sortPosts(items, sort) {
  const posts = [...items];

  posts.sort((left, right) => {
    if (sort === "oldest") {
      return new Date(left?.createdAt || 0).getTime() - new Date(right?.createdAt || 0).getTime();
    }
    if (sort === "price_desc") {
      return Number(right?.price || 0) - Number(left?.price || 0);
    }
    if (sort === "price_asc") {
      return Number(left?.price || 0) - Number(right?.price || 0);
    }

    return new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();
  });

  return posts;
}

function BuyerBrowseCard({ item, onPress, isOwnPost }) {
  return (
    <Pressable style={styles.listingCard} onPress={onPress}>
      <PhotoStrip photos={item?.photos} compact />
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderMain}>
          <Text style={styles.cardTitle}>{item?.title || "Untitled item"}</Text>
          <Text style={styles.cardPrice}>{formatCurrency(item?.price)}</Text>
        </View>
        <View style={styles.badgeStack}>
          {isOwnPost ? (
            <View style={styles.ownBadge}>
              <Text style={styles.ownBadgeText}>Your Post</Text>
            </View>
          ) : null}
          <SellerStatusBadge status={item?.status} />
        </View>
      </View>
      <Text style={styles.cardSeller}>Seller: {item?.sellerName || item?.userName || "Unknown seller"}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item?.description || "No description provided."}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{formatMarketplaceTime(item?.createdAt)}</Text>
        <Text style={styles.cardMeta}>{Number(item?.requestCount || 0)} request(s)</Text>
      </View>
    </Pressable>
  );
}

export default function MarketplaceBuyerScreen({ navigation, user }) {
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasMountedRef = useRef(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const [feedResult, mineResult] = await Promise.allSettled([api.marketplacePosts({ sort }), api.myMarketplacePosts()]);
      const feedItems =
        feedResult.status === "fulfilled" && Array.isArray(feedResult.value?.data) ? feedResult.value.data : [];
      const mineItems =
        mineResult.status === "fulfilled" && Array.isArray(mineResult.value?.data) ? mineResult.value.data : [];
      const combined = [...feedItems, ...mineItems];
      const mergedById = new Map();

      combined.forEach((post) => {
        if (post?.id) mergedById.set(post.id, post);
      });

      const mergedItems = [...mergedById.values()];
      const filtered = mergedItems.filter((post) => matchesSearch(post, search));
      const ownOnly = mergedItems.filter((post) => String(post.userId || "") === String(user?.id || ""));
      const publicOnly = filtered.filter((post) => String(post.userId || "") !== String(user?.id || ""));

      setMyPosts(sortPosts(ownOnly.filter((post) => matchesSearch(post, search)), sort));
      setPosts(sortPosts(publicOnly, sort));
      if (feedResult.status === "rejected" && mineResult.status === "rejected") {
        setError("Could not load marketplace items");
      } else if (mineResult.status === "rejected") {
        setError("General listings loaded, but your seller posts could not be loaded.");
      } else if (feedResult.status === "rejected") {
        setError("Your seller posts loaded, but the shared marketplace feed could not be loaded.");
      } else {
        setError("");
      }
    } catch (err) {
      setError(err.message || "Could not load marketplace items");
      setMyPosts([]);
    } finally {
      setLoading(false);
    }
  }, [search, sort, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    loadPosts();
  }, [sort, loadPosts]);

  function openBuyerPost(post, isOwnPost = false) {
    const isSold = String(post?.status || "").toUpperCase() === "SOLD";
    if (isSold && !isOwnPost) {
      Alert.alert("Item already sold", "This item is already sold.");
      return;
    }

    navigation.navigate("MarketplaceBuyerDetail", { postId: post.id });
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="basket-fill" size={28} color="#ffffff" />
          </View>
          <Pressable style={styles.heroBtn} onPress={() => navigation.navigate("MarketplaceBuyerRequests")}>
            <Text style={styles.heroBtnText}>My Requests</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>Buyer</Text>
        <Text style={styles.title}>Browse Listings</Text>
        <Text style={styles.subtitle}>Browse seller posts automatically, search when needed, and open any item to negotiate or review its status.</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by item, description, or seller"
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadPosts}
        />

        <View style={styles.filterWrap}>
          {SORT_OPTIONS.map((option) => {
            const selected = option.key === sort;
            return (
              <Pressable key={option.key} style={[styles.filterChip, selected && styles.filterChipActive]} onPress={() => setSort(option.key)}>
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.primaryBtn} onPress={loadPosts}>
            <Text style={styles.primaryBtnText}>{loading ? "Loading..." : "Search Listings"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("MarketplaceBuyerRequests")}>
            <Text style={styles.secondaryBtnText}>Manage Requests</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Items</Text>
        <Text style={styles.sectionMeta}>{loading ? "Loading..." : `${posts.length} item(s)`}</Text>
      </View>

      {myPosts.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Seller Posts</Text>
            <Text style={styles.sectionMeta}>{myPosts.length} item(s)</Text>
          </View>

          {myPosts.map((post) => (
            <BuyerBrowseCard
              key={`mine-${post.id}`}
              item={post}
              isOwnPost
              onPress={() => openBuyerPost(post, true)}
            />
          ))}
        </>
      ) : null}

      {!loading && posts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matching listings</Text>
          <Text style={styles.emptySubtitle}>Try a different search or check back after sellers add new posts.</Text>
        </View>
      ) : null}

      {posts.map((post) => (
        <BuyerBrowseCard
          key={post.id}
          item={post}
          isOwnPost={String(post.userId || "") === String(user?.id || "")}
          onPress={() => openBuyerPost(post, false)}
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
    backgroundColor: "#0f9f8f",
    borderRadius: 28,
    padding: 18,
    gap: 12,
    ...theme.shadow.soft,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtn: {
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  eyebrow: {
    color: "#d8fff8",
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
  subtitle: {
    color: "#d5fff7",
    lineHeight: 21,
  },
  searchInput: {
    borderRadius: theme.radius.sm,
    backgroundColor: "#ffffff",
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  filterChipText: {
    color: "#e6fffb",
    fontWeight: "800",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#0d6f63",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: "#0d6f63",
    fontWeight: "900",
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
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
  listingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: 6,
  },
  cardHeaderMain: {
    flex: 1,
    gap: 4,
  },
  ownBadge: {
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ownBadgeText: {
    color: theme.colors.warningText,
    fontWeight: "900",
    fontSize: 12,
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  cardPrice: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
  },
  cardSeller: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  cardDescription: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cardMeta: {
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
    fontWeight: "900",
    fontSize: 18,
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
});

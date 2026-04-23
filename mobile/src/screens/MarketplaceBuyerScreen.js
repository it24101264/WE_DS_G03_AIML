import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "price_desc", label: "Price High-Low" },
  { key: "price_asc", label: "Price Low-High" },
];

function getPickupTimestamp(request) {
  const raw = request?.pickupDateTime || request?.pickupTime || "";
  const parsed = new Date(raw);
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : NaN;
}

function getUpcomingAcceptedPickups(requests) {
  const now = Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;

  return (Array.isArray(requests) ? requests : [])
    .filter((request) => String(request?.status || "").toUpperCase() === "ACCEPTED")
    .filter((request) => {
      const when = getPickupTimestamp(request);
      return Number.isFinite(when) && when > now && when <= horizon;
    })
    .sort((left, right) => getPickupTimestamp(left) - getPickupTimestamp(right));
}

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

  const active = posts.filter((post) => String(post?.status || "").toUpperCase() !== "SOLD");
  const sold = posts.filter((post) => String(post?.status || "").toUpperCase() === "SOLD");
  return [...active, ...sold];
}

function BuyerBrowseCard({ item, onPress, isOwnPost, favorited, onToggleFavorite }) {
  return (
    <Pressable style={styles.listingCard} onPress={onPress}>
      {!isOwnPost ? (
        <Pressable
          style={styles.favoriteBtn}
          onPress={(event) => {
            event?.stopPropagation?.();
            onToggleFavorite?.(item);
          }}
        >
          <MaterialCommunityIcons
            name={favorited ? "heart" : "heart-outline"}
            size={20}
            color={favorited ? "#ff3b5c" : theme.colors.textMuted}
          />
        </Pressable>
      ) : null}
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

function ScorePill({ score }) {
  const percent = Math.max(0, Math.min(100, Math.round((Number(score) || 0) * 100)));
  return (
    <View style={styles.scorePill}>
      <MaterialCommunityIcons name="creation" size={14} color={theme.colors.primaryDeep} />
      <Text style={styles.scorePillText}>{percent}% match</Text>
    </View>
  );
}

function MatchReasonChips({ reasons }) {
  const visibleReasons = Array.isArray(reasons) ? reasons.filter(Boolean).slice(0, 3) : [];
  if (!visibleReasons.length) return null;

  return (
    <View style={styles.reasonWrap}>
      {visibleReasons.map((reason) => (
        <View key={reason} style={styles.reasonChip}>
          <MaterialCommunityIcons name="check-decagram-outline" size={13} color="#0d6f63" />
          <Text style={styles.reasonChipText}>{reason}</Text>
        </View>
      ))}
    </View>
  );
}

export default function MarketplaceBuyerScreen({ navigation, user }) {
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [showMySellerPosts, setShowMySellerPosts] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [upcomingPickups, setUpcomingPickups] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [search, setSearch] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiResults, setAiResults] = useState([]);
  const [showAiResults, setShowAiResults] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiError, setAiError] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasMountedRef = useRef(false);
  const reminderPopupShownRef = useRef(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const [feedResult, mineResult, requestResult] = await Promise.allSettled([
        api.marketplacePosts({ sort }),
        api.myMarketplacePosts(),
        api.myMarketplaceRequests(),
      ]);
      const favoriteResult = await api.myMarketplaceFavorites().catch(() => ({ data: [] }));
      const cartResult = await api.myMarketplaceCart().catch(() => ({ data: { itemCount: 0 } }));
      const feedItems =
        feedResult.status === "fulfilled" && Array.isArray(feedResult.value?.data) ? feedResult.value.data : [];
      const mineItems =
        mineResult.status === "fulfilled" && Array.isArray(mineResult.value?.data) ? mineResult.value.data : [];
      const requestItems =
        requestResult.status === "fulfilled" && Array.isArray(requestResult.value?.data) ? requestResult.value.data : [];
      const favorites = Array.isArray(favoriteResult?.data) ? favoriteResult.data : [];
      const nextFavoriteIds = new Set(
        favorites
          .map((row) => String(row?.postId || row?.post?.id || ""))
          .filter(Boolean)
      );
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
      setUpcomingPickups(getUpcomingAcceptedPickups(requestItems));
      setFavoriteIds(nextFavoriteIds);
      setRequestCount(requestItems.length);
      setCartCount(Number(cartResult?.data?.itemCount || 0));
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
      setUpcomingPickups([]);
    } finally {
      setLoading(false);
    }
  }, [search, sort, user?.id]);

  async function handleToggleFavorite(post) {
    const postId = String(post?.id || "");
    if (!postId) return;
    const currentlyFavorite = favoriteIds.has(postId);
    const next = new Set(favoriteIds);
    if (currentlyFavorite) next.delete(postId);
    else next.add(postId);
    setFavoriteIds(next);

    try {
      const res = await api.toggleMarketplaceFavorite(postId);
      const favorited = Boolean(res?.data?.favorited);
      setFavoriteIds((prev) => {
        const updated = new Set(prev);
        if (favorited) updated.add(postId);
        else updated.delete(postId);
        return updated;
      });
    } catch (err) {
      setFavoriteIds((prev) => {
        const rollback = new Set(prev);
        if (currentlyFavorite) rollback.add(postId);
        else rollback.delete(postId);
        return rollback;
      });
      setError(err.message || "Could not update favorites");
    }
  }

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
  }, [loadPosts]);

  useEffect(() => {
    async function showPickupPopupOnce() {
      if (reminderPopupShownRef.current) return;
      if (!Array.isArray(upcomingPickups) || upcomingPickups.length === 0) return;

      try {
        const unseen = upcomingPickups[0];
        const title = unseen?.post?.title || "Marketplace item";
        const location = unseen?.pickupLocationName || "Pickup location";
        const when = unseen?.pickupDateTime
          ? new Date(unseen.pickupDateTime).toLocaleString()
          : "Scheduled soon";

        Alert.alert(
          "Pickup Reminder",
          `${title}\n${location}\n${when}\n\nYour pickup is within 24 hours.`,
          [
            {
              text: "View Request",
              onPress: () => navigation.navigate("MarketplaceBuyerRequests"),
            },
            { text: "OK" },
          ]
        );
        reminderPopupShownRef.current = true;
      } catch (_err) {
        // Non-blocking: reminder popup should never break the screen.
      }
    }

    showPickupPopupOnce();
  }, [upcomingPickups, navigation]);

  function openBuyerPost(post, isOwnPost = false) {
    const isSold = String(post?.status || "").toUpperCase() === "SOLD";
    if (isSold && !isOwnPost) {
      Alert.alert("Item already sold", "This item is already sold.");
      return;
    }
    navigation.navigate("MarketplaceBuyerDetail", { postId: post.id });
  }

  async function runAiSearch() {
    const description = String(aiDescription || "").trim();
    if (!description) {
      setAiError("Enter a detailed product description first.");
      return;
    }

    setAiSearching(true);
    setAiError("");
    setShowAiResults(true);
    try {
      const res = await api.marketplaceAiSearch({ description, limit: 8, status: "ACTIVE" });
      setAiResults(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setAiResults([]);
      setAiError(err.message || "AI marketplace search failed");
    } finally {
      setAiSearching(false);
    }
  }

  const favoritePosts = posts.filter((post) => favoriteIds.has(String(post.id)));
  const regularPosts = posts;
  const shouldShowRegularPosts = !showMySellerPosts && !showFavorites;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>

        {/* ── Title + email ── */}
        <View style={styles.heroTopRow}>
          <View style={styles.heroTopActions}>
            <Text style={styles.userEmail}>{user?.email || "Signed in user"}</Text>
            <Text style={styles.title}>Explore Listings</Text>
            <Text style={styles.subtitle}>Dive in and see what's posted today — find something you like, tap it, and make a deal!</Text>
          </View>
        </View>

        {/* ── Cart + Requests prominent stat cards ── */}
        <View style={styles.actionCardRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate("MarketplaceBuyerCart")}
          >
            <View style={styles.actionCardIconWrap}>
              <MaterialCommunityIcons name="cart-outline" size={20} color="#0f9f8f" />
            </View>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardLabel}>My Cart</Text>
              <Text style={styles.actionCardCount}>{cartCount}</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate("MarketplaceBuyerRequests")}
          >
            <View style={styles.actionCardIconWrap}>
              <MaterialCommunityIcons name="message-outline" size={20} color="#0f9f8f" />
            </View>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardLabel}>My Requests</Text>
              <Text style={styles.actionCardCount}>{requestCount}</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Search ── */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by item, description, or seller"
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadPosts}
        />
        <View style={styles.aiPanel}>
          <View style={styles.aiPanelHeader}>
            <View style={styles.aiIconWrap}>
              <MaterialCommunityIcons name="creation-outline" size={18} color="#0d6f63" />
            </View>
            <View style={styles.aiPanelCopy}>
              <Text style={styles.aiPanelTitle}>AI Product Suggestions</Text>
              <Text style={styles.aiPanelText}>
                Describe what you need in detail and AI will suggest listings that may be useful for you.
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.aiInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Example: I need a lightweight laptop for coding, note taking, and long battery life on a student budget."
            placeholderTextColor={theme.colors.textMuted}
            value={aiDescription}
            onChangeText={setAiDescription}
          />

          {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}

          <View style={styles.aiActionRow}>
            <Pressable style={[styles.aiSearchBtn, aiSearching && styles.aiSearchBtnDisabled]} onPress={runAiSearch} disabled={aiSearching}>
              {aiSearching ? <ActivityIndicator color="#ffffff" /> : <MaterialCommunityIcons name="brain" size={18} color="#ffffff" />}
              <Text style={styles.aiSearchBtnText}>{aiSearching ? "Finding Matches..." : "Find with AI"}</Text>
            </Pressable>
            {showAiResults ? (
              <Pressable
                style={styles.aiClearBtn}
                onPress={() => {
                  setShowAiResults(false);
                  setAiResults([]);
                  setAiError("");
                }}
              >
                <Text style={styles.aiClearBtnText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* ── Sort chips ── */}
        <View style={styles.filterWrap}>
          {SORT_OPTIONS.map((option) => {
            const selected = option.key === sort;
            return (
              <Pressable
                key={option.key}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                onPress={() => setSort(option.key)}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── View listings + toggles ── */}
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryBtn} onPress={loadPosts}>
            <Text style={styles.primaryBtnText}>
              {loading ? "Loading..." : `View Listings (${posts.length})`}
            </Text>
          </Pressable>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, showMySellerPosts && styles.toggleBtnActive]}
              onPress={() => {
                setShowMySellerPosts((prev) => !prev);
                setShowFavorites(false);
              }}
            >
              <Text style={[styles.toggleBtnText, showMySellerPosts && styles.toggleBtnTextActive]}>
                {showMySellerPosts ? "Hide My Posts" : `My Posts (${myPosts.length})`}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, showFavorites && styles.toggleBtnActive]}
              onPress={() => {
                setShowFavorites((prev) => !prev);
                setShowMySellerPosts(false);
              }}
            >
              <Text style={[styles.toggleBtnText, showFavorites && styles.toggleBtnTextActive]}>
                {showFavorites ? "Hide Favorites" : `Favorites (${favoritePosts.length})`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ── Pickup reminder banner ── */}
      {showAiResults ? (
        <View style={styles.aiResultsPanel}>
          <View style={styles.aiResultsHeader}>
            <View style={styles.aiResultsCopy}>
              <Text style={styles.sectionTitle}>AI Suggestions</Text>
              <Text style={styles.aiResultsText}>
                {aiSearching
                  ? "Looking for the most relevant products..."
                  : aiResults.length
                    ? "Suggestions ranked by semantic similarity."
                    : "No AI matches yet. Try a more detailed need or different wording."}
              </Text>
            </View>
            <View style={styles.aiResultsCount}>
              <Text style={styles.aiResultsCountText}>{aiResults.length} result(s)</Text>
            </View>
          </View>

          {aiResults.map((post) => (
            <View key={`ai-${post.id}`} style={styles.aiResultCard}>
              <View style={styles.aiResultMetaRow}>
                <ScorePill score={post.similarityScore} />
                <Pressable style={styles.aiOpenBtn} onPress={() => openBuyerPost(post, false)}>
                  <Text style={styles.aiOpenBtnText}>Open Listing</Text>
                </Pressable>
              </View>
              <MatchReasonChips reasons={post.matchReasons} />
              <BuyerBrowseCard
                item={post}
                isOwnPost={false}
                favorited={favoriteIds.has(String(post.id))}
                onToggleFavorite={handleToggleFavorite}
                onPress={() => openBuyerPost(post, false)}
              />
            </View>
          ))}
        </View>
      ) : null}

      {upcomingPickups.length > 0 ? (
        <View style={styles.reminderCard}>
          <View style={styles.reminderTopRow}>
            <Text style={styles.reminderTitle}>🚨 Upcoming Pickup</Text>
            <Pressable
              style={styles.reminderBtn}
              onPress={() => navigation.navigate("MarketplaceBuyerRequests")}
            >
              <Text style={styles.reminderBtnText}>View</Text>
            </Pressable>
          </View>
          {upcomingPickups.map((request) => (
            <Text key={request.id} style={styles.reminderLine}>
              {`${request?.post?.title || "Item"} · ${request?.pickupLocationName || "Location pending"} · ${formatMarketplaceTime(request?.pickupDateTime)}`}
            </Text>
          ))}
        </View>
      ) : null}

      {/* ── Section header ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Marketplace Items</Text>
        <Text style={styles.sectionMeta}>
          {loading ? "Loading..." : `${posts.length} item(s)`}
        </Text>
      </View>

      {/* ── My seller posts ── */}
      {showMySellerPosts && myPosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>You haven't created any seller posts yet.</Text>
        </View>
      ) : null}

      {showMySellerPosts && myPosts.length > 0 ? (
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
              favorited={false}
              onToggleFavorite={handleToggleFavorite}
              onPress={() => openBuyerPost(post, true)}
            />
          ))}
        </>
      ) : null}

      {/* ── Favorites ── */}
      {showFavorites && favoritePosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>Tap the heart icon on any listing to save it here.</Text>
        </View>
      ) : null}

      {showFavorites && favoritePosts.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Items</Text>
            <Text style={styles.sectionMeta}>{favoritePosts.length} item(s)</Text>
          </View>
          {favoritePosts.map((post) => (
            <BuyerBrowseCard
              key={`fav-${post.id}`}
              item={post}
              isOwnPost={false}
              favorited={favoriteIds.has(String(post.id))}
              onToggleFavorite={handleToggleFavorite}
              onPress={() => openBuyerPost(post, false)}
            />
          ))}
        </>
      ) : null}

      {/* ── All listings ── */}
      {!loading && shouldShowRegularPosts && regularPosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matching listings</Text>
          <Text style={styles.emptySubtitle}>
            Try a different search or check back after sellers add new posts.
          </Text>
        </View>
      ) : null}

      {shouldShowRegularPosts &&
        regularPosts.map((post) => (
          <BuyerBrowseCard
            key={post.id}
            item={post}
            isOwnPost={String(post.userId || "") === String(user?.id || "")}
            favorited={favoriteIds.has(String(post.id))}
            onToggleFavorite={handleToggleFavorite}
            onPress={() => openBuyerPost(post, false)}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ─── Page ────────────────────────────────────────────────
  page: {
    flex: 1,
    backgroundColor: "#eef4ff",
  },
  content: {
    padding: 12,
    paddingBottom: 32,
    gap: 12,
  },

  // ─── Hero ────────────────────────────────────────────────
  hero: {
    backgroundColor: "#0f9f8f",
    borderRadius: 24,
    padding: 16,
    gap: 12,
    ...theme.shadow.soft,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTopActions: {
    flex: 1,
    gap: 4,
  },
  userEmail: {
    color: "#ddfff8",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 30,
  },
  subtitle: {
    color: "#d5fff7",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },

  // ─── Cart + Requests action cards ────────────────────────
  actionCardRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e6fef8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionCardText: {
    flexShrink: 1,
    gap: 1,
  },
  actionCardLabel: {
    fontSize: 11,
    color: "#0d6f63",
    fontWeight: "700",
  },
  actionCardCount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0d6f63",
    lineHeight: 28,
  },

  // ─── Search ──────────────────────────────────────────────
  searchInput: {
    borderRadius: 10,
    backgroundColor: "#ffffff",
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  aiPanel: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    padding: 12,
    gap: 10,
  },
  aiPanelHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  aiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#d8fff9",
    alignItems: "center",
    justifyContent: "center",
  },
  aiPanelCopy: {
    flex: 1,
    gap: 2,
  },
  aiPanelTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 15,
  },
  aiPanelText: {
    color: "#d5fff7",
    lineHeight: 18,
    fontSize: 12,
  },
  aiInput: {
    minHeight: 96,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  aiActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  aiSearchBtn: {
    flex: 1,
    backgroundColor: "#0d6f63",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  aiSearchBtnDisabled: {
    opacity: 0.8,
  },
  aiSearchBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  aiClearBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  aiClearBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  aiError: {
    color: "#fff1f1",
    fontSize: 13,
    fontWeight: "700",
  },

  // ─── Sort chips ──────────────────────────────────────────
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
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

  // ─── Hero bottom actions ──────────────────────────────────
  heroActions: {
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#0d6f63",
    fontWeight: "900",
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  toggleBtnText: {
    color: "#e6fffb",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },
  toggleBtnTextActive: {
    color: "#0d6f63",
  },

  // ─── Reminder banner ─────────────────────────────────────
  reminderCard: {
    backgroundColor: "#fff7de",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f4d58f",
    padding: 12,
    gap: 6,
    ...theme.shadow.soft,
  },
  aiResultsPanel: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    ...theme.shadow.soft,
  },
  aiResultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  aiResultsCopy: {
    flex: 1,
  },
  aiResultsText: {
    color: theme.colors.textMuted,
    lineHeight: 18,
    fontSize: 12,
    marginTop: 2,
  },
  aiResultsCount: {
    backgroundColor: "#edf8f6",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#bfe8e1",
  },
  aiResultsCountText: {
    color: "#0d6f63",
    fontWeight: "900",
    fontSize: 12,
  },
  aiResultCard: {
    gap: 4,
  },
  aiResultMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  aiOpenBtn: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#0f9f8f",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiOpenBtnText: {
    color: "#0f9f8f",
    fontWeight: "800",
    fontSize: 12,
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8f6f3",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#bfe8e1",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scorePillText: {
    color: theme.colors.primaryDeep,
    fontWeight: "800",
    fontSize: 12,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f6fffc",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#c8eee6",
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  reasonChipText: {
    color: "#0d6f63",
    fontWeight: "700",
    fontSize: 11,
    flexShrink: 1,
  },
  reminderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  reminderTitle: {
    color: "#5f4700",
    fontWeight: "900",
    fontSize: 14,
    flex: 1,
  },
  reminderLine: {
    color: "#5f4700",
    lineHeight: 19,
    fontWeight: "700",
    fontSize: 13,
  },
  reminderBtn: {
    backgroundColor: "#f0c85c",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reminderBtnText: {
    color: "#2f2400",
    fontWeight: "900",
    fontSize: 12,
  },

  // ─── Section header ──────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  sectionMeta: {
    color: theme.colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },

  // ─── Listing card ─────────────────────────────────────────
  listingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  favoriteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 3,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.soft,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: 4,
  },
  cardHeaderMain: {
    flex: 1,
    gap: 3,
  },
  ownBadge: {
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ownBadgeText: {
    color: theme.colors.warningText,
    fontWeight: "900",
    fontSize: 11,
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  cardPrice: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
    fontSize: 14,
  },
  cardSeller: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 13,
  },
  cardDescription: {
    color: theme.colors.textMuted,
    lineHeight: 19,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },

  // ─── Empty state ─────────────────────────────────────────
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 19,
    fontSize: 13,
  },

  // ─── Error ───────────────────────────────────────────────
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    paddingHorizontal: 2,
  },
});

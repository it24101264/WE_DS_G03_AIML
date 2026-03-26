import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { MARKETPLACE_STATUS, SellerPostCard } from "./marketplaceShared";

export default function MarketplaceSellerHomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionPostId, setActionPostId] = useState("");

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
  const totalMessages = posts.reduce(
    (sum, post) => sum + (Array.isArray(post.messages) ? post.messages.length : Number(post.messageCount || 0)),
    0
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Seller</Text>
        <Text style={styles.title}>Your Listings</Text>
        <Text style={styles.subtitle}>Create posts, check messages, and mark items as sold.</Text>

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
            <Text style={styles.statValue}>{totalMessages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("MarketplaceSellerForm")}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryBtnText}>New Post</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={loadPosts}>
            <Text style={styles.secondaryBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Listings</Text>
        <Text style={styles.sectionMeta}>{posts.length} item(s)</Text>
      </View>

      {posts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No items yet</Text>
          <Text style={styles.emptySubtitle}>Add your first item to start selling.</Text>
        </View>
      ) : null}

      {posts.map((post) => (
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
});

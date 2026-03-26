import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, MARKETPLACE_STATUS, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

export default function MarketplaceSellerDetailScreen({ navigation, route }) {
  const postId = route?.params?.postId;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.marketplacePostById(postId);
      setPost(res.data || null);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load post details");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  async function markAsSold() {
    try {
      setActionLoading(true);
      const res = await api.updateMarketplacePostStatus(postId, { status: MARKETPLACE_STATUS.SOLD });
      setPost(res.data || post);
      setError("");
    } catch (err) {
      setError(err.message || "Could not mark this item as sold");
    } finally {
      setActionLoading(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete post", "This will permanently remove the listing.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoading(true);
            await api.deleteMarketplacePost(postId);
            navigation.navigate("MarketplaceSellerHome");
          } catch (err) {
            setError(err.message || "Could not delete this post");
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  if (loading && !post) {
    return (
      <View style={styles.page}>
        <Text style={styles.muted}>Loading post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.page}>
        <Text style={styles.error}>{error || "Post not found"}</Text>
      </View>
    );
  }

  const messages = Array.isArray(post.messages) ? post.messages : [];
  const isSold = String(post.status || "").toUpperCase() === MARKETPLACE_STATUS.SOLD;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.price}>{formatCurrency(post.price)}</Text>
        <View style={styles.heroMetaRow}>
          <SellerStatusBadge status={post.status} />
          <Text style={styles.heroMetaText}>Posted {formatMarketplaceTime(post.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <PhotoStrip photos={post.photos} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Seller details</Text>
        <Text style={styles.metaLine}>Name: {post.sellerName || post.userName || "Not provided"}</Text>
        <Text style={styles.metaLine}>Mobile: {post.contactNumber || "Not provided"}</Text>
        <Text style={styles.metaLine}>Status: {post.status || MARKETPLACE_STATUS.ACTIVE}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{post.description || "No description added."}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Seller actions</Text>
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("MarketplaceSellerForm", { postId })}>
            <Text style={styles.secondaryBtnText}>Edit Post</Text>
          </Pressable>
          {!isSold ? (
            <Pressable style={styles.infoBtn} onPress={markAsSold} disabled={actionLoading}>
              <Text style={styles.infoBtnText}>{actionLoading ? "Saving..." : "Mark as Sold"}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.dangerBtn} onPress={confirmDelete} disabled={actionLoading}>
            <Text style={styles.dangerBtnText}>{actionLoading ? "Deleting..." : "Delete"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.messagesHeader}>
          <Text style={styles.sectionTitle}>Buyer messages</Text>
          <View style={styles.messageCountPill}>
            <MaterialCommunityIcons name="message-text-outline" size={16} color={theme.colors.infoText} />
            <Text style={styles.messageCountText}>{messages.length}</Text>
          </View>
        </View>

        {messages.length === 0 ? (
          <Text style={styles.muted}>No messages received for this post yet.</Text>
        ) : (
          <View style={styles.messageList}>
            {messages.map((message, index) => (
              <View key={message.id || `${message.senderName || "msg"}-${index}`} style={styles.messageCard}>
                <View style={styles.messageTopRow}>
                  <View>
                    <Text style={styles.messageName}>{message.senderName || message.userName || "Buyer"}</Text>
                    <Text style={styles.messageMeta}>{message.senderContact || message.userEmail || message.phone || "No contact provided"}</Text>
                  </View>
                  <Text style={styles.messageMeta}>{formatMarketplaceTime(message.createdAt)}</Text>
                </View>
                <Text style={styles.body}>{message.text || message.message || "No message body"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: theme.colors.text,
  },
  price: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.primaryDeep,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  heroMetaText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  metaLine: {
    color: theme.colors.textMuted,
    lineHeight: 21,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  infoBtn: {
    backgroundColor: theme.colors.infoBg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  infoBtnText: {
    color: theme.colors.infoText,
    fontWeight: "800",
  },
  dangerBtn: {
    backgroundColor: "#ffe2df",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dangerBtnText: {
    color: theme.colors.danger,
    fontWeight: "800",
  },
  messagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.infoBg,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  messageCountText: {
    color: theme.colors.infoText,
    fontWeight: "800",
  },
  messageList: {
    gap: 10,
  },
  messageCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: theme.colors.surfaceAlt,
    gap: 8,
  },
  messageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  messageName: {
    color: theme.colors.text,
    fontWeight: "900",
  },
  messageMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  muted: {
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

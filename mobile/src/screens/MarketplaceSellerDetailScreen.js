import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, MARKETPLACE_STATUS, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

function RequestDecisionBadge({ status }) {
  const safeStatus = String(status || "PENDING").toUpperCase();
  const palette =
    safeStatus === "ACCEPTED"
      ? { bg: theme.colors.successBg, text: theme.colors.successText }
      : safeStatus === "DECLINED"
        ? { bg: "#ffe2df", text: theme.colors.danger }
        : { bg: theme.colors.warningBg, text: theme.colors.warningText };

  return (
    <View style={[styles.decisionBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.decisionBadgeText, { color: palette.text }]}>{safeStatus}</Text>
    </View>
  );
}

export default function MarketplaceSellerDetailScreen({ navigation, route }) {
  const postId = route?.params?.postId;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionId, setDecisionId] = useState("");
  const [confirmingCodId, setConfirmingCodId] = useState("");
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

  async function handleDecision(requestId, status) {
    try {
      setDecisionId(requestId);
      await api.decideMarketplaceRequest(requestId, { status });
      await loadPost();
    } catch (err) {
      setError(err.message || `Could not ${status === "ACCEPTED" ? "accept" : "decline"} this request`);
    } finally {
      setDecisionId("");
    }
  }

  function handleConfirmCod(request) {
    Alert.alert(
      "Confirm Cash Collected",
      `Mark this request as paid in cash?\n\nBuyer: ${request?.buyerName || "Buyer"}\nOffer: ${formatCurrency(request?.negotiatedPrice)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setConfirmingCodId(request.id);
              await api.confirmMarketplaceCodCollected(request.id);
              await loadPost();
            } catch (err) {
              setError(err.message || "Could not confirm COD payment");
            } finally {
              setConfirmingCodId("");
            }
          },
        },
      ]
    );
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

  const requests = Array.isArray(post.requests) ? post.requests : [];
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
          <Text style={styles.sectionTitle}>Buyer requests</Text>
          <View style={styles.messageCountPill}>
            <MaterialCommunityIcons name="message-text-outline" size={16} color={theme.colors.infoText} />
            <Text style={styles.messageCountText}>{requests.length}</Text>
          </View>
        </View>

        {requests.length === 0 ? (
          <Text style={styles.muted}>No buyer requests received for this post yet.</Text>
        ) : (
          <View style={styles.messageList}>
            {requests.map((request, index) => (
              <View key={request.id || `${request.buyerName || "request"}-${index}`} style={styles.messageCard}>
                <View style={styles.messageTopRow}>
                  <View>
                    <Text style={styles.messageName}>{request.buyerName || "Buyer"}</Text>
                    <Text style={styles.messageMeta}>{request.buyerContact || request.buyerEmail || "Contact hidden until accepted"}</Text>
                  </View>
                  <View style={styles.requestRightCol}>
                    <RequestDecisionBadge status={request.status} />
                    <Text style={styles.messageMeta}>{formatMarketplaceTime(request.updatedAt || request.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.offerText}>Offer: {formatCurrency(request.negotiatedPrice)}</Text>
                <Text style={styles.messageMeta}>Payment: {request?.paymentMethod || "-"} / {request?.paymentStatus || "unpaid"}</Text>
                <Text style={styles.body}>{request.message || "No message body"}</Text>

                <View style={styles.requestActionRow}>
                  <Pressable
                    style={[
                      styles.acceptBtn,
                      (decisionId === request.id || String(request?.status || "PENDING").toUpperCase() !== "PENDING") && styles.btnDisabled,
                    ]}
                    onPress={() => handleDecision(request.id, "ACCEPTED")}
                    disabled={decisionId === request.id || String(request?.status || "PENDING").toUpperCase() !== "PENDING"}
                  >
                    <Text style={styles.acceptBtnText}>{decisionId === request.id ? "Saving..." : "Accept"}</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.declineBtn,
                      (decisionId === request.id || String(request?.status || "PENDING").toUpperCase() !== "PENDING") && styles.btnDisabled,
                    ]}
                    onPress={() => handleDecision(request.id, "DECLINED")}
                    disabled={decisionId === request.id || String(request?.status || "PENDING").toUpperCase() !== "PENDING"}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </Pressable>
                  {String(request?.status || "").toUpperCase() === "ACCEPTED"
                  && String(request?.paymentMethod || "") === "cod"
                  && String(request?.paymentStatus || "") === "cod_pending" ? (
                    <Pressable
                      style={[styles.codBtn, confirmingCodId === request.id && styles.btnDisabled]}
                      onPress={() => handleConfirmCod(request)}
                      disabled={confirmingCodId === request.id}
                    >
                      <Text style={styles.codBtnText}>{confirmingCodId === request.id ? "Saving..." : "Confirm COD"}</Text>
                    </Pressable>
                  ) : null}
                </View>
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
  offerText: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
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
  requestRightCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  messageName: {
    color: theme.colors.text,
    fontWeight: "900",
  },
  messageMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  decisionBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  decisionBadgeText: {
    fontWeight: "900",
    fontSize: 12,
  },
  muted: {
    color: theme.colors.textMuted,
  },
  requestActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  acceptBtn: {
    backgroundColor: theme.colors.successBg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  acceptBtnText: {
    color: theme.colors.successText,
    fontWeight: "800",
  },
  declineBtn: {
    backgroundColor: "#ffe2df",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  declineBtnText: {
    color: theme.colors.danger,
    fontWeight: "800",
  },
  codBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  codBtnText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

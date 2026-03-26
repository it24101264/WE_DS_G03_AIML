import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

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

function SellerRequestCard({ item, onOpenPost, onAccept, onDecline, deciding }) {
  const finalized = String(item?.status || "PENDING").toUpperCase() !== "PENDING";

  return (
    <View style={styles.requestCard}>
      <PhotoStrip photos={item?.post?.photos} compact />
      <View style={styles.requestTopRow}>
        <View style={styles.requestTopMain}>
          <Text style={styles.requestTitle}>{item?.post?.title || "Post unavailable"}</Text>
          <Text style={styles.offerText}>Offer: {formatCurrency(item?.negotiatedPrice)}</Text>
        </View>
        <View style={styles.badgeStack}>
          <RequestDecisionBadge status={item?.status} />
          <SellerStatusBadge status={item?.post?.status} />
        </View>
      </View>

      <Text style={styles.metaLine}>Buyer: {item?.buyerName || "Buyer"}</Text>
      <Text style={styles.metaLine}>
        Buyer mobile: {item?.buyerContact || "Hidden until you accept this offer"}
      </Text>
      <Text style={styles.metaLine}>
        Buyer email: {item?.buyerEmail || "Hidden until you accept this offer"}
      </Text>
      <Text style={styles.metaLine}>Updated: {formatMarketplaceTime(item?.updatedAt || item?.createdAt)}</Text>
      {String(item?.status || "PENDING").toUpperCase() === "ACCEPTED" ? <Text style={styles.acceptedText}>Offer accepted. Both phone numbers are now shared with buyer and seller.</Text> : null}
      {String(item?.status || "PENDING").toUpperCase() === "PENDING" ? <Text style={styles.pendingText}>Buyer phone number stays hidden until you accept this offer.</Text> : null}
      <Text style={styles.messageText}>{item?.message || "No message added."}</Text>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryBtn} onPress={onOpenPost}>
          <Text style={styles.secondaryBtnText}>Open Post</Text>
        </Pressable>
        <Pressable style={[styles.acceptBtn, (deciding || finalized) && styles.btnDisabled]} onPress={onAccept} disabled={deciding || finalized}>
          <Text style={styles.acceptBtnText}>{deciding && !finalized ? "Saving..." : "Accept"}</Text>
        </Pressable>
        <Pressable style={[styles.declineBtn, (deciding || finalized) && styles.btnDisabled]} onPress={onDecline} disabled={deciding || finalized}>
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MarketplaceSellerRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decisionId, setDecisionId] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const postsRes = await api.myMarketplacePosts();
      const posts = Array.isArray(postsRes.data) ? postsRes.data : [];
      const postsWithRequests = posts.filter((post) => Number(post.requestCount || 0) > 0);

      if (postsWithRequests.length === 0) {
        setRequests([]);
        setError("");
        return;
      }

      const detailResults = await Promise.all(
        postsWithRequests.map((post) =>
          api.marketplacePostById(post.id).catch(() => ({ data: null }))
        )
      );

      const flattened = detailResults.flatMap((result) => {
        const post = result?.data;
        const postRequests = Array.isArray(post?.requests) ? post.requests : [];

        return postRequests.map((request) => ({
          ...request,
          post: {
            id: post.id,
            title: post.title,
            status: post.status,
            photos: post.photos,
          },
        }));
      });

      flattened.sort(
        (left, right) =>
          new Date(right?.updatedAt || right?.createdAt || 0).getTime()
          - new Date(left?.updatedAt || left?.createdAt || 0).getTime()
      );

      setRequests(flattened);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load seller requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  async function handleDecision(requestId, status) {
    try {
      setDecisionId(requestId);
      await api.decideMarketplaceRequest(requestId, { status });
      await loadRequests();
    } catch (err) {
      setError(err.message || `Could not ${status === "ACCEPTED" ? "accept" : "decline"} this request`);
    } finally {
      setDecisionId("");
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#ffffff" />
          </View>
          <Pressable style={styles.heroBtn} onPress={loadRequests}>
            <Text style={styles.heroBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>Seller</Text>
        <Text style={styles.title}>Buyer Requests</Text>
        <Text style={styles.subtitle}>Review all requests to your listings in one place and open the related post when you need more detail.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Requests</Text>
        <Text style={styles.sectionMeta}>{loading ? "Loading..." : `${requests.length} request(s)`}</Text>
      </View>

      {!loading && requests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptySubtitle}>Buyer requests will appear here as soon as someone negotiates on one of your listings.</Text>
        </View>
      ) : null}

      {requests.map((request) => (
        <SellerRequestCard
          key={request.id}
          item={request}
          deciding={decisionId === request.id}
          onOpenPost={() => navigation.navigate("MarketplaceSellerDetail", { postId: request.postId })}
          onAccept={() => handleDecision(request.id, "ACCEPTED")}
          onDecline={() => handleDecision(request.id, "DECLINED")}
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
  requestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  requestTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: 6,
  },
  requestTopMain: {
    flex: 1,
    gap: 4,
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
  requestTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  offerText: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
  },
  metaLine: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 21,
  },
  acceptedText: {
    color: theme.colors.successText,
    fontWeight: "900",
  },
  pendingText: {
    color: theme.colors.warningText,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
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
  btnDisabled: {
    opacity: 0.7,
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

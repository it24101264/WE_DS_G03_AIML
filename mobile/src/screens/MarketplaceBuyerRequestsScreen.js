import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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

function RequestCard({ item, onOpen, onDelete, deleting }) {
  const finalized = String(item?.status || "PENDING").toUpperCase() !== "PENDING";

  return (
    <View style={styles.requestCard}>
      <PhotoStrip photos={item?.post?.photos} compact />
      <View style={styles.requestTopRow}>
        <View style={styles.requestTopMain}>
          <Text style={styles.requestTitle}>{item?.post?.title || "Item unavailable"}</Text>
          <Text style={styles.requestPrice}>Your offer: {formatCurrency(item?.negotiatedPrice)}</Text>
        </View>
        <View style={styles.badgeStack}>
          <RequestDecisionBadge status={item?.status} />
          <SellerStatusBadge status={item?.post?.status || MARKETPLACE_STATUS.ACTIVE} />
        </View>
      </View>

      <Text style={styles.metaLine}>Seller: {item?.sellerName || item?.post?.sellerName || "Unknown seller"}</Text>
      <Text style={styles.metaLine}>
        Seller mobile: {item?.sellerContact || item?.post?.contactNumber || "Hidden until the seller accepts your offer"}
      </Text>
      <Text style={styles.metaLine}>Updated: {formatMarketplaceTime(item?.updatedAt || item?.createdAt)}</Text>
      {String(item?.status || "PENDING").toUpperCase() === "ACCEPTED" ? <Text style={styles.acceptedText}>Your offer was accepted by the seller. You can now see both contact numbers.</Text> : null}
      {String(item?.status || "PENDING").toUpperCase() === "DECLINED" ? <Text style={styles.declinedText}>This offer was declined by the seller.</Text> : null}
      {String(item?.status || "PENDING").toUpperCase() === "PENDING" ? <Text style={styles.pendingText}>Phone numbers will be shared only after the seller accepts your offer.</Text> : null}
      <Text style={styles.messageText}>{item?.message || "No message added."}</Text>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryBtn} onPress={onOpen}>
          <Text style={styles.secondaryBtnText}>Open Listing</Text>
        </Pressable>
        <Pressable style={[styles.dangerBtn, (deleting || finalized) && styles.btnDisabled]} onPress={onDelete} disabled={deleting || finalized}>
          <Text style={styles.dangerBtnText}>{deleting ? "Deleting..." : "Delete Request"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MarketplaceBuyerRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.myMarketplaceRequests();
      setRequests(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load your requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  function confirmDelete(requestId) {
    Alert.alert("Delete request", "This will remove the selected buying request.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(requestId);
            await api.deleteMarketplaceRequest(requestId);
            await loadRequests();
          } catch (err) {
            setError(err.message || "Could not delete this request");
          } finally {
            setDeletingId("");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={26} color="#ffffff" />
          </View>
          <Pressable style={styles.heroBtn} onPress={loadRequests}>
            <Text style={styles.heroBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>Buyer</Text>
        <Text style={styles.title}>My Requests</Text>
        <Text style={styles.subtitle}>Review what you have requested, reopen a listing to renegotiate, or delete a request you no longer want.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {requests.length === 0 && !loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptySubtitle}>Browse seller posts and send your first buying request.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("MarketplaceBuyerHome")}>
            <Text style={styles.primaryBtnText}>Browse Listings</Text>
          </Pressable>
        </View>
      ) : null}

      {requests.map((request) => (
        <RequestCard
          key={request.id}
          item={request}
          deleting={deletingId === request.id}
          onOpen={() => navigation.navigate("MarketplaceBuyerDetail", { postId: request.postId })}
          onDelete={() => confirmDelete(request.id)}
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
    backgroundColor: "#113995",
    borderRadius: 28,
    padding: 18,
    gap: 12,
    ...theme.shadow.soft,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroBtn: {
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  eyebrow: {
    color: "#cedaff",
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
    color: "#d9e3ff",
    lineHeight: 21,
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
    gap: 10,
    alignItems: "flex-start",
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
  requestPrice: {
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
  declinedText: {
    color: theme.colors.danger,
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
    marginTop: 4,
  },
  secondaryBtn: {
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
  btnDisabled: {
    opacity: 0.7,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

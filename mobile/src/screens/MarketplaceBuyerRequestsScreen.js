import React, { useCallback, useEffect, useRef, useState } from "react";
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

function PaymentStatusBadge({ paymentStatus }) {
  if (!paymentStatus || paymentStatus === "unpaid") return null;

  const config = {
    paid: { label: "✅ Paid", bg: theme.colors.successBg, text: theme.colors.successText },
    cod_pending: { label: "💵 Cash on Pickup", bg: theme.colors.warningBg, text: theme.colors.warningText },
    failed: { label: "❌ Payment Failed", bg: "#ffe2df", text: theme.colors.danger },
  }[paymentStatus];

  if (!config) return null;

  return (
    <View style={[styles.paymentBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.paymentBadgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function canPay(item) {
  const status = String(item?.status || "PENDING").toUpperCase();
  const paymentStatus = item?.paymentStatus || "unpaid";
  const pickupDateTime = item?.pickupDateTime;

  if (status !== "ACCEPTED") return false;

  const alreadyPaid = paymentStatus === "paid" || paymentStatus === "cod_pending";
  if (alreadyPaid) return false;

  if (!pickupDateTime) return true;

  try {
    const pickupTime = new Date(pickupDateTime).getTime();
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    return now <= pickupTime + TWO_HOURS_MS;
  } catch (e) {
    return true;
  }
}

function isPaymentTimeExpired(item) {
  const status = String(item?.status || "PENDING").toUpperCase();
  const paymentStatus = item?.paymentStatus || "unpaid";
  const pickupDateTime = item?.pickupDateTime;

  if (status !== "ACCEPTED") return false;
  if (paymentStatus === "paid" || paymentStatus === "cod_pending") return false;
  if (!pickupDateTime) return false;

  try {
    const pickupTime = new Date(pickupDateTime).getTime();
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    return now > pickupTime + TWO_HOURS_MS;
  } catch (e) {
    return false;
  }
}

function RequestCard({ item, onOpen, onDelete, onPay, onReoffer, deleting }) {
  const isBought = String(item?.paymentStatus || "") === "paid";
  const finalized = String(item?.status || "PENDING").toUpperCase() !== "PENDING";
  const showPayNow = canPay(item);
  const showReoffer = String(item?.status || "PENDING").toUpperCase() === "DECLINED";

  return (
    <View style={styles.requestCard}>
      <PhotoStrip photos={item?.post?.photos} compact />
      <View style={styles.requestTopRow}>
        <View style={styles.requestTopMain}>
          <Text style={styles.requestTitle}>{item?.post?.title || "Item unavailable"}</Text>
          <Text style={styles.requestPrice}>Your offer: {formatCurrency(item?.negotiatedPrice)}</Text>
        </View>
        <View style={styles.badgeStack}>
          {isBought ? (
            <View style={styles.boughtBadge}>
              <Text style={styles.boughtBadgeText}>YOU BOUGHT THIS</Text>
            </View>
          ) : (
            <>
              <RequestDecisionBadge status={item?.status} />
              <SellerStatusBadge status={item?.post?.status || MARKETPLACE_STATUS.ACTIVE} />
              <PaymentStatusBadge paymentStatus={item?.paymentStatus} />
            </>
          )}
        </View>
      </View>

      <Text style={styles.metaLine}>Seller: {item?.sellerName || item?.post?.sellerName || "Unknown seller"}</Text>
      <Text style={styles.metaLine}>
        Seller mobile: {item?.sellerContact || item?.post?.contactNumber || "Hidden until the seller accepts your offer"}
      </Text>
      <Text style={styles.metaLine}>Updated: {formatMarketplaceTime(item?.updatedAt || item?.createdAt)}</Text>

      {isBought ? (
        <Text style={styles.boughtText}>You bought this item.</Text>
      ) : String(item?.status || "PENDING").toUpperCase() === "ACCEPTED" ? (
        isPaymentTimeExpired(item) ? (
          <Text style={[styles.acceptedText, { color: theme.colors.danger }]}>
            ⏰ Payment time has expired. The deal is no longer available.
          </Text>
        ) : (
          <Text style={styles.acceptedText}>Your offer was accepted by the seller. You can now see both contact numbers.</Text>
        )
      ) : null}
      {String(item?.status || "PENDING").toUpperCase() === "DECLINED" ? (
        <Text style={styles.declinedText}>This offer was declined by the seller.</Text>
      ) : null}
      {String(item?.status || "PENDING").toUpperCase() === "PENDING" ? (
        <Text style={styles.pendingText}>Phone numbers will be shared only after the seller accepts your offer.</Text>
      ) : null}

      <Text style={styles.messageText}>{item?.message || "No message added."}</Text>

      {item?.pickupLocationName || item?.pickupDate || item?.pickupTimeSlot ? (
        <View style={styles.pickupContainer}>
          {item?.pickupDate || item?.pickupTimeSlot ? (
            <View style={[styles.pickupInnerRow, { gap: 28 }]}>
              {item?.pickupDate ? (
                <View style={styles.pickupItemContent}>
                  <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.pickupText}>{item.pickupDate}</Text>
                </View>
              ) : null}
              {item?.pickupTimeSlot ? (
                <View style={styles.pickupItemContent}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.pickupText}>{item.pickupTimeSlot}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {item?.pickupLocationName ? (
            <View style={styles.pickupInnerRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.pickupText}>{item.pickupLocationName}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryBtn} onPress={onOpen}>
          <Text style={styles.secondaryBtnText}>Open Listing</Text>
        </Pressable>

        {showPayNow ? (
          <Pressable style={styles.payNowBtn} onPress={onPay}>
            <MaterialCommunityIcons name="credit-card-outline" size={15} color="#ffffff" />
            <Text style={styles.payNowBtnText}>Pay Now</Text>
          </Pressable>
        ) : null}

        {showReoffer ? (
          <Pressable style={styles.reofferBtn} onPress={onReoffer}>
            <MaterialCommunityIcons name="refresh" size={15} color="#ffffff" />
            <Text style={styles.reofferBtnText}>Reoffer</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.dangerBtn, (deleting || finalized) && styles.btnDisabled]}
          onPress={onDelete}
          disabled={deleting || finalized}
        >
          <Text style={styles.dangerBtnText}>{deleting ? "Deleting..." : "Delete Request"}</Text>
        </Pressable>
      </View>

      {showPayNow ? (
        <Text style={styles.payNudge}>
          💡 Seller accepted your offer — complete your payment before pickup.
        </Text>
      ) : null}
    </View>
  );
}

export default function MarketplaceBuyerRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadRequests = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const res = await api.myMarketplaceRequests();
      if (isMountedRef.current) {
        setRequests(Array.isArray(res.data) ? res.data : []);
        setError("");
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || "Could not load your requests");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();

      pollIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) loadRequests();
      }, 5000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }, [loadRequests])
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

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

  function handlePay(request) {
    navigation.navigate("Payment", {
      request,
      post: request?.post || { title: "Marketplace Item" },
    });
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTopActions}>
            <Text style={styles.eyebrow}>Buyer</Text>
            <Text style={styles.title}>My Requests</Text>
            <Text style={styles.subtitle}>Review what you have requested, reopen a listing to renegotiate, or delete a request you no longer want.</Text>
          </View>
        </View>

        <View style={styles.actionCardRow}>
          <View style={styles.actionCard}>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardLabel}>Total requests</Text>
              <Text style={styles.actionCardCount}>{requests.length}</Text>
            </View>
          </View>
          <View style={styles.actionCard}>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardLabel}>Accepted</Text>
              <Text style={styles.actionCardCount}>
                {requests.filter((r) => String(r?.status || "").toUpperCase() === "ACCEPTED").length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.heroPrimaryBtn} onPress={loadRequests}>
            <Text style={styles.heroPrimaryBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
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
          onReoffer={() => navigation.navigate("MarketplaceBuyerDetail", { postId: request.postId, reoffer: true })}
          onDelete={() => confirmDelete(request.id)}
          onPay={() => handlePay(request)}
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
    padding: 12,
    paddingBottom: 32,
    gap: 12,
  },

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
  eyebrow: {
    color: "#ddfff8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "900",
    fontSize: 12,
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

  heroActions: {
    gap: 8,
  },
  heroPrimaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  heroPrimaryBtnText: {
    color: "#0d6f63",
    fontWeight: "900",
    fontSize: 15,
  },

  requestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
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
  paymentBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  paymentBadgeText: {
    fontWeight: "900",
    fontSize: 11,
  },
  boughtBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.successBg,
  },
  boughtBadgeText: {
    fontWeight: "900",
    fontSize: 12,
    color: theme.colors.successText,
  },
  requestTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  requestPrice: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
  },
  metaLine: {
    color: theme.colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 21,
  },
  acceptedText: {
    color: theme.colors.successText,
    fontWeight: "900",
  },
  boughtText: {
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
  pickupContainer: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  pickupInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pickupItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pickupText: {
    color: theme.colors.textMuted,
    fontSize: 13,
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
  payNowBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  payNowBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  reofferBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reofferBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  payNudge: {
    color: theme.colors.warningText,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
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
    paddingHorizontal: 2,
  },
});
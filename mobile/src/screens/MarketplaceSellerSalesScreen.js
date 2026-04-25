import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

function SalesStatusPill({ label, count, active }) {
  return (
    <View style={[styles.pill, active ? styles.pillActive : null]}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
      <Text style={[styles.pillCount, active ? styles.pillTextActive : null]}>{count}</Text>
    </View>
  );
}

function SaleCard({ item, onOpenPost, onConfirmCod, confirmingCod }) {
  const showConfirmCod =
    String(item?.status || "").toUpperCase() === "ACCEPTED"
    && String(item?.paymentMethod || "") === "cod"
    && String(item?.paymentStatus || "") === "cod_pending";

  return (
    <View style={styles.saleCard}>
      <PhotoStrip photos={item?.post?.photos} compact />
      <View style={styles.saleTopRow}>
        <View style={styles.saleMain}>
          <Text style={styles.saleTitle}>{item?.post?.title || "Post unavailable"}</Text>
          <Text style={styles.saleAmount}>Offer: {formatCurrency(item?.negotiatedPrice)}</Text>
        </View>
        <View style={styles.badgeStack}>
          <SellerStatusBadge status={item?.post?.status} />
        </View>
      </View>

      <Text style={styles.metaLine}>Buyer: {item?.buyerName || "Buyer"}</Text>
      <Text style={styles.metaLine}>Buyer mobile: {item?.buyerContact || "Hidden until accepted"}</Text>
      <Text style={styles.metaLine}>Payment: {item?.paymentMethod || "-"} / {item?.paymentStatus || "unpaid"}</Text>
      <Text style={styles.metaLine}>Updated: {formatMarketplaceTime(item?.updatedAt || item?.createdAt)}</Text>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryBtn} onPress={onOpenPost}>
          <Text style={styles.secondaryBtnText}>Open Post</Text>
        </Pressable>
        {showConfirmCod ? (
          <Pressable style={[styles.codBtn, confirmingCod && styles.btnDisabled]} onPress={onConfirmCod} disabled={confirmingCod}>
            <Text style={styles.codBtnText}>{confirmingCod ? "Saving..." : "Confirm COD Collected"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function MarketplaceSellerSalesScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmingCodId, setConfirmingCodId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.sellerMarketplaceRequests({ status: "ACCEPTED" });
      setRequests(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load sales");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const grouped = useMemo(() => {
    const pendingPayment = [];
    const paid = [];
    const other = [];

    for (const item of requests) {
      const payment = String(item?.paymentStatus || "unpaid").toLowerCase();
      if (payment === "paid") paid.push(item);
      else if (payment === "unpaid" || payment === "pending" || payment === "cod_pending") pendingPayment.push(item);
      else other.push(item);
    }

    return { pendingPayment, paid, other };
  }, [requests]);

  const totalValue = useMemo(
    () => requests.reduce((sum, r) => sum + Number(r?.negotiatedPrice || 0), 0),
    [requests]
  );

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
              await load();
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

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="cash-multiple" size={28} color="#ffffff" />
          </View>
          <Pressable style={styles.heroBtn} onPress={load}>
            <Text style={styles.heroBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>Seller</Text>
        <Text style={styles.title}>Sales Pipeline</Text>
        <Text style={styles.subtitle}>Track accepted deals, payment status, and quickly open the related post.</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{requests.length}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(totalValue)}</Text>
            <Text style={styles.statLabel}>Total offers</Text>
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Accepted deals</Text>
        <Text style={styles.sectionMeta}>{loading ? "Loading..." : `${requests.length} item(s)`}</Text>
      </View>

      <View style={styles.pillRow}>
        <SalesStatusPill label="Awaiting payment" count={grouped.pendingPayment.length} active />
        <SalesStatusPill label="Paid" count={grouped.paid.length} />
        {grouped.other.length ? <SalesStatusPill label="Other" count={grouped.other.length} /> : null}
      </View>

      {requests.length === 0 && !loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No accepted deals yet</Text>
          <Text style={styles.emptySubtitle}>When you accept an offer, it will show up here with its payment status.</Text>
        </View>
      ) : null}

      {grouped.pendingPayment.map((request) => (
        <SaleCard
          key={request.id}
          item={request}
          confirmingCod={confirmingCodId === request.id}
          onOpenPost={() => navigation.navigate("MarketplaceSellerDetail", { postId: request.postId })}
          onConfirmCod={() => handleConfirmCod(request)}
        />
      ))}

      {grouped.paid.length ? (
        <View style={styles.subHeader}>
          <Text style={styles.subHeaderText}>Paid</Text>
        </View>
      ) : null}

      {grouped.paid.map((request) => (
        <SaleCard
          key={request.id}
          item={request}
          confirmingCod={false}
          onOpenPost={() => navigation.navigate("MarketplaceSellerDetail", { postId: request.postId })}
          onConfirmCod={() => {}}
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
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    minWidth: "46%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 12,
    gap: 3,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    color: "#dce6ff",
    fontWeight: "700",
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
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.infoBg,
    borderColor: theme.colors.infoBg,
  },
  pillText: {
    color: theme.colors.text,
    fontWeight: "900",
  },
  pillTextActive: {
    color: theme.colors.infoText,
  },
  pillCount: {
    color: theme.colors.textMuted,
    fontWeight: "900",
  },
  saleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  saleTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  saleMain: {
    flex: 1,
    gap: 4,
  },
  saleTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  saleAmount: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: 6,
  },
  metaLine: {
    color: theme.colors.textMuted,
    lineHeight: 20,
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
  subHeader: {
    marginTop: 4,
  },
  subHeaderText: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});


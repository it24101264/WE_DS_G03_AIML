// mobile/src/screens/PaymentSuccessScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Shown after a successful payment (both PayHere and COD).
//
// Navigate here with:
//   navigation.replace("PaymentSuccess", { method, request, post })
//
// method = "payhere" | "cod"
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ScrollView,
} from "react-native";
import { theme } from "../ui/theme";

export default function PaymentSuccessScreen({ route, navigation }) {
  const { method, request, post } = route.params;

  const isCOD = method === "cod";
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ── Entrance animation ─────────────────────────────────────────────────────
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formattedAmount = parseFloat(request?.negotiatedPrice || 0).toFixed(2);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated success icon */}
        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.icon}>{isCOD ? "✔️" : "✅"}</Text>
        </Animated.View>

        {/* Title + subtitle */}
        <Animated.View style={{ opacity: opacityAnim }}>
          <Text style={styles.title}>
            {isCOD ? "Order Confirmed!" : "Payment Successful!"}
          </Text>
          <Text style={styles.subtitle}>
            {isCOD
              ? "Your Cash on Delivery order has been placed. Bring the exact amount at pickup."
              : "Your payment was processed successfully via PayHere."}
          </Text>
        </Animated.View>

        {/* Details card */}
        <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
          <Text style={styles.cardTitle}>Order Details</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Item</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {post?.title || "Marketplace Item"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Amount</Text>
            <Text style={[styles.rowValue, styles.amountText]}>
              LKR {formattedAmount}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Payment</Text>
            <View style={[styles.badge, isCOD ? styles.badgeCOD : styles.badgePaid]}>
              <Text style={[styles.badgeText, isCOD ? styles.badgeCODText : styles.badgePaidText]}>
                {isCOD ? "Cash on Delivery" : "Paid via Card"}
              </Text>
            </View>
          </View>

          {request?.pickupLocationName ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Pickup</Text>
              <Text style={styles.rowValue}>{request.pickupLocationName}</Text>
            </View>
          ) : null}

          {request?.pickupDate ? (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.rowLabel}>Date</Text>
              <Text style={styles.rowValue}>{request.pickupDate}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* COD reminder box */}
        {isCOD && (
          <Animated.View style={[styles.reminderBox, { opacity: opacityAnim }]}>
            <Text style={styles.reminderTitle}>📌 Reminder</Text>
            <Text style={styles.reminderText}>
              Please bring LKR {formattedAmount} in cash when you collect your item. The seller will hand over the item upon receiving payment.
            </Text>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View style={[styles.actions, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("MarketplaceBuyerRequests")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>View My Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("MarketplaceBuyerHome")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Back to Marketplace</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: theme.spacing.lg,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: "center",
  },

  // Icon
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
    ...theme.shadow.soft,
  },
  icon: { fontSize: 48 },

  // Title
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    width: "100%",
    marginBottom: theme.spacing.md,
    ...theme.shadow.soft,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    maxWidth: "55%",
    textAlign: "right",
  },
  amountText: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.primary,
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  badgePaid: { backgroundColor: theme.colors.successBg },
  badgeCOD: { backgroundColor: theme.colors.warningBg },
  badgeText: { fontSize: 12, fontWeight: "600" },
  badgePaidText: { color: theme.colors.successText },
  badgeCODText: { color: theme.colors.warningText },

  // COD reminder
  reminderBox: {
    width: "100%",
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.warningText,
    marginBottom: 6,
  },
  reminderText: {
    fontSize: 13,
    color: theme.colors.warningText,
    lineHeight: 20,
  },

  // Actions
  actions: {
    width: "100%",
    gap: 12,
    marginTop: theme.spacing.sm,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 17,
    alignItems: "center",
    ...theme.shadow.soft,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
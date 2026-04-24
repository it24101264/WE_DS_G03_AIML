import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

function CartItemCard({ item, removing, checkingOut, onOpen, onRemove, onCheckout }) {
  const sold = String(item?.status || "").toUpperCase() === "SOLD";

  return (
    <View style={styles.itemCard}>
      <PhotoStrip photos={item?.photos} compact />
      <View style={styles.itemTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item?.title || "Marketplace item"}</Text>
          <Text style={styles.itemMeta}>Seller: {item?.sellerName || "Unknown seller"}</Text>
          <Text style={styles.itemMeta}>Listing: {formatCurrency(item?.price)}</Text>
          <Text style={styles.offerPrice}>Your offer: {formatCurrency(item?.negotiatedPrice)}</Text>
        </View>
        <SellerStatusBadge status={item?.status} />
      </View>

      <Text style={styles.itemMeta}>
        Pickup: {item?.pickupLocationName || "N/A"} - {item?.pickupDate || "-"} - {item?.pickupTimeSlot || "-"}
      </Text>
      <Text style={styles.itemMeta}>Added: {formatMarketplaceTime(item?.createdAt)}</Text>
      {sold ? <Text style={styles.warn}>This listing is sold. Remove or replace this item.</Text> : null}

      <View style={styles.rowActions}>
        <Pressable style={styles.secondaryBtn} onPress={onOpen}>
          <Text style={styles.secondaryBtnText}>Open Listing</Text>
        </Pressable>
        <Pressable style={[styles.primaryBtn, checkingOut && styles.btnDisabled]} onPress={onCheckout} disabled={checkingOut}>
          <Text style={styles.primaryBtnText}>{checkingOut ? "Checking out..." : "Checkout"}</Text>
        </Pressable>
        <Pressable style={[styles.dangerBtn, removing && styles.btnDisabled]} onPress={onRemove} disabled={removing}>
          <Text style={styles.dangerBtnText}>{removing ? "Removing..." : "Remove"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MarketplaceBuyerCartScreen({ navigation, user }) {
  const [cart, setCart] = useState({ items: [], itemCount: 0, totalNegotiatedPrice: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState("");
  const [checkoutItemId, setCheckoutItemId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.myMarketplaceCart();
      setCart(res?.data || { items: [], itemCount: 0, totalNegotiatedPrice: 0 });
      setError("");
    } catch (err) {
      setError(err.message || "Could not load cart");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [loadCart])
  );

  async function handleRemove(itemId) {
    try {
      setBusyItemId(itemId);
      const res = await api.removeMarketplaceCartItem(itemId);
      setCart(res?.data || { items: [], itemCount: 0, totalNegotiatedPrice: 0 });
      setError("");
    } catch (err) {
      setError(err.message || "Could not remove cart item");
    } finally {
      setBusyItemId("");
    }
  }

  function confirmClear() {
    Alert.alert("Clear cart", "This will remove all items from your cart.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await api.clearMarketplaceCart();
            setCart(res?.data || { items: [], itemCount: 0, totalNegotiatedPrice: 0 });
            setError("");
          } catch (err) {
            setError(err.message || "Could not clear cart");
          }
        },
      },
    ]);
  }

  async function handleCheckout(itemId = null) {
    if (!Array.isArray(cart.items) || !cart.items.length) {
      Alert.alert("Cart is empty", "Add at least one item to checkout.");
      return;
    }

    if (itemId) setCheckoutItemId(itemId);
    else setCheckingOut(true);

    try {
      const res = await api.checkoutMarketplaceCart(itemId ? { itemId } : undefined);
      const created = Array.isArray(res?.data?.created) ? res.data.created : [];
      const skipped = Array.isArray(res?.data?.skipped) ? res.data.skipped : [];
      const nextCart = res?.data?.cart || { items: [], itemCount: 0, totalNegotiatedPrice: 0 };
      setCart(nextCart);

      if (itemId) {
        if (created.length > 0) {
          Alert.alert("Checkout complete", "Your request has been successfully created.", [
            { text: "View Request", onPress: () => navigation.navigate("MarketplaceBuyerRequests") },
            { text: "OK" }
          ]);
        } else if (skipped.length > 0) {
          Alert.alert("Checkout failed", skipped[0].reason || "Could not create request.");
        }
      } else {
        const summary = [
          `Created requests: ${created.length}`,
          `Skipped: ${skipped.length}`,
        ];
        if (skipped.length) {
          const top = skipped.slice(0, 3).map((row) => `- ${row.title || row.postId}: ${row.reason}`);
          summary.push("", ...top);
        }
        Alert.alert("Checkout complete", summary.join("\n"), [
          {
            text: "View Requests",
            onPress: () => navigation.navigate("MarketplaceBuyerRequests"),
          },
          { text: "OK" },
        ]);
      }
      setError("");
    } catch (err) {
      setError(err.message || "Could not checkout cart");
    } finally {
      if (itemId) setCheckoutItemId("");
      else setCheckingOut(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTopActions}>
            <Text style={styles.userEmail}>{user?.email || "Signed in user"}</Text>
            <Text style={styles.title}>My Cart</Text>
            <Text style={styles.subtitle}>Save multiple offers, then create all requests in one checkout.</Text>
          </View>
        </View>

        <View style={styles.actionCardRow}>
          <View style={styles.actionCard}>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardLabel}>Items</Text>
              <Text style={styles.actionCardCount}>{cart?.itemCount || 0}</Text>
            </View>
          </View>
          <View style={styles.actionCard}>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardLabel}>Total offers</Text>
              <Text style={styles.actionCardCount}>{formatCurrency(cart?.totalNegotiatedPrice || 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.heroPrimaryBtn} onPress={loadCart}>
            <Text style={styles.heroPrimaryBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.topActions}>
        <Pressable style={[styles.primaryBtn, checkingOut && styles.btnDisabled]} onPress={() => handleCheckout()} disabled={checkingOut}>
          <Text style={styles.primaryBtnText}>{checkingOut ? "Checking out..." : "Checkout Cart"}</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtnSolid} onPress={() => navigation.navigate("MarketplaceBuyerHome")}>
          <Text style={styles.secondaryBtnSolidText}>Browse More</Text>
        </Pressable>
        <Pressable style={styles.dangerBtnSoft} onPress={confirmClear}>
          <Text style={styles.dangerBtnSoftText}>Clear Cart</Text>
        </Pressable>
      </View>

      {!loading && (!cart?.items || cart.items.length === 0) ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No cart items yet</Text>
          <Text style={styles.emptySub}>Open a listing, set offer + pickup details, then tap Add to Cart.</Text>
        </View>
      ) : null}

      {(cart?.items || []).map((item) => (
        <CartItemCard
          key={item.id}
          item={item}
          removing={busyItemId === item.id}
          checkingOut={checkoutItemId === item.id}
          onOpen={() => navigation.navigate("MarketplaceBuyerDetail", { postId: item.postId })}
          onCheckout={() => handleCheckout(item.id)}
          onRemove={() => handleRemove(item.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#eef4ff" },
  content: { padding: 12, paddingBottom: 32, gap: 12 },

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
    fontSize: 22,
    fontWeight: "900",
    color: "#0d6f63",
    lineHeight: 26,
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

  topActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#ffffff", fontWeight: "900" },
  secondaryBtnSolid: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryBtnSolidText: { color: theme.colors.text, fontWeight: "800" },
  dangerBtnSoft: {
    backgroundColor: "#ffe2df",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerBtnSoftText: { color: theme.colors.danger, fontWeight: "800" },

  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  itemTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  itemTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 16 },
  itemMeta: { color: theme.colors.textMuted, lineHeight: 20, fontSize: 13 },
  offerPrice: { color: theme.colors.primaryDeep, fontWeight: "900" },
  rowActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: { color: theme.colors.text, fontWeight: "800" },
  dangerBtn: {
    backgroundColor: "#ffe2df",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerBtnText: { color: theme.colors.danger, fontWeight: "800" },
  btnDisabled: { opacity: 0.6 },
  warn: { color: theme.colors.danger, fontWeight: "700" },
  empty: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  emptyTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 16 },
  emptySub: { color: theme.colors.textMuted, lineHeight: 20, fontSize: 13 },
  error: { color: theme.colors.danger, fontSize: 13, paddingHorizontal: 2 },
});
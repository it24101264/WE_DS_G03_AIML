import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, MARKETPLACE_STATUS, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

const MESSAGE_MIN = 5;
const MESSAGE_MAX = 500;
const PHONE_MIN_DIGITS = 9;
const PHONE_MAX_DIGITS = 15;
const MAX_PRICE = 100000000;

function isValidPhoneNumber(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  const digits = text.replace(/\D/g, "");
  return /^[0-9+()\-\s]+$/.test(text) && digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS;
}

export default function MarketplaceBuyerDetailScreen({ navigation, route, user }) {
  const postId = route?.params?.postId;
  const [post, setPost] = useState(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const syncForm = useCallback((item) => {
    const request = item?.viewerRequest || null;
    setPrice(request?.negotiatedPrice != null ? String(request.negotiatedPrice) : item?.price != null ? String(item.price) : "");
    setMessage(request?.message || "");
    setBuyerContact(request?.buyerContact || "");
  }, []);

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.marketplacePostById(postId);
      const item = res.data || null;
      setPost(item);
      syncForm(item);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load item details");
    } finally {
      setLoading(false);
    }
  }, [postId, syncForm]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  async function saveRequest() {
    const negotiatedPrice = Number(price);
    const cleanMessage = message.trim();
    const cleanContact = buyerContact.trim();

    if (!Number.isFinite(negotiatedPrice) || negotiatedPrice <= 0 || negotiatedPrice > MAX_PRICE) {
      setError("Enter a valid negotiated price");
      return;
    }
    if (!cleanMessage) {
      setError("Enter a message for the seller");
      return;
    }
    if (cleanMessage.length < MESSAGE_MIN || cleanMessage.length > MESSAGE_MAX) {
      setError(`Message must be ${MESSAGE_MIN}-${MESSAGE_MAX} characters`);
      return;
    }
    if (!isValidPhoneNumber(cleanContact)) {
      setError("Enter a valid contact number");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (post?.viewerRequest?.id) {
        await api.updateMarketplaceRequest(post.viewerRequest.id, {
          negotiatedPrice,
          message: cleanMessage,
          buyerContact: cleanContact,
        });
      } else {
        await api.createMarketplaceRequest(postId, {
          negotiatedPrice,
          message: cleanMessage,
          buyerContact: cleanContact,
        });
      }
      await loadPost();
    } catch (err) {
      setError(err.message || "Could not save your buying request");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!post?.viewerRequest?.id) return;

    Alert.alert("Delete request", "This will remove your buying request for this item.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await api.deleteMarketplaceRequest(post.viewerRequest.id);
            await loadPost();
          } catch (err) {
            setError(err.message || "Could not delete your request");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading && !post) {
    return (
      <View style={styles.statePage}>
        <Text style={styles.muted}>Loading item...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.statePage}>
        <Text style={styles.error}>{error || "Item not found"}</Text>
      </View>
    );
  }

  const hasRequest = Boolean(post.viewerRequest?.id);
  const isSold = String(post.status || "").toUpperCase() === MARKETPLACE_STATUS.SOLD;
  const isOwnPost = String(post.userId || "") === String(user?.id || "");
  const requestStatus = String(post.viewerRequest?.status || "PENDING").toUpperCase();
  const isFinalized = requestStatus !== "PENDING";
  const isAccepted = requestStatus === "ACCEPTED";
  const shouldBlockSoldView = isSold && !isOwnPost && !isAccepted;

  if (shouldBlockSoldView) {
    return (
      <View style={styles.statePage}>
        <Text style={styles.error}>This item is already sold.</Text>
      </View>
    );
  }

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
        <Text style={styles.metaLine}>Seller: {post.sellerName || post.userName || "Unknown seller"}</Text>
        <Text style={styles.metaLine}>Mobile: {post.contactNumber || "Hidden until your offer is accepted"}</Text>
        <Text style={styles.metaLine}>Posted: {formatMarketplaceTime(post.createdAt)}</Text>
        {isAccepted ? <Text style={styles.successText}>Your offer was accepted. The seller phone number is now available.</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{post.description || "No description added."}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.formHeader}>
          <View>
            <Text style={styles.sectionTitle}>{hasRequest ? "Update your negotiation" : "Send a buying request"}</Text>
            <Text style={styles.muted}>
              {hasRequest
                ? `Last updated ${formatMarketplaceTime(post.viewerRequest?.updatedAt || post.viewerRequest?.createdAt)}`
                : "Offer your price and add a message for the seller."}
            </Text>
          </View>
          <Pressable style={styles.inlineBtn} onPress={() => navigation.navigate("MarketplaceBuyerRequests")}>
            <Text style={styles.inlineBtnText}>My Requests</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Negotiated price</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your offer in LKR"
          placeholderTextColor={theme.colors.textMuted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          editable={!isSold}
        />

        <Text style={styles.label}>Message to seller</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Tell the seller about pickup time, condition questions, or your negotiation details."
          placeholderTextColor={theme.colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          editable={!isSold}
        />

        <Text style={styles.label}>Your contact number</Text>
        <TextInput
          style={styles.input}
          placeholder="07xxxxxxxx"
          placeholderTextColor={theme.colors.textMuted}
          value={buyerContact}
          onChangeText={setBuyerContact}
          keyboardType="phone-pad"
          editable={!isSold}
        />

        {isOwnPost ? <Text style={styles.error}>This is your own listing. You can view it here, but you cannot send a buying request to it.</Text> : null}
        {hasRequest && requestStatus === "PENDING" ? <Text style={styles.muted}>Phone numbers stay hidden until the seller accepts your offer.</Text> : null}
        {requestStatus === "DECLINED" ? <Text style={styles.error}>This offer was declined by the seller.</Text> : null}
        {isSold ? <Text style={styles.error}>This item is already sold, so new negotiations are disabled.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable style={[styles.primaryBtn, (saving || isSold || isOwnPost || isFinalized) && styles.btnDisabled]} onPress={saveRequest} disabled={saving || isSold || isOwnPost || isFinalized}>
            <Text style={styles.primaryBtnText}>{saving ? "Saving..." : hasRequest ? "Update Request" : "Send Request"}</Text>
          </Pressable>
          {hasRequest ? (
            <Pressable style={[styles.dangerBtn, (saving || isFinalized) && styles.btnDisabled]} onPress={confirmDelete} disabled={saving || isFinalized}>
              <Text style={styles.dangerBtnText}>Delete Request</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
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
  statePage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#eef4ff",
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
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  inlineBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inlineBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  metaLine: {
    color: theme.colors.textMuted,
    lineHeight: 21,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  label: {
    color: theme.colors.text,
    fontWeight: "800",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    minWidth: 160,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  dangerBtn: {
    backgroundColor: "#ffe2df",
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dangerBtnText: {
    color: theme.colors.danger,
    fontWeight: "900",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  muted: {
    color: theme.colors.textMuted,
  },
  successText: {
    color: theme.colors.successText,
    fontWeight: "900",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

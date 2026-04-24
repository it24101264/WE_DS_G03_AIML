import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency, formatMarketplaceTime, MARKETPLACE_STATUS, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

const MESSAGE_MIN = 5;
const MESSAGE_MAX = 500;
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 10;
const MAX_PRICE = 100000000;
const PICKUP_DATE_WINDOW_DAYS = 7;
const MIN_OFFER_RATIO = 0.3;
const REQUEST_UPDATE_WINDOW_HOURS = 3;

const LOCATIONS = [
  { id: "study_area", name: "Study Area", icon: "" },
  { id: "new_canteen", name: "New Canteen", icon: "" },
  { id: "anohana_canteen", name: "Anohana Canteen", icon: "" },
  { id: "bird_nest", name: "Bird Nest", icon: "" },
  { id: "car_park", name: "Car Park", icon: "" },
  { id: "p_and_s", name: "P&S", icon: "" },
  { id: "juice_bar", name: "Juice Bar", icon: "" },
];

const TIME_SLOTS = [
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
];

function toIsoDateOnly(value) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildDateOptions(days = PICKUP_DATE_WINDOW_DAYS) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const next = new Date(now);
    next.setDate(now.getDate() + index);
    return {
      value: toIsoDateOnly(next),
      label: next.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    };
  });
}

function timeSlotStartToIso(pickupDate, pickupTimeSlot) {
  const startPart = String(pickupTimeSlot || "").split("-")[0]?.trim();
  const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || !pickupDate) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = String(match[3] || "").toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return new Date(`${pickupDate}T${hh}:${mm}:00`).toISOString();
}

function isValidPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 10 && /^07\d{8}$/.test(digits);
}

export default function MarketplaceBuyerDetailScreen({ navigation, route, user }) {
  const postId = route?.params?.postId;
  const isReofferMode = Boolean(route?.params?.reoffer);
  const [post, setPost] = useState(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [contactError, setContactError] = useState("");
  const [pickupLocationId, setPickupLocationId] = useState(LOCATIONS[0]?.id || "");
  const [pickupTimeSlot, setPickupTimeSlot] = useState(TIME_SLOTS[0] || "");
  const [pickupDate, setPickupDate] = useState(toIsoDateOnly(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dateOptions = useMemo(() => buildDateOptions(), []);

  const syncForm = useCallback((item) => {
    const request = item?.viewerRequest || null;
    const cartItem = item?.viewerCartItem || null;
    // prefer viewerRequest if it exists, fall back to viewerCartItem
    const source = request || cartItem || null;

    setPrice(
      source?.negotiatedPrice != null ? String(source.negotiatedPrice)
      : item?.price != null ? String(item.price) : ""
    );
    setMessage(source?.message || "");
    setBuyerContact(source?.buyerContact || "");
    setContactError("");
    setPickupLocationId(source?.pickupLocationId || LOCATIONS[0]?.id || "");
    setPickupTimeSlot(source?.pickupTimeSlot || TIME_SLOTS[0] || "");
    setPickupDate(source?.pickupDate || toIsoDateOnly(new Date()));
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

  function handleContactChange(text) {
    setBuyerContact(text);
    const digits = text.replace(/\D/g, "");
    if (text && !/^[0-9]+$/.test(text)) {
      setContactError("Only numbers are allowed");
    } else if (digits.length > 10) {
      setContactError("Contact number cannot exceed 10 digits");
    } else if (digits.length > 0 && digits.length < 10) {
      setContactError("Contact number must be exactly 10 digits");
    } else if (digits.length === 10 && !/^07\d{8}$/.test(digits)) {
      setContactError("Number must start with 07");
    } else {
      setContactError("");
    }
  }

  function buildValidatedRequestPayload() {
    const negotiatedPrice = Number(price);
    const cleanMessage = message.trim();
    const cleanContact = buyerContact.trim();
    const selectedLocation = LOCATIONS.find((location) => location.id === pickupLocationId);
    const pickupLocationName = selectedLocation?.name || "";
    const pickupDateTime = timeSlotStartToIso(pickupDate, pickupTimeSlot);

    if (!Number.isFinite(negotiatedPrice) || negotiatedPrice <= 0 || negotiatedPrice > MAX_PRICE) {
      setError("Enter a valid negotiated price");
      return;
    }
    const listingPrice = Number(post?.price);
    if (Number.isFinite(listingPrice) && listingPrice > 0) {
      const minAllowed = Number((listingPrice * MIN_OFFER_RATIO).toFixed(2));
      if (negotiatedPrice > listingPrice) {
        setError(`Offer cannot be greater than listing price (${formatCurrency(listingPrice)})`);
        return;
      }
      if (negotiatedPrice < minAllowed) {
        setError(`Offer must be at least ${Math.round(MIN_OFFER_RATIO * 100)}% of listing price (${formatCurrency(minAllowed)})`);
        return;
      }
    }
    if (!cleanMessage) {
      setError("Enter a message for the seller");
      return;
    }
    if (cleanMessage.length < MESSAGE_MIN || cleanMessage.length > MESSAGE_MAX) {
      setError(`Message must be ${MESSAGE_MIN}-${MESSAGE_MAX} characters`);
      return;
    }
    if (!cleanContact) {
      setError("Enter your contact number");
      return;
    }
    if (!isValidPhoneNumber(cleanContact)) {
      setError("Enter a valid Sri Lankan contact number (07XXXXXXXX)");
      return;
    }
    if (contactError) {
      setError(contactError);
      return;
    }
    if (!pickupLocationId || !pickupLocationName || !pickupDate || !pickupTimeSlot || !pickupDateTime) {
      setError("Select a pickup venue, date, and time slot");
      return null;
    }

    return {
      negotiatedPrice,
      message: cleanMessage,
      buyerContact: cleanContact,
      pickupLocationId,
      pickupLocationName,
      pickupDate,
      pickupTimeSlot,
      pickupDateTime,
    };
  }

  async function saveRequest() {
    const payload = buildValidatedRequestPayload();
    if (!payload) return;

    try {
      setSaving(true);
      setError("");
      const summary = [
        `Offer: LKR ${Number(payload.negotiatedPrice || 0).toLocaleString()}`,
        `Venue: ${payload.pickupLocationName || "-"}`,
        `Date: ${payload.pickupDate || "-"}`,
        `Time: ${payload.pickupTimeSlot || "-"}`,
        `Contact: ${payload.buyerContact || "-"}`,
      ].join("\n");

      if (post?.viewerRequest?.id) {
        const requestStatus = String(post?.viewerRequest?.status || "PENDING").toUpperCase();
        if (isReofferMode && requestStatus === "DECLINED") {
          await api.reofferMarketplaceRequest(post.viewerRequest.id, payload);
          Alert.alert("Reoffer sent", summary);
        } else {
          await api.updateMarketplaceRequest(post.viewerRequest.id, payload);
          Alert.alert("Request updated", summary);
        }
      } else {
        await api.createMarketplaceRequest(postId, payload);
        Alert.alert("Request sent", "Your buying request was sent successfully.");
      }
      await loadPost();
    } catch (err) {
      setError(err.message || "Could not save your buying request");
    } finally {
      setSaving(false);
    }
  }

  async function addToCart() {
    const payload = buildValidatedRequestPayload();
    if (!payload) return;

    try {
      setSaving(true);
      setError("");
      await api.addMarketplaceCartItem({
        postId,
        ...payload,
      });
      Alert.alert("Added to cart", "Item was added to your cart with the current offer details.", [
        { text: "View Cart", onPress: () => navigation.navigate("MarketplaceBuyerCart") },
        { text: "OK" },
      ]);
      await loadPost();
    } catch (err) {
      setError(err.message || "Could not add this item to cart");
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
  const hasCartItem = Boolean(post.viewerCartItem?.id);
  const isSold = String(post.status || "").toUpperCase() === MARKETPLACE_STATUS.SOLD;
  const isOwnPost = String(post.userId || "") === String(user?.id || "");
  const requestStatus = String(post.viewerRequest?.status || "PENDING").toUpperCase();
  const isFinalized = requestStatus !== "PENDING";
  const isAccepted = requestStatus === "ACCEPTED";
  const canReoffer = hasRequest && requestStatus === "DECLINED" && isReofferMode;
  const requestCreatedTime = new Date(post.viewerRequest?.reofferedAt || post.viewerRequest?.createdAt || 0).getTime();
  const isUpdateWindowExpired = hasRequest
    && Number.isFinite(requestCreatedTime)
    && Date.now() - requestCreatedTime > REQUEST_UPDATE_WINDOW_HOURS * 60 * 60 * 1000;
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
              {canReoffer
                ? "Last declined request is prefilled below. Edit and send your reoffer."
                : hasRequest
                ? `Last updated ${formatMarketplaceTime(post.viewerRequest?.updatedAt || post.viewerRequest?.createdAt)}`
                : hasCartItem
                ? "Your saved cart details are prefilled below."
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

        <Text style={styles.label}>Pickup venue</Text>
        <View style={styles.chipWrap}>
          {LOCATIONS.map((location) => {
            const isActive = pickupLocationId === location.id;
            return (
              <Pressable
                key={location.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setPickupLocationId(location.id)}
                disabled={isSold}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{location.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Pickup date</Text>
        <View style={styles.chipWrap}>
          {dateOptions.map((option) => {
            const isActive = pickupDate === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setPickupDate(option.value)}
                disabled={isSold}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Pickup time</Text>
        <View style={styles.chipWrap}>
          {TIME_SLOTS.map((slot) => {
            const isActive = pickupTimeSlot === slot;
            return (
              <Pressable
                key={slot}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setPickupTimeSlot(slot)}
                disabled={isSold}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{slot}</Text>
              </Pressable>
            );
          })}
        </View>

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
          style={[styles.input, contactError ? styles.inputError : null]}
          placeholder="07xxxxxxxx"
          placeholderTextColor={theme.colors.textMuted}
          value={buyerContact}
          onChangeText={handleContactChange}
          keyboardType="phone-pad"
          editable={!isSold}
          maxLength={10}
        />
        {contactError ? <Text style={styles.error}>{contactError}</Text> : null}

        {isOwnPost ? <Text style={styles.error}>This is your own listing. You can view it here, but you cannot send a buying request to it.</Text> : null}
        {hasRequest && requestStatus === "PENDING" ? <Text style={styles.muted}>Phone numbers stay hidden until the seller accepts your offer.</Text> : null}
        {hasRequest && requestStatus === "PENDING" && isUpdateWindowExpired ? (
          <Text style={styles.error}>This request can no longer be updated. Updates are only allowed within 3 hours of sending.</Text>
        ) : null}
        {requestStatus === "DECLINED" ? <Text style={styles.error}>This offer was declined by the seller.{canReoffer ? " You can edit and send a reoffer now." : ""}</Text> : null}
        {isSold ? <Text style={styles.error}>This item is already sold, so new negotiations are disabled.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryBtn, (saving || isSold || isOwnPost || ((isFinalized && !canReoffer) || (!canReoffer && isUpdateWindowExpired))) && styles.btnDisabled]}
            onPress={saveRequest}
            disabled={saving || isSold || isOwnPost || ((isFinalized && !canReoffer) || (!canReoffer && isUpdateWindowExpired))}
          >
            <Text style={styles.primaryBtnText}>
              {saving ? "Saving..." : canReoffer ? "Send Reoffer" : hasRequest ? "Update Request" : "Send Request"}
            </Text>
          </Pressable>
          {!hasRequest ? (
            <Pressable style={[styles.secondaryBtn, (saving || isSold || isOwnPost) && styles.btnDisabled]} onPress={addToCart} disabled={saving || isSold || isOwnPost}>
              <Text style={styles.secondaryBtnText}>{saving ? "Please wait..." : hasCartItem ? "Update Cart" : "Add to Cart"}</Text>
            </Pressable>
          ) : null}
          {hasRequest ? (
            <Pressable style={[styles.dangerBtn, (saving || isFinalized) && styles.btnDisabled]} onPress={confirmDelete} disabled={saving || isFinalized}>
              <Text style={styles.dangerBtnText}>Delete Request</Text>
            </Pressable>
          ) : null}
        </View>
        {hasRequest ? <Text style={styles.updateWindowHint}>Updates can only be done within 3 hours.</Text> : null}
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
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
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
  inputError: {
    borderColor: theme.colors.danger,
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
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
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
  updateWindowHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 6,
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
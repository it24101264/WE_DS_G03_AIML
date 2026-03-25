import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../ui/theme";
import { api } from "../../api";
import { marketplacePalette as p } from "./palette";

const PICKUP_LOCATIONS = [
  { id: "study_area", label: "Study Area", icon: "book-open-page-variant-outline" },
  { id: "new_canteen", label: "New Canteen", icon: "food-outline" },
  { id: "anohana_canteen", label: "Anohana Canteen", icon: "noodles" },
  { id: "bird_nest", label: "Bird nest", icon: "home-outline" },
  { id: "car_park", label: "Car Park", icon: "car-outline" },
];

const TIME_SLOTS = [
  "8:00-9:00 AM",
  "9:00-10:00 AM",
  "10:00-11:00 AM",
  "11:00 AM-12:00 PM",
  "12:00-1:00 PM",
  "1:00-2:00 PM",
  "2:00-3:00 PM",
  "3:00-4:00 PM",
  "4:00-5:00 PM",
];

function nextSevenDays() {
  const days = [];
  const now = new Date();
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function MarketplaceItemDetail({ route, navigation }) {
  const id = route?.params?.id;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [message, setMessage] = useState("");
  const [pickupLocation, setPickupLocation] = useState(null);
  const [pickupDate, setPickupDate] = useState(null);
  const [pickupTime, setPickupTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [days] = useState(nextSevenDays());

  useEffect(() => {
    let mounted = true;
    api
      .marketplaceItemById(id)
      .then((res) => {
        if (mounted) setItem(res?.item || null);
      })
      .catch(() => {
        if (mounted) setItem(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  async function toggleSave() {
    try {
      const res = await api.marketplaceToggleSave(id);
      setSaved(Boolean(res?.saved));
      Alert.alert("Marketplace", res?.message || "Updated");
    } catch (err) {
      Alert.alert("Marketplace", err.message || "Failed to save");
    }
  }

  async function sendRequest() {
    const normalizedMessage = String(message || "").trim();
    const hasLocation = Boolean(pickupLocation?.id);
    const hasDate = Boolean(pickupDate);
    const hasTime = Boolean(pickupTime);
    if (!hasLocation || !hasDate || !hasTime) {
      Alert.alert("Validation", "Please select pickup venue, date, and time.");
      return;
    }

    if (normalizedMessage.length > 150) {
      Alert.alert("Validation", "Description/message must be 150 characters or less.");
      return;
    }

    if (String(offerPrice || "").trim() !== "") {
      const parsedOffer = Number(offerPrice);
      if (!Number.isFinite(parsedOffer) || parsedOffer <= 0) {
        Alert.alert("Validation", "Offer price must be greater than 0.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.marketplaceCreateRequest({
        itemId: id,
        message: normalizedMessage,
        offerPrice: offerPrice ? Number(offerPrice) : undefined,
        pickupLocation: pickupLocation?.id || null,
        pickupLocationName: pickupLocation?.label || null,
        pickupDate: pickupDate ? pickupDate.toISOString() : null,
        pickupTime: pickupTime || null,
      });
      setMessage("");
      setOfferPrice("");
      setPickupLocation(null);
      setPickupDate(null);
      setPickupTime(null);
      setShowRequestModal(false);
      Alert.alert("Marketplace", "Buy request sent");
    } catch (err) {
      Alert.alert("Marketplace", err.message || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Item not found.</Text>
      </View>
    );
  }

  const heroImage = item?.images?.[0];
  const sellerName = item?.seller?.name || "Seller";
  const sellerInitial = sellerName.trim().charAt(0).toUpperCase() || "S";
  const sellerSub = `${item?.seller?.studentId || "N/A"} - ${item?.seller?.faculty || "Faculty"}`;
  const sellerPhone = item?.seller?.phone || "Not provided";
  const sellerEmail = item?.seller?.email || "Not provided";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={16} color="#445778" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.imageWrap}>
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <MaterialCommunityIcons name="image-outline" size={46} color="#8fa0bb" />
          </View>
        )}
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{String(item.status || "available").toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.infoTop}>
        <View style={styles.categoryRow}>
          <MaterialCommunityIcons name="tag-outline" size={15} color="#0f378d" />
          <Text style={styles.category}>{String(item.category || "OTHER").toUpperCase()}</Text>
        </View>
        <View style={styles.viewsRow}>
          <MaterialCommunityIcons name="eye-outline" size={15} color="#96a2b7" />
          <Text style={styles.viewsText}>{item.views || 0} views</Text>
        </View>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.price}>Rs. {Number(item.price || 0).toLocaleString()}</Text>

      <View style={styles.tagRow}>
        <View style={styles.tagPill}>
          <Text style={styles.tagPillText}>{String(item.condition || "GOOD").toUpperCase()}</Text>
        </View>
        <View style={[styles.tagPill, styles.tagPillGreen]}>
          <Text style={[styles.tagPillText, styles.tagPillGreenText]}>
            {String(item.status || "available").toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>DESCRIPTION</Text>
      <Text style={styles.desc}>{item.description}</Text>
      <View style={styles.divider} />

      <View style={styles.sellerCard}>
        <View style={styles.sellerAvatar}>
          <Text style={styles.sellerAvatarText}>{sellerInitial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sellerName}>{sellerName}</Text>
          <Text style={styles.sellerSub}>{sellerSub}</Text>
          <View style={styles.sellerContactRow}>
            <MaterialCommunityIcons name="phone-outline" size={13} color="#6e7d97" />
            <Text style={styles.sellerContactText}>{sellerPhone}</Text>
          </View>
          <View style={styles.sellerContactRow}>
            <MaterialCommunityIcons name="email-outline" size={13} color="#6e7d97" />
            <Text style={styles.sellerContactText}>{sellerEmail}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="account-outline" size={18} color="#8a96ab" />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={[styles.btn, styles.primary, { flex: 1 }]} onPress={() => setShowRequestModal(true)}>
          <MaterialCommunityIcons name="send-outline" size={16} color="#fff" />
          <Text style={styles.primaryText}>Send Buy Request</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.outline, { width: 98 }]} onPress={toggleSave}>
          <MaterialCommunityIcons name={saved ? "heart" : "heart-outline"} size={16} color={theme.colors.primary} />
          <Text style={styles.outlineText}>{saved ? "Saved" : "Save"}</Text>
        </Pressable>
      </View>

      <Modal
        visible={showRequestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Buy Request</Text>
              <Pressable style={styles.closeBtn} onPress={() => setShowRequestModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#6f7f99" />
              </Pressable>
            </View>

            <View style={styles.productStrip}>
              <View style={styles.productThumb}>
                <MaterialCommunityIcons name="image-outline" size={26} color="#8fa0bb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.productPrice}>Rs. {Number(item.price || 0).toLocaleString()}</Text>
              </View>
            </View>

            <ScrollView style={styles.formWrap} contentContainerStyle={{ paddingBottom: 14 }}>
              <Text style={styles.label}>YOUR OFFER PRICE (RS.) - OPTIONAL</Text>
              <TextInput
                value={offerPrice}
                onChangeText={setOfferPrice}
                keyboardType="numeric"
                placeholder={`Listed at Rs. ${Number(item.price || 0).toLocaleString()}`}
                placeholderTextColor="#8e9bb0"
                style={styles.input}
              />

              <View style={styles.rowBetween}>
                <Text style={styles.label}>MESSAGE TO SELLER - OPTIONAL</Text>
                <Text style={styles.counter}>{message.length}/150</Text>
              </View>
              <TextInput
                value={message}
                onChangeText={(v) => setMessage(v.slice(0, 150))}
                placeholder="Hi! I'm interested in this item..."
                placeholderTextColor="#8e9bb0"
                style={[styles.input, { minHeight: 42 }]}
              />

              <View style={styles.pickupBox}>
                <View style={styles.rowBetween}>
                  <View style={styles.pickupHead}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#1b4da6" />
                    <Text style={styles.pickupTitle}>Suggest a Pickup (Optional)</Text>
                  </View>
                  <View style={styles.pickupBadge}>
                    <Text style={styles.pickupBadgeText}>Campus Pickup</Text>
                  </View>
                </View>
                <Text style={styles.pickupHint}>Suggest a campus location, date, and time for the handover</Text>

                <Text style={styles.subLabel}>PICKUP LOCATION</Text>
                <View style={styles.chipsWrap}>
                  {PICKUP_LOCATIONS.map((loc) => {
                    const active = pickupLocation?.id === loc.id;
                    return (
                      <Pressable
                        key={loc.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setPickupLocation(active ? null : loc)}
                      >
                        <MaterialCommunityIcons
                          name={loc.icon}
                          size={14}
                          color={active ? "#ffffff" : "#4e5f7e"}
                        />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{loc.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.subLabel}>SUGGESTED DATE</Text>
                <View style={styles.chipsWrap}>
                  {days.map((d) => {
                    const key = d.toDateString();
                    const active = pickupDate?.toDateString() === key;
                    return (
                      <Pressable
                        key={key}
                        style={[styles.dateChip, active && styles.chipActive]}
                        onPress={() => setPickupDate(active ? null : d)}
                      >
                        <Text style={[styles.dateDay, active && styles.chipTextActive]}>
                          {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                        </Text>
                        <Text style={[styles.dateNum, active && styles.chipTextActive]}>{d.getDate()}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.subLabel}>SUGGESTED TIME</Text>
                <View style={styles.chipsWrap}>
                  {TIME_SLOTS.map((slot) => {
                    const active = pickupTime === slot;
                    return (
                      <Pressable
                        key={slot}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setPickupTime(active ? null : slot)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{slot}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowRequestModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.sendBtn} onPress={sendRequest} disabled={submitting}>
                <MaterialCommunityIcons name="send-outline" size={16} color="#fff" />
                <Text style={styles.sendText}>{submitting ? "Sending..." : "Send Request"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: p.bg },
  pageContent: { padding: 10, gap: 10, paddingBottom: 20 },
  center: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  empty: { color: theme.colors.textMuted },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backText: { color: "#445778", fontWeight: "700", fontSize: 14 },
  imageWrap: { borderRadius: 20, overflow: "hidden", position: "relative", borderWidth: 1, borderColor: "#d4dbea" },
  heroImage: { width: "100%", height: 260, backgroundColor: "#eaf0fa" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  statusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#d9f1df",
    borderColor: "#90c89f",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { color: "#11824c", fontWeight: "900", fontSize: 12 },
  infoTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  category: { color: "#0f378d", fontWeight: "900", fontSize: 15 },
  viewsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  viewsText: { color: "#9aa5b8", fontWeight: "700", fontSize: 13 },
  title: { color: p.primaryDeep, fontSize: 24, fontWeight: "900", lineHeight: 28 },
  price: { color: p.primaryDeep, fontSize: 38, fontWeight: "900", lineHeight: 42 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tagPill: {
    backgroundColor: "#eef2f8",
    borderWidth: 1,
    borderColor: "#d2d9e7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagPillGreen: { backgroundColor: "#dcf4e2", borderColor: "#9dcfa8" },
  tagPillText: { color: "#6a7791", fontWeight: "900", fontSize: 12 },
  tagPillGreenText: { color: "#117f4a" },
  divider: { height: 1, backgroundColor: "#d9e0ec", marginVertical: 4 },
  sectionLabel: { color: "#8a95aa", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  desc: { color: "#273b5e", lineHeight: 24, fontSize: 16 },
  sellerCard: {
    backgroundColor: "#e9eef8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d6deed",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#123ea6",
    alignItems: "center",
    justifyContent: "center",
  },
  sellerAvatarText: { color: "#fff", fontWeight: "900", fontSize: 20 },
  sellerName: { color: "#0f479e", fontWeight: "900", fontSize: 16 },
  sellerSub: { color: "#7f8ba2", fontWeight: "600", marginTop: 2 },
  sellerContactRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  sellerContactText: { color: "#5d6f8f", fontWeight: "600", fontSize: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "95%",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
  },
  modalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#dae2f0",
  },
  modalTitle: { color: "#134b9f", fontWeight: "900", fontSize: 30 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e7ecf6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d2d9e8",
  },
  productStrip: {
    backgroundColor: "#e9eef8",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  productThumb: {
    width: 58,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d6ddec",
    alignItems: "center",
    justifyContent: "center",
  },
  productTitle: { color: "#134b9f", fontWeight: "800", fontSize: 14 },
  productPrice: { color: "#142f87", fontWeight: "900", fontSize: 16, marginTop: 2 },
  formWrap: { paddingHorizontal: 14, paddingTop: 12 },
  label: { color: "#69758c", fontWeight: "900", fontSize: 13, marginBottom: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { color: "#8c98ad", fontWeight: "700", fontSize: 12 },
  input: {
    backgroundColor: "#f7f8fb",
    borderColor: "#d2d9e8",
    borderWidth: 1,
    borderRadius: 12,
    color: "#1d2a44",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  pickupBox: {
    backgroundColor: "#e8ecf7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d4dbeb",
    padding: 12,
    gap: 8,
  },
  pickupHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickupTitle: { color: "#134b9f", fontWeight: "900", fontSize: 18 },
  pickupBadge: {
    backgroundColor: "#d6ddf3",
    borderWidth: 1,
    borderColor: "#bfcbee",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pickupBadgeText: { color: "#133c98", fontWeight: "800", fontSize: 12 },
  pickupHint: { color: "#7d8aa4", marginBottom: 2 },
  subLabel: { color: "#69758c", fontWeight: "900", fontSize: 12, marginTop: 4 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ccd5e6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipActive: { backgroundColor: "#1545c1", borderColor: "#1545c1" },
  chipText: { color: "#4e5f7e", fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#ffffff" },
  dateChip: {
    width: 54,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ccd5e6",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dateDay: { color: "#3f4d67", fontWeight: "900", fontSize: 10 },
  dateNum: { color: "#1d2a44", fontWeight: "900", fontSize: 22, lineHeight: 22 },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: "#dce3f0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: "#e5eaf4",
    borderWidth: 1,
    borderColor: "#d0d9ea",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelText: { color: "#3a4862", fontWeight: "800", fontSize: 16 },
  sendBtn: {
    backgroundColor: p.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sendText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btn: {
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    flexDirection: "row",
    gap: 6,
  },
  primary: { backgroundColor: p.primary },
  outline: { borderWidth: 1, borderColor: p.primary },
  primaryText: { color: "#fff", fontWeight: "800" },
  outlineText: { color: p.primary, fontWeight: "800" },
});



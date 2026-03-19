import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";

function humanize(value) {
  return String(value || "").split("_").join(" ");
}

function userInitial(name) {
  return String(name || "U").trim().charAt(0).toUpperCase() || "U";
}

function formatTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function categoryIcon(category) {
  return (
    {
      DEVICE: "laptop",
      BAG: "bag-personal",
      PURSE: "wallet-outline",
      ID_CARD: "card-account-details-outline",
      BOOK: "book-open-page-variant",
      KEYS: "key-variant",
      OTHER: "shape-outline",
    }[String(category || "").toUpperCase()] || "shape-outline"
  );
}

function ClaimStatusPill({ status }) {
  const normalized = String(status || "").toUpperCase();
  const palette = {
    PENDING: { bg: "#fff1cf", text: "#8a6116" },
    APPROVED: { bg: "#dcfce7", text: "#067647" },
    REJECTED: { bg: "#fee4e2", text: "#b42318" },
  }[normalized] || { bg: "#e9edf5", text: "#3f4b63" };

  return (
    <View style={[styles.claimPill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.claimPillText, { color: palette.text }]}>{normalized}</Text>
    </View>
  );
}

export default function LostFoundDetailScreen({ route, user }) {
  const initialItem = route.params?.item || null;
  const itemId = route.params?.itemId || initialItem?.id || "";
  const [item, setItem] = useState(initialItem);
  const [claimAnswer, setClaimAnswer] = useState("");
  const [claimContact, setClaimContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function loadItem() {
    if (!itemId) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.lostFoundItemById(itemId);
      setItem(res.data || null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItem();
  }, [itemId]);

  async function submitClaim() {
    setLoading(true);
    setErr("");
    try {
      await api.claimLostFoundItem(itemId, {
        answer: claimAnswer,
        contactInfo: claimContact,
      });
      setClaimAnswer("");
      setClaimContact("");
      Alert.alert("Claim sent", "Your answer was sent to the founder for review.");
      await loadItem();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  async function reviewClaim(claimId, decision) {
    setLoading(true);
    setErr("");
    try {
      await api.reviewLostFoundClaim(itemId, claimId, { decision });
      await loadItem();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  if (!item) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.card}>
          <Text style={styles.value}>{err || "Item not found."}</Text>
        </View>
      </ScrollView>
    );
  }

  const isLost = String(item.type || "").toUpperCase() === "LOST";
  const isResolved = String(item.status || "").toUpperCase() === "RESOLVED";
  const isOwner = String(item.userId || "") === String(user?.id || "");
  const canClaim = Boolean(item.canClaim);
  const myClaim = item.myClaim || null;
  const claims = Array.isArray(item.claims) ? item.claims : [];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View
        style={[
          styles.heroCard,
          isResolved ? styles.heroResolved : isLost ? styles.heroLost : styles.heroFound,
        ]}
      >
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <View style={styles.heroTop}>
          <View style={[styles.typePill, isLost ? styles.typePillLost : styles.typePillFound]}>
            <Text style={styles.typePillText}>{String(item.type || "ITEM").toUpperCase()}</Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.title}>{item.title || "Lost & Found Item"}</Text>
        <Text style={styles.subtitle}>{humanize(item.location)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryIconWrap}>
            <MaterialCommunityIcons
              name={categoryIcon(item.itemCategory)}
              size={24}
              color={isLost ? "#b42318" : "#0f8a4b"}
            />
          </View>
          <View style={styles.categoryTextWrap}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>{humanize(item.itemCategory)}</Text>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{item.description || "No description provided."}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{humanize(item.location)}</Text>
        </View>

        {String(item.type || "").toUpperCase() === "FOUND" && String(item.claimQuestion || "").trim() ? (
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Claim Question</Text>
            <Text style={styles.value}>{item.claimQuestion}</Text>
          </View>
        ) : null}

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Contact</Text>
          <Text style={styles.value}>{item.contactInfo || "Not provided"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{String(item.status || "OPEN").toUpperCase()}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Posted By</Text>
          <View style={styles.posterInfoRow}>
            <View style={styles.posterAvatar}>
              <Text style={styles.posterAvatarText}>{userInitial(item.userName)}</Text>
            </View>
            <Text style={styles.value}>{item.userName || "Anonymous"}</Text>
          </View>
        </View>
      </View>

      {canClaim ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Claim This Item</Text>
          <Text style={styles.questionText}>
            {item.claimQuestion || "Describe how you know this item is yours."}
          </Text>
          <TextInput
            placeholder="Your answer"
            placeholderTextColor={theme.colors.textMuted}
            value={claimAnswer}
            onChangeText={setClaimAnswer}
            style={[styles.input, styles.multilineInput]}
            multiline
          />
          <TextInput
            placeholder="Your contact info"
            placeholderTextColor={theme.colors.textMuted}
            value={claimContact}
            onChangeText={setClaimContact}
            style={styles.input}
          />
          {err ? <Text style={styles.error}>{err}</Text> : null}
          <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={submitClaim} disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? "Sending..." : "Submit Claim"}</Text>
          </Pressable>
        </View>
      ) : null}

      {myClaim ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>My Claim</Text>
          <ClaimStatusPill status={myClaim.status} />
          <Text style={styles.label}>My Answer</Text>
          <Text style={styles.value}>{myClaim.answer || "No answer"}</Text>
          <Text style={styles.label}>Contact</Text>
          <Text style={styles.value}>{myClaim.contactInfo || "Not provided"}</Text>
        </View>
      ) : null}

      {isOwner && item.type === "FOUND" ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Claims</Text>
          {claims.length === 0 ? <Text style={styles.value}>No claims yet.</Text> : null}
          {claims.map((claim) => (
            <View key={claim.id} style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimName}>{claim.claimantName || "Student"}</Text>
                <ClaimStatusPill status={claim.status} />
              </View>
              <Text style={styles.claimMeta}>{formatTime(claim.createdAt)}</Text>
              <Text style={styles.label}>Answer</Text>
              <Text style={styles.value}>{claim.answer || "No answer"}</Text>
              <Text style={styles.label}>Contact</Text>
              <Text style={styles.value}>{claim.contactInfo || "Not provided"}</Text>
              {claim.status === "PENDING" ? (
                <View style={styles.claimActions}>
                  <Pressable
                    style={[styles.secondaryBtn, loading && styles.btnDisabled]}
                    onPress={() => reviewClaim(claim.id, "REJECTED")}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryBtnText}>Reject</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryBtn, loading && styles.btnDisabled]}
                    onPress={() => reviewClaim(claim.id, "APPROVED")}
                    disabled={loading}
                  >
                    <Text style={styles.primaryBtnText}>Approve</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  pageContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    borderRadius: theme.radius.lg,
    padding: 16,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  heroLost: {
    backgroundColor: "#d92d20",
  },
  heroFound: {
    backgroundColor: "#12b76a",
  },
  heroResolved: {
    backgroundColor: "#667085",
  },
  bgOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.14)",
    top: -70,
    right: -40,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.1)",
    bottom: -40,
    left: -30,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typePill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  typePillLost: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  typePillFound: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  typePillText: {
    color: "#fff",
    fontSize: 12,
  },
  timeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
  },
  title: {
    color: "#fff",
    fontSize: 24,
  },
  subtitle: {
    color: "#f8fafc",
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadow.soft,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTextWrap: {
    flex: 1,
  },
  infoBlock: {
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
  },
  questionText: {
    color: theme.colors.neutralText,
    lineHeight: 21,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
  },
  value: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  posterInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  posterAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#dbe5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  posterAvatarText: {
    color: theme.colors.primaryDeep,
    fontSize: 14,
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
    minHeight: 88,
    textAlignVertical: "top",
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  primaryBtnText: {
    color: "#fff",
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    backgroundColor: "#fff",
  },
  secondaryBtnText: {
    color: theme.colors.primary,
  },
  claimCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    backgroundColor: "#fdfefe",
    gap: 6,
  },
  claimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  claimName: {
    color: theme.colors.text,
    flex: 1,
  },
  claimMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  claimActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  claimPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  claimPillText: {
    fontSize: 12,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

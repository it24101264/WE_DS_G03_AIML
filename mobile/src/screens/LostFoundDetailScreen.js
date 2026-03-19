import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { categoryMeta, formatLocation, formatRelativeTime, StatusBadge, TypeBadge } from "./lostFoundShared";

export default function LostFoundDetailScreen({ route, user }) {
  const itemId = route?.params?.itemId;
  const [item, setItem] = useState(null);
  const [claimAnswer, setClaimAnswer] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadItem() {
    try {
      const res = await api.lostFoundItemById(itemId);
      setItem(res.data || null);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load post details");
    }
  }

  useEffect(() => {
    loadItem();
  }, [itemId]);

  if (error && !item) {
    return (
      <View style={styles.page}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.page}>
        <Text style={styles.muted}>Loading post...</Text>
      </View>
    );
  }

  const meta = categoryMeta(item.category);
  const isFound = item.type === "FOUND";
  const isResolved = item.status === "RESOLVED";
  const isOwner = String(item.userId || "") === String(user?.id || "");
  const heroTone = isResolved ? "resolved" : isFound ? "found" : "lost";
  const claims = Array.isArray(item.claims) ? item.claims : [];
  const myClaim = item.myClaim || null;

  async function toggleStatus() {
    try {
      setActionLoading(true);
      const nextStatus = item.status === "RESOLVED" ? "OPEN" : "RESOLVED";
      const res = await api.updateLostFoundItemStatus(item.id, { status: nextStatus });
      setItem(res.data || item);
      setError("");
    } catch (err) {
      setError(err.message || "Could not update post status");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitClaim() {
    try {
      setClaimLoading(true);
      const res = await api.submitLostFoundClaim(item.id, { answer: claimAnswer });
      setItem(res.data || item);
      setClaimAnswer("");
      setError("");
    } catch (err) {
      setError(err.message || "Could not submit claim");
    } finally {
      setClaimLoading(false);
    }
  }

  async function acceptClaim(claimId) {
    try {
      setActionLoading(true);
      const res = await api.acceptLostFoundClaim(item.id, claimId);
      setItem(res.data || item);
      setError("");
    } catch (err) {
      setError(err.message || "Could not accept claim");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.heroWrap}>
        <View style={[styles.hero, heroStyles[heroTone]]}>
          <View style={styles.bgOrbOne} />
          <View style={styles.bgOrbTwo} />

          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <View style={[styles.heroIcon, heroIconStyles[heroTone]]}>
                <MaterialCommunityIcons name={meta.icon} size={28} color="#ffffff" />
              </View>
              <Text style={styles.infoTitle}>Item Type</Text>
              <Text style={styles.infoText}>{meta.label}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.heroIcon, heroIconStyles[heroTone]]}>
                <MaterialCommunityIcons
                  name={item.status === "RESOLVED" ? "check-circle-outline" : "progress-clock"}
                  size={28}
                  color="#ffffff"
                />
              </View>
              <Text style={styles.infoTitle}>Post Status</Text>
              <Text style={styles.infoText}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatLocation(item.location)}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge status={item.status} />
              <TypeBadge type={item.type} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Post Summary</Text>
        <Text style={styles.metaLine}>Posted {formatRelativeTime(item.createdAt)}</Text>
        <Text style={styles.metaLine}>Posted by: {item.userName}</Text>
        <Text style={styles.metaLine}>Email: {item.userEmail}</Text>
        <Text style={styles.metaLine}>Category: {meta.label}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{item.description}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Post Details</Text>
        <Text style={styles.metaLine}>Location: {formatLocation(item.location)}</Text>
        <Text style={styles.metaLine}>Type: {item.type}</Text>
        <Text style={styles.metaLine}>Status: {item.status}</Text>
        {isOwner ? (
          <Pressable style={[styles.statusBtn, actionLoading && styles.btnDisabled]} onPress={toggleStatus} disabled={actionLoading}>
            <Text style={styles.statusBtnText}>
              {actionLoading ? "Saving..." : item.status === "RESOLVED" ? "Mark as Open" : "Mark as Resolved"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isFound ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Claim Question</Text>
          <Text style={styles.body}>{item.claimQuestion || "No question added."}</Text>
        </View>
      ) : null}

      {isFound && !isOwner ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Claim This Item</Text>
          {myClaim ? (
            <>
              <Text style={styles.metaLine}>Your claim is {myClaim.status.toLowerCase()}.</Text>
              <Text style={styles.claimAnswerLabel}>Your Answer</Text>
              <Text style={styles.body}>{myClaim.answer}</Text>
            </>
          ) : item.status === "OPEN" ? (
            <>
              <Text style={styles.helperText}>Answer the owner's question so they can verify the real owner.</Text>
              <TextInput
                placeholder="Write your answer"
                placeholderTextColor={theme.colors.textMuted}
                value={claimAnswer}
                onChangeText={setClaimAnswer}
                style={[styles.input, styles.multilineInput]}
                multiline
              />
              <Pressable
                style={[styles.claimBtn, claimLoading && styles.btnDisabled]}
                onPress={submitClaim}
                disabled={claimLoading}
              >
                <Text style={styles.claimBtnText}>{claimLoading ? "Submitting..." : "Submit Claim"}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.metaLine}>This item is already resolved.</Text>
          )}
        </View>
      ) : null}

      {isFound && isOwner ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Claim Requests</Text>
          {claims.length ? (
            <View style={styles.claimList}>
              {claims.map((claim) => (
                <View key={claim.id} style={styles.claimCard}>
                  <View style={styles.claimHeader}>
                    <View>
                      <Text style={styles.claimName}>{claim.userName}</Text>
                      <Text style={styles.claimMeta}>{claim.userEmail}</Text>
                    </View>
                    <View style={[styles.claimStatusPill, claimStatusStyles[claim.status] || claimStatusStyles.PENDING]}>
                      <Text style={[styles.claimStatusText, claimStatusTextStyles[claim.status] || claimStatusTextStyles.PENDING]}>
                        {claim.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.claimMeta}>Answered {formatRelativeTime(claim.createdAt)}</Text>
                  <Text style={styles.claimAnswerLabel}>Answer</Text>
                  <Text style={styles.body}>{claim.answer}</Text>
                  {claim.status === "PENDING" && item.status === "OPEN" ? (
                    <Pressable
                      style={[styles.acceptBtn, actionLoading && styles.btnDisabled]}
                      onPress={() => acceptClaim(claim.id)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.acceptBtnText}>{actionLoading ? "Saving..." : "Accept Claim"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.metaLine}>No one has tried to claim this item yet.</Text>
          )}
        </View>
      ) : null}

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
    </ScrollView>
  );
}

const heroStyles = StyleSheet.create({
  lost: {
    backgroundColor: "#d93d3d",
    borderWidth: 1,
    borderColor: "#bc2d2d",
  },
  found: {
    backgroundColor: "#1d9b57",
    borderWidth: 1,
    borderColor: "#167746",
  },
  resolved: {
    backgroundColor: "#6b7280",
    borderWidth: 1,
    borderColor: "#4b5563",
  },
});

const heroIconStyles = StyleSheet.create({
  lost: { backgroundColor: "#d93d3d" },
  found: { backgroundColor: "#1d9b57" },
  resolved: { backgroundColor: "#6b7280" },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  heroWrap: {
    borderRadius: 28,
    overflow: "hidden",
  },
  hero: {
    borderRadius: 28,
    padding: 16,
    overflow: "hidden",
    gap: 12,
    ...theme.shadow.soft,
  },
  bgOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: -70,
    right: -40,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
    bottom: -42,
    left: -20,
  },
  title: { color: "#ffffff", fontSize: 28, fontWeight: "900" },
  infoRow: { flexDirection: "row", gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  infoText: { color: "#edf2ff", fontSize: 14, lineHeight: 20 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  metaText: { color: "#dce7ff", fontWeight: "700" },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  sectionTitle: { fontWeight: "800", color: theme.colors.text, fontSize: 16 },
  body: { color: theme.colors.neutralText, lineHeight: 22 },
  metaLine: { color: "#42506a", lineHeight: 22, fontWeight: "600" },
  helperText: { color: theme.colors.textMuted, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  multilineInput: { minHeight: 84, textAlignVertical: "top" },
  statusBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 11,
  },
  statusBtnText: { color: "#ffffff", fontWeight: "800" },
  claimBtn: {
    backgroundColor: "#1d9b57",
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 11,
  },
  claimBtnText: { color: "#ffffff", fontWeight: "800" },
  claimList: { gap: 10 },
  claimCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#f8fbff",
    padding: 12,
    gap: 6,
  },
  claimHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  claimName: { color: theme.colors.text, fontWeight: "700", fontSize: 15 },
  claimMeta: { color: theme.colors.textMuted, lineHeight: 20 },
  claimAnswerLabel: { color: theme.colors.text, fontWeight: "700", marginTop: 2 },
  claimStatusPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  claimStatusText: { fontSize: 12, fontWeight: "700" },
  acceptBtn: {
    marginTop: 8,
    backgroundColor: "#1d9b57",
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 10,
  },
  acceptBtnText: { color: "#ffffff", fontWeight: "800" },
  btnDisabled: { opacity: 0.7 },
  muted: { color: theme.colors.textMuted, padding: 16 },
  error: { color: theme.colors.danger, padding: 16 },
  inlineError: { color: theme.colors.danger, fontSize: 13 },
});

const claimStatusStyles = StyleSheet.create({
  PENDING: { backgroundColor: "#fff4d6", borderColor: "#f0cf75" },
  ACCEPTED: { backgroundColor: "#dff8ef", borderColor: "#8ed4b8" },
  REJECTED: { backgroundColor: "#eceff4", borderColor: "#c9d0db" },
});

const claimStatusTextStyles = StyleSheet.create({
  PENDING: { color: "#8a6116" },
  ACCEPTED: { color: "#136548" },
  REJECTED: { color: "#586577" },
});

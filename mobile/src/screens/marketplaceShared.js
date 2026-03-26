import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

export const MARKETPLACE_STATUS = {
  ACTIVE: "ACTIVE",
  SOLD: "SOLD",
};

export function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "LKR 0";
  return `LKR ${amount.toLocaleString()}`;
}

export function formatMarketplaceTime(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function SellerStatusBadge({ status }) {
  const safeStatus = String(status || MARKETPLACE_STATUS.ACTIVE).toUpperCase();
  const palette =
    safeStatus === MARKETPLACE_STATUS.SOLD
      ? { bg: theme.colors.successBg, text: theme.colors.successText }
      : { bg: theme.colors.infoBg, text: theme.colors.infoText };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{safeStatus}</Text>
    </View>
  );
}

export function PhotoStrip({ photos, compact = false }) {
  const items = Array.isArray(photos) ? photos.filter(Boolean).slice(0, 2) : [];
  if (!items.length) return null;

  return (
    <View style={[styles.photoRow, compact && styles.photoRowCompact]}>
      {items.map((photo, index) => {
        const uri = typeof photo === "string" ? photo : photo?.uri || photo?.base64DataUrl;
        if (!uri) return null;
        return <Image key={`${uri}-${index}`} source={{ uri }} style={[styles.photo, compact && styles.photoCompact]} contentFit="cover" />;
      })}
    </View>
  );
}

export function SellerPostCard({ item, onPress, onEdit, onMarkSold, onDelete, actionLoading }) {
  const isSold = String(item?.status || "").toUpperCase() === MARKETPLACE_STATUS.SOLD;
  const messageCount = Array.isArray(item?.messages) ? item.messages.length : Number(item?.messageCount || 0);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <PhotoStrip photos={item?.photos} compact />
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderMain}>
          <Text style={styles.cardTitle}>{item?.title || "Untitled item"}</Text>
          <Text style={styles.cardMeta}>{formatCurrency(item?.price)}</Text>
        </View>
        <SellerStatusBadge status={item?.status} />
      </View>

      <Text style={styles.cardDescription} numberOfLines={2}>
        {item?.description || "No description added."}
      </Text>

      <View style={styles.inlineStats}>
        <View style={styles.inlineStat}>
          <MaterialCommunityIcons name="message-text-outline" size={18} color={theme.colors.primaryDeep} />
          <Text style={styles.inlineStatText}>{messageCount} message(s)</Text>
        </View>
        <View style={styles.inlineStat}>
          <MaterialCommunityIcons name="clock-time-four-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.inlineStatText}>{formatMarketplaceTime(item?.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryBtn} onPress={onEdit}>
          <Text style={styles.secondaryBtnText}>Edit</Text>
        </Pressable>
        {!isSold ? (
          <Pressable style={styles.infoBtn} onPress={onMarkSold} disabled={actionLoading}>
            <Text style={styles.infoBtnText}>{actionLoading ? "Saving..." : "Mark Sold"}</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.dangerBtn} onPress={onDelete} disabled={actionLoading}>
          <Text style={styles.dangerBtnText}>{actionLoading ? "Deleting..." : "Delete"}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  photoRowCompact: {
    marginBottom: 12,
  },
  photo: {
    width: "100%",
    height: 180,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    flex: 1,
  },
  photoCompact: {
    height: 100,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadow.soft,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  cardHeaderMain: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  cardMeta: {
    color: theme.colors.primaryDeep,
    fontWeight: "800",
  },
  cardDescription: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  inlineStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  inlineStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineStatText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  infoBtn: {
    backgroundColor: theme.colors.infoBg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoBtnText: {
    color: theme.colors.infoText,
    fontWeight: "800",
  },
  dangerBtn: {
    backgroundColor: "#ffe2df",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerBtnText: {
    color: theme.colors.danger,
    fontWeight: "800",
  },
});

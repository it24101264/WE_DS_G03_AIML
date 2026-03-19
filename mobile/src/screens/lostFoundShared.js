import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

export const LOCATION_OPTIONS = ["canteen", "auditorium", "lab", "library", "classroom", "parking", "other"];
export const POST_TYPE_OPTIONS = ["LOST", "FOUND"];
export const CATEGORY_OPTIONS = ["device", "bag", "book", "id-card", "keys", "wallet", "clothing", "other"];

const CATEGORY_META = {
  device: { label: "Device", icon: "laptop" },
  bag: { label: "Bag", icon: "bag-personal" },
  book: { label: "Book", icon: "book-open-page-variant-outline" },
  "id-card": { label: "ID Card", icon: "card-account-details-outline" },
  keys: { label: "Keys", icon: "key-variant" },
  wallet: { label: "Wallet", icon: "wallet-outline" },
  clothing: { label: "Clothing", icon: "tshirt-crew-outline" },
  other: { label: "Other", icon: "shape-outline" },
};

export function formatLocation(value) {
  return String(value || "")
    .split("-")
    .join(" ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRelativeTime(value) {
  const createdAt = new Date(value);
  const diffMs = Date.now() - createdAt.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function categoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.other;
}

export function TypeBadge({ type }) {
  const isFound = type === "FOUND";
  return (
    <View style={[shared.badge, isFound ? shared.badgeFound : shared.badgeLost]}>
      <Text style={[shared.badgeText, isFound ? shared.badgeTextFound : shared.badgeTextLost]}>{type}</Text>
    </View>
  );
}

export function StatusBadge({ status }) {
  const isResolved = status === "RESOLVED";
  return (
    <View style={[shared.badge, isResolved ? shared.statusResolved : shared.statusOpen]}>
      <Text style={[shared.badgeText, isResolved ? shared.statusTextResolved : shared.statusTextOpen]}>
        {status || "OPEN"}
      </Text>
    </View>
  );
}

export function LostFoundCard({ item, onPress }) {
  const isFound = item.type === "FOUND";
  const isResolved = item.status === "RESOLVED";
  const accent = isResolved ? "#6b7280" : isFound ? "#1f9d55" : "#d94646";
  const baseTint = isResolved ? "#f2f4f7" : isFound ? "#eefbf2" : "#fff1f1";
  const borderTint = isResolved ? "#d5d9e1" : isFound ? "#b8e5c8" : "#f1b6b6";
  const meta = categoryMeta(item.category);

  return (
    <View style={[shared.outerShell, { backgroundColor: baseTint, borderColor: borderTint }]}>
      <Pressable style={shared.innerCard} onPress={onPress}>
        <View style={[shared.topRow, { borderBottomColor: `${accent}20` }]}>
          <View style={shared.brandRow}>
            <View style={[shared.iconShell, { backgroundColor: `${accent}18`, borderColor: `${accent}40` }]}>
              <MaterialCommunityIcons name={meta.icon} size={18} color={accent} />
            </View>
            <Text style={shared.brandText}>{meta.label}</Text>
            <StatusBadge status={item.status} />
          </View>
          <MaterialCommunityIcons name="arrow-top-right" size={18} color={accent} />
        </View>

        <Text style={shared.cardTitle}>{item.title}</Text>
        <Text numberOfLines={2} style={shared.cardDescription}>{item.description}</Text>

        <View style={shared.chipRow}>
          <View style={shared.infoChip}>
            <Text style={shared.infoChipText}>{formatLocation(item.location)}</Text>
          </View>
          <View style={shared.infoChip}>
            <Text style={shared.infoChipText}>{item.userName}</Text>
          </View>
          <TypeBadge type={item.type} />
        </View>
      </Pressable>

      <Text style={[shared.postedText, { color: accent }]}>POSTED {formatRelativeTime(item.createdAt).toUpperCase()}</Text>
    </View>
  );
}

const shared = StyleSheet.create({
  outerShell: {
    marginTop: 12,
    borderRadius: 26,
    padding: 9,
    borderWidth: 1,
    shadowColor: "#a7b3d4",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 5,
  },
  innerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(111,124,161,0.18)",
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  iconShell: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  brandText: {
    color: "#243056",
    fontWeight: "500",
    fontSize: 14,
  },
  typeInline: {
    fontWeight: "600",
    fontSize: 13,
  },
  cardTitle: {
    color: "#1b2559",
    fontWeight: "600",
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  cardDescription: {
    color: "#475569",
    lineHeight: 21,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  infoChip: {
    borderWidth: 1,
    borderColor: "#dfe5f2",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipText: {
    color: "#4c5a7f",
    fontWeight: "500",
    fontSize: 12,
  },
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeFound: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  badgeLost: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextFound: {
    color: "#15803d",
  },
  badgeTextLost: {
    color: "#b91c1c",
  },
  statusOpen: {
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  statusResolved: {
    backgroundColor: "rgba(168,85,247,0.12)",
  },
  statusTextOpen: {
    color: "#1d4ed8",
  },
  statusTextResolved: {
    color: "#6d28d9",
  },
  postedText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});

import React, { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { theme } from "../ui/theme";

function humanize(value) {
  return String(value || "").split("_").join(" ");
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

function TypePill({ type }) {
  const isLost = String(type || "").toUpperCase() === "LOST";
  return (
    <View style={[styles.typePill, isLost ? styles.typePillLost : styles.typePillFound]}>
      <Text style={[styles.typePillText, isLost ? styles.typePillTextLost : styles.typePillTextFound]}>
        {isLost ? "LOST" : "FOUND"}
      </Text>
    </View>
  );
}

function StatusPill({ status }) {
  const isResolved = String(status || "").toUpperCase() === "RESOLVED";
  return (
    <View style={[styles.statusPill, isResolved ? styles.statusPillResolved : styles.statusPillOpen]}>
      <Text style={[styles.statusPillText, isResolved ? styles.statusPillTextResolved : styles.statusPillTextOpen]}>
        {isResolved ? "RESOLVED" : "OPEN"}
      </Text>
    </View>
  );
}

export default function LostFoundMyItemsScreen({ navigation, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function loadData() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.myLostFoundItems();
      setItems(res.data || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function toggleStatus(item) {
    setLoading(true);
    setErr("");
    try {
      const next = String(item.status || "").toUpperCase() === "OPEN" ? "RESOLVED" : "OPEN";
      await api.updateLostFoundStatus(item.id, { status: next });
      await loadData();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <Text style={styles.title}>My Lost & Found Items</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Pressable style={[styles.secondaryBtn, loading && styles.btnDisabled]} onPress={loadData} disabled={loading}>
            <Text style={styles.secondaryBtnText}>{loading ? "Loading..." : "Refresh"}</Text>
          </Pressable>
        </View>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.muted}>You have no posts yet.</Text>}
          renderItem={({ item }) => {
            const isLost = String(item.type || "").toUpperCase() === "LOST";
            const isResolved = String(item.status || "").toUpperCase() === "RESOLVED";
            return (
              <Pressable
                style={[
                  styles.listItem,
                  isResolved ? styles.listItemResolved : isLost ? styles.listItemLost : styles.listItemFound,
                ]}
                onPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id, item })}
              >
                <View style={styles.listTopRow}>
                  <View
                    style={[
                      styles.categoryIconWrap,
                      isResolved
                        ? styles.categoryIconWrapResolved
                        : isLost
                          ? styles.categoryIconWrapLost
                          : styles.categoryIconWrapFound,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={categoryIcon(item.itemCategory)}
                      size={20}
                      color={isResolved ? "#475467" : isLost ? "#b42318" : "#067647"}
                    />
                  </View>
                  <View style={styles.listMain}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {humanize(item.itemCategory)} | {humanize(item.location)}
                    </Text>
                    <Text style={styles.previewText} numberOfLines={2}>
                      {item.description || "Tap to view full details."}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.pillStack}>
                    <TypePill type={item.type} />
                    <StatusPill status={item.status} />
                  </View>
                  <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.editBtn}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        navigation.navigate("LostFoundEdit", { itemId: item.id, item });
                      }}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.statusBtn}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        toggleStatus(item);
                      }}
                    >
                      <Text style={styles.statusBtnText}>
                        {String(item.status || "").toUpperCase() === "OPEN" ? "Mark Resolved" : "Reopen"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
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
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 16,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  bgOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: -70,
    right: -40,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.13)",
    bottom: -40,
    left: -30,
  },
  title: {
    color: "#fff",
    fontSize: 24,
  },
  subtitle: {
    color: "#e8eeff",
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  secondaryBtn: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  secondaryBtnText: {
    color: theme.colors.primary,
  },
  listItem: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  listItemLost: {
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
  },
  listItemFound: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  listItemResolved: {
    borderColor: "#d0d5dd",
    backgroundColor: "#f2f4f7",
  },
  listTopRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconWrapLost: {
    backgroundColor: "#fee4e2",
  },
  categoryIconWrapFound: {
    backgroundColor: "#dcfce7",
  },
  categoryIconWrapResolved: {
    backgroundColor: "#eaecf0",
  },
  listMain: {
    flex: 1,
    gap: 4,
  },
  pillStack: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  itemTitle: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  previewText: {
    color: theme.colors.neutralText,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  timeText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  editBtnText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  statusBtn: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  statusBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  typePill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillLost: {
    backgroundColor: "#fee4e2",
  },
  typePillFound: {
    backgroundColor: "#dcfce7",
  },
  typePillText: {
    fontSize: 11,
  },
  typePillTextLost: {
    color: "#b42318",
  },
  typePillTextFound: {
    color: "#067647",
  },
  statusPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillOpen: {
    backgroundColor: "#deecff",
  },
  statusPillResolved: {
    backgroundColor: "#eaecf0",
  },
  statusPillText: {
    fontSize: 11,
  },
  statusPillTextOpen: {
    color: "#184a9b",
  },
  statusPillTextResolved: {
    color: "#475467",
  },
  muted: {
    color: theme.colors.textMuted,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

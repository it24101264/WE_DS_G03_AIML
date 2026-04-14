import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { LostFoundCard } from "./lostFoundShared";

export default function LostFoundMyPostsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function loadItems() {
    setLoading(true);
    return api
      .myLostFoundItems()
      .then((res) => {
        setError("");
        setItems(res.data || []);
      })
      .catch((err) => setError(err.message || "Could not load your posts"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadItems();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadItems();
    }, [])
  );

  return (
    <View style={styles.page}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading your posts...</Text>
            </View>
          ) : (
            <Text style={styles.muted}>You have not posted any items yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.postWrap}>
            <LostFoundCard item={item} onPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id })} />
            <View style={styles.actionRow}>
              <Pressable style={styles.editBtn} onPress={() => navigation.navigate("LostFoundEdit", { item })}>
                <Text style={styles.editBtnText}>Edit Post</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  postWrap: { marginBottom: 20 },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  actionRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  muted: { color: theme.colors.textMuted },
  error: { color: theme.colors.danger, fontSize: 13, padding: 16, paddingBottom: 0 },
  editBtn: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editBtnText: { color: theme.colors.bg, fontWeight: "600", textAlign: "center" },
});

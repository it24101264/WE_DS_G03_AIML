import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { LostFoundCard } from "./lostFoundShared";

export default function LostFoundMyPostsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .myLostFoundItems()
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message || "Could not load your posts"));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      api
        .myLostFoundItems()
        .then((res) => {
          setError("");
          setItems(res.data || []);
        })
        .catch((err) => setError(err.message || "Could not load your posts"));
    }, [])
  );

  return (
    <View style={styles.page}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.muted}>You have not posted any items yet.</Text>}
        renderItem={({ item }) => (
          <LostFoundCard item={item} onPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  muted: { color: theme.colors.textMuted },
  error: { color: theme.colors.danger, fontSize: 13, padding: 16, paddingBottom: 0 },
});

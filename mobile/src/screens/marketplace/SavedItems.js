import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../ui/theme";
import { api } from "../../api";
import { marketplacePalette as p } from "./palette";

export default function MarketplaceSavedItems({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    api
      .marketplaceSavedItems()
      .then((res) => setItems(res?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Saved Items</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("MarketplaceItemDetail", { id: item._id })}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardPrice}>Rs. {Number(item.price || 0).toLocaleString()}</Text>
          </Pressable>
        )}
        contentContainerStyle={{ gap: 10, paddingBottom: 26 }}
        ListEmptyComponent={<Text style={styles.empty}>No saved items yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: p.bg, padding: 16 },
  center: { flex: 1, backgroundColor: p.bg, alignItems: "center", justifyContent: "center" },
  title: { color: p.text, fontSize: 24, fontWeight: "900", marginBottom: 10 },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  cardTitle: { color: theme.colors.text, fontWeight: "800", fontSize: 16 },
  cardPrice: { color: theme.colors.primary, fontWeight: "800", marginTop: 4 },
  empty: { color: theme.colors.textMuted },
});

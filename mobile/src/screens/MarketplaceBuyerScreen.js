import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

export default function MarketplaceBuyerScreen({ navigation }) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="basket-outline" size={34} color="#ffffff" />
        </View>
        <Text style={styles.title}>Buyer side will be built separately</Text>
        <Text style={styles.subtitle}>
          The marketplace entry is now split into seller and buyer flows. Seller is implemented first, and this screen keeps the buyer path isolated until its own screens are added.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("MarketplaceSellerHome")}>
          <Text style={styles.primaryBtnText}>Open Seller Side</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16,
    backgroundColor: "#eef4ff",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#0f9f8f",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 21,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 6,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});

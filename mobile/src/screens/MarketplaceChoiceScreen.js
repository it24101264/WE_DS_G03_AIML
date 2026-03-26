import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

const PATHS = [
  {
    key: "sell",
    title: "Sell something",
    subtitle: "Post items and manage listings.",
    icon: "tag-outline",
    route: "MarketplaceSellerHome",
    colors: ["#184aef", "#2b6cff"],
  },
  {
    key: "buy",
    title: "Buy something",
    subtitle: "Browse items and contact sellers.",
    icon: "basket-outline",
    route: "MarketplaceBuyerHome",
    colors: ["#0f9f8f", "#13c2a3"],
  },
];

export default function MarketplaceChoiceScreen({ navigation }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Marketplace</Text>
        <Text style={styles.title}>Buy or Sell</Text>
        <Text style={styles.subtitle}>Choose how you want to use the marketplace.</Text>
      </View>

      {PATHS.map((path) => (
        <Pressable
          key={path.key}
          style={[styles.choiceCard, { backgroundColor: path.colors[0] }]}
          onPress={() => navigation.navigate(path.route)}
        >
          <View style={[styles.choiceIconWrap, { backgroundColor: path.colors[1] }]}>
            <MaterialCommunityIcons name={path.icon} size={34} color="#ffffff" />
          </View>
          <View style={styles.choiceTextWrap}>
            <Text style={styles.choiceTitle}>{path.title}</Text>
            <Text style={styles.choiceSubtitle}>{path.subtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color="#ffffff" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#eef4ff",
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 21,
  },
  choiceCard: {
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    ...theme.shadow.soft,
  },
  choiceIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTextWrap: {
    flex: 1,
    gap: 4,
  },
  choiceTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  choiceSubtitle: {
    color: "#dfe9ff",
    lineHeight: 20,
  },
});

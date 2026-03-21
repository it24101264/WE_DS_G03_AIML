import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../constants/theme";

export default function StatusBadge({ status }) {
  let bg = theme.colors.surfaceAlt;
  let color = theme.colors.text;

  if (status === "Free") {
    bg = theme.colors.successBg;
    color = theme.colors.successText;
  } else if (status === "Moderate") {
    bg = theme.colors.warningBg;
    color = theme.colors.warningText;
  } else if (status === "Crowded") {
    bg = theme.colors.crowdedBg;
    color = theme.colors.crowdedText;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start"
  },
  text: {
    fontWeight: "800"
  }
});
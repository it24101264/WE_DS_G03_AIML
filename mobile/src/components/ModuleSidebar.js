import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

const MODULES = [
  { key: "study", label: "Smart Study Support", icon: "bulb-outline" },
  { key: "lost-found", label: "Lost & Found", icon: "search-outline" },
  { key: "parking", label: "Parking Management", icon: "car-sport-outline" },
  { key: "marketplace", label: "Marketplace", icon: "storefront-outline" },
  { key: "food", label: "Food", icon: "restaurant-outline" },
];

export default function ModuleSidebar({ currentModule = "study", style }) {
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animation, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 90,
    }).start();
  }, [animation, expanded]);

  const railWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [70, 260],
  });

  const labelOpacity = animation.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0.25, 1],
  });

  function handleModulePress(module) {
    if (module.key === currentModule) {
      setExpanded(false);
      return;
    }

    Alert.alert("Module Link Pending", `${module.label} will be linked when that team finishes its screen.`);
  }

  return (
    <Animated.View style={[styles.shell, style, { width: railWidth }]}>
      <View style={styles.inner}>
        <Pressable style={styles.toggleButton} onPress={() => setExpanded((value) => !value)}>
          <Ionicons name={expanded ? "close" : "grid-outline"} size={22} color="#fff" />
          {expanded ? (
            <Animated.Text style={[styles.toggleText, { opacity: labelOpacity }]}>Campus Hub</Animated.Text>
          ) : null}
        </Pressable>

        <View style={styles.moduleList}>
          {MODULES.map((module) => {
            const active = module.key === currentModule;

            return (
              <Pressable
                key={module.key}
                style={[styles.moduleButton, active && styles.moduleButtonActive]}
                onPress={() => handleModulePress(module)}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons
                    name={module.icon}
                    size={20}
                    color={active ? theme.colors.primary : "#dbe7ff"}
                  />
                </View>
                {expanded ? (
                  <Animated.View style={[styles.labelWrap, { opacity: labelOpacity }]}>
                    <Text style={[styles.moduleLabel, active && styles.moduleLabelActive]} numberOfLines={2}>
                      {module.label}
                    </Text>
                    <Text style={styles.moduleMeta}>{active ? "Current module" : "Link coming soon"}</Text>
                  </Animated.View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 12,
    top: 18,
    bottom: 18,
    zIndex: 40,
  },
  inner: {
    flex: 1,
    backgroundColor: "#102a63",
    borderRadius: 28,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    ...theme.shadow.soft,
  },
  toggleButton: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: "#2157f2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  toggleText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  moduleList: {
    gap: 10,
  },
  moduleButton: {
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 10,
  },
  moduleButtonActive: {
    backgroundColor: "#fff",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  labelWrap: {
    flex: 1,
    paddingRight: 6,
  },
  moduleLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  moduleLabelActive: {
    color: theme.colors.text,
  },
  moduleMeta: {
    color: "#c8d4f0",
    fontSize: 11,
    marginTop: 3,
  },
});

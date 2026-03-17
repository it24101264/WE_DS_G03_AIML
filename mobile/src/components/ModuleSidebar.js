import React, { useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

const MODULES = [
  { key: "study", label: "Smart Study Support", icon: "bulb-outline" },
  { key: "lost-found", label: "Lost & Found", icon: "search-outline" },
  { key: "parking", label: "Parking Management", icon: "car-sport-outline" },
  { key: "marketplace", label: "Marketplace", icon: "storefront-outline" },
  { key: "food", label: "Food", icon: "restaurant-outline" },
];

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ModuleSidebar({ currentModule = "study", style }) {
  const [expanded, setExpanded] = useState(false);

  function toggleMenu() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  }

  function handleModulePress(module) {
    if (module.key === currentModule) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(false);
      return;
    }

    Alert.alert("Module Link Pending", `${module.label} will be linked when that team finishes its screen.`);
  }

  return (
    <View pointerEvents="box-none" style={[styles.shell, style]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandLabel}>Campus Hub</Text>
          <Text style={styles.brandMeta}>Modules</Text>
        </View>

        <Pressable style={styles.toggleButton} onPress={toggleMenu}>
          <Text style={styles.toggleText}>{expanded ? "Close" : "Menu"}</Text>
          <View style={[styles.iconRotation, expanded && styles.iconRotationExpanded]}>
            <Ionicons name={expanded ? "close" : "grid-outline"} size={18} color="#fff" />
          </View>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.panel}>
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
                  <View style={styles.labelWrap}>
                    <Text style={[styles.moduleLabel, active && styles.moduleLabelActive]} numberOfLines={2}>
                      {module.label}
                    </Text>
                    <Text style={[styles.moduleMeta, active && styles.moduleMetaActive]}>
                      {active ? "Current module" : "Link coming soon"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  topBar: {
    backgroundColor: "#102a63",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    ...theme.shadow.soft,
  },
  brandLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  brandMeta: {
    color: "#c8d4f0",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  toggleButton: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "#2157f2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  toggleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  iconRotation: {
    transform: [{ rotate: "0deg" }],
  },
  iconRotationExpanded: {
    transform: [{ rotate: "180deg" }],
  },
  panel: {
    marginTop: 10,
    backgroundColor: "#102a63",
    borderRadius: 24,
    padding: 12,
    zIndex: 39,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    ...theme.shadow.soft,
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
    paddingHorizontal: 10,
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
  moduleMetaActive: {
    color: theme.colors.textMuted,
  },
});

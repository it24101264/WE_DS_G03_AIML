import React, { useRef, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "./theme";

function formatDateTime(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const day = d.getDate();
  let hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${month} ${day}, ${hour}:${minute} ${meridiem}`;
}

/**
 * A single tappable button that opens a native date → time picker (two-step).
 *
 * Props:
 *   value      — current Date (or null)
 *   onChange   — (Date) => void   called after both date and time are confirmed
 *   label      — string shown above the value (default: "Date & Time")
 *   placeholder — string shown when no date selected
 *   minDate    — minimum selectable date (default: now)
 */
export default function SlotTimePicker({
  value,
  onChange,
  label = "Date & Time",
  placeholder = "Tap to select date and time",
  minDate,
}) {
  const [step, setStep] = useState("date");
  const [visible, setVisible] = useState(false);
  const pending = useRef(value instanceof Date ? value : value ? new Date(value) : new Date());

  function open() {
    pending.current = value instanceof Date ? value : value ? new Date(value) : new Date();
    setStep("date");
    setVisible(true);
  }

  function handleChange(event, selected) {
    if (event.type === "dismissed") {
      setVisible(false);
      return;
    }
    if (!selected) return;

    if (step === "date") {
      const next = new Date(selected);
      const prev = pending.current;
      next.setHours(prev.getHours() || 9, prev.getMinutes() || 0, 0, 0);
      pending.current = next;

      if (Platform.OS === "android") {
        setVisible(false);
        setStep("time");
        setTimeout(() => setVisible(true), 80);
      } else {
        setStep("time");
      }
    } else {
      const next = new Date(pending.current);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      pending.current = next;
      setVisible(false);
      setStep("date");
      onChange(next);
    }
  }

  const displayLabel = formatDateTime(value);
  const pickerValue = pending.current instanceof Date ? pending.current : new Date();
  const minDateValue = minDate instanceof Date ? minDate : new Date();

  const picker = visible ? (
    <DateTimePicker
      value={pickerValue}
      mode={step}
      display={Platform.OS === "ios" ? "spinner" : "default"}
      minimumDate={step === "date" ? minDateValue : undefined}
      onChange={handleChange}
      themeVariant="light"
    />
  ) : null;

  return (
    <View>
      <Pressable style={styles.btn} onPress={open}>
        <Text style={styles.icon}>📅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.labelText}>{label}</Text>
          <Text style={displayLabel ? styles.value : styles.placeholder}>
            {displayLabel || placeholder}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {Platform.OS === "ios" ? (
        <Modal transparent animationType="slide" visible={visible} onRequestClose={() => setVisible(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {step === "date" ? "Pick a Date" : "Pick a Time"}
                </Text>
                <Pressable onPress={() => setVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
              {picker}
              {step === "time" && (
                <Pressable
                  style={styles.confirmBtn}
                  onPress={() => {
                    setVisible(false);
                    setStep("date");
                    onChange(pending.current);
                  }}
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Modal>
      ) : picker}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f0f4ff",
  },
  icon: { fontSize: 20 },
  labelText: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "600", marginBottom: 2 },
  value: { color: theme.colors.primary, fontWeight: "800", fontSize: 15 },
  placeholder: { color: theme.colors.textMuted, fontSize: 14 },
  chevron: { color: theme.colors.primary, fontSize: 22, fontWeight: "300" },

  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetTitle: { fontWeight: "800", fontSize: 16, color: theme.colors.text },
  cancelText: { color: theme.colors.danger, fontWeight: "700" },
  confirmBtn: {
    margin: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 13,
  },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

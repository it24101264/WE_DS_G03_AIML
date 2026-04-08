// mobile/src/screens/PaymentScreen.js
// Navigate here with:
//   navigation.navigate("Payment", { request, post })
//
// Dependencies:
//   npx expo install react-native-webview

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { theme } from "../ui/theme";
import { api } from "../api";
import { API_BASE } from "../config";

const PAYHERE_CHECKOUT_URL = "https://sandbox.payhere.lk/pay/checkout";
// For production: https://www.payhere.lk/pay/checkout

function sanitizeForHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function PaymentScreen({ route, navigation, user }) {
  const { request = {}, post = {} } = route.params || {};
  const requestId = request?.id || request?._id || "";

  const [selectedMethod, setSelectedMethod] = useState(null); // "cod" | "payhere"
  const [loading, setLoading] = useState(false);
  const [webviewVisible, setWebviewVisible] = useState(false);
  const [webviewHtml, setWebviewHtml] = useState(null);
  const webviewRef = useRef(null);

  const amountNumber = Number(request?.negotiatedPrice || 0);
  const formattedAmount = Number.isFinite(amountNumber) ? amountNumber.toFixed(2) : "0.00";

  const handlePay = async () => {
    if (!selectedMethod) {
      Alert.alert("Select a payment method", "Please choose how you want to pay.");
      return;
    }
    if (selectedMethod === "payhere") await handlePayHere();
    if (selectedMethod === "cod") await handleCOD();
  };

  const handlePayHere = async () => {
    if (!requestId) {
      Alert.alert("Error", "Invalid request id.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.initiatePayment(requestId, "payhere");
      const payload = response?.data || response || {};
      const { hash, merchantId, orderId, amount, currency } = payload;

      if (!hash || !merchantId || !orderId || !amount || !currency) {
        throw new Error("Payment initialization response is incomplete.");
      }

      const nameParts = String(user?.name || "Buyer User").trim().split(" ");
      const firstName = sanitizeForHtml(nameParts[0] || "Buyer");
      const lastName = sanitizeForHtml(nameParts.slice(1).join(" ") || "User");
      const email = sanitizeForHtml(user?.email || "buyer@example.com");
      const phone = sanitizeForHtml(user?.phone || request?.buyerContact || "0700000000");
      const city = sanitizeForHtml(request?.pickupLocationName || "Colombo");
      const safeItemTitle = sanitizeForHtml(
        String(post?.title || "Marketplace Item").replace(/[^\w\s.-]/g, "").slice(0, 120)
      );

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body {
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: sans-serif;
                background: #f4f7ff;
              }
              p { color: #5f6c85; font-size: 14px; }
            </style>
          </head>
          <body onload="document.forms[0].submit()">
            <p>Redirecting to PayHere...</p>
            <form method="POST" action="${PAYHERE_CHECKOUT_URL}">
              <input type="hidden" name="merchant_id" value="${sanitizeForHtml(merchantId)}" />
              <input type="hidden" name="return_url" value="https://payment-result/success" />
              <input type="hidden" name="cancel_url" value="https://payment-result/cancel" />
              <input type="hidden" name="notify_url" value="${sanitizeForHtml(`${API_BASE}/payments/notify`)}" />
              <input type="hidden" name="order_id" value="${sanitizeForHtml(orderId)}" />
              <input type="hidden" name="items" value="${safeItemTitle}" />
              <input type="hidden" name="currency" value="${sanitizeForHtml(currency)}" />
              <input type="hidden" name="amount" value="${sanitizeForHtml(amount)}" />
              <input type="hidden" name="first_name" value="${firstName}" />
              <input type="hidden" name="last_name" value="${lastName}" />
              <input type="hidden" name="email" value="${email}" />
              <input type="hidden" name="phone" value="${phone}" />
              <input type="hidden" name="address" value="Sri Lanka" />
              <input type="hidden" name="city" value="${city}" />
              <input type="hidden" name="country" value="Sri Lanka" />
              <input type="hidden" name="hash" value="${sanitizeForHtml(hash)}" />
            </form>
          </body>
        </html>
      `;

      if (Platform.OS === "web" && typeof document !== "undefined") {
        // On web, submit directly in the same tab to avoid popup blockers.
        const form = document.createElement("form");
        form.method = "POST";
        form.action = PAYHERE_CHECKOUT_URL;

        const fields = {
          merchant_id: merchantId,
          return_url: "https://payment-result/success",
          cancel_url: "https://payment-result/cancel",
          notify_url: `${API_BASE}/payments/notify`,
          order_id: orderId,
          items: safeItemTitle,
          currency,
          amount,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          address: "Sri Lanka",
          city,
          country: "Sri Lanka",
          hash,
        };

        Object.entries(fields).forEach(([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = String(value ?? "");
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        setWebviewHtml(html);
        setWebviewVisible(true);
      }
    } catch (err) {
      Alert.alert("Error", err?.message || "Could not initialize payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewNav = (navState) => {
    const url = navState?.url || "";

    if (url.includes("payment-result/success")) {
      setWebviewVisible(false);
      navigation.replace("PaymentSuccess", { method: "payhere", request, post });
      return false;
    }

    if (url.includes("payment-result/cancel")) {
      setWebviewVisible(false);
      Alert.alert("Cancelled", "Payment was cancelled.");
      return false;
    }

    return true;
  };

  const handleCOD = () => {
    Alert.alert(
      "Confirm Cash on Delivery",
      `You will pay LKR ${formattedAmount} in cash when you pick up the item.\n\nPickup: ${
        request?.pickupLocationName || "Agreed location"
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            if (!requestId) {
              Alert.alert("Error", "Invalid request id.");
              return;
            }
            setLoading(true);
            try {
              await api.initiatePayment(requestId, "cod");
              navigation.replace("PaymentSuccess", { method: "cod", request, post });
            } catch (err) {
              Alert.alert("Error", err?.message || "Could not confirm. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Choose Payment Method</Text>
        <Text style={styles.subheading}>Complete your payment for this marketplace request</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {post?.title || "Marketplace Item"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pickup at</Text>
            <Text style={styles.summaryValue}>{request?.pickupLocationName || "Agreed location"}</Text>
          </View>

          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.amountValue}>LKR {formattedAmount}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Select Method</Text>

        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === "payhere" && styles.methodCardSelected]}
          onPress={() => setSelectedMethod("payhere")}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIcon, { backgroundColor: theme.colors.infoBg }]}>
              <Text style={styles.methodIconText}>💳</Text>
            </View>
            <View>
              <Text style={styles.methodName}>Card Payment</Text>
              <Text style={styles.methodDesc}>Visa, Mastercard via PayHere</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === "payhere" && styles.radioSelected]}>
            {selectedMethod === "payhere" && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === "cod" && styles.methodCardSelected]}
          onPress={() => setSelectedMethod("cod")}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIcon, { backgroundColor: theme.colors.successBg }]}>
              <Text style={styles.methodIconText}>💵</Text>
            </View>
            <View>
              <Text style={styles.methodName}>Cash on Delivery</Text>
              <Text style={styles.methodDesc}>Pay in cash at pickup</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === "cod" && styles.radioSelected]}>
            {selectedMethod === "cod" && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {selectedMethod === "cod" ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>💡 You agree to bring the exact amount in cash when collecting the item.</Text>
          </View>
        ) : null}

        {selectedMethod === "payhere" ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.infoBg }]}>
            <Text style={[styles.noticeText, { color: theme.colors.infoText }]}>
              🧪 Sandbox mode active. Use test card 4111 1111 1111 1111, any future expiry, CVV 123.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.payButton, (!selectedMethod || loading) && styles.payButtonDisabled]}
          onPress={handlePay}
          disabled={loading || !selectedMethod}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
              {selectedMethod === "cod"
                ? "Confirm Cash on Delivery"
                : selectedMethod === "payhere"
                ? `Pay LKR ${formattedAmount}`
                : "Select a Method to Continue"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureNote}>🔒 Payments are secure and encrypted</Text>
      </ScrollView>

      <Modal
        visible={webviewVisible}
        animationType="slide"
        onRequestClose={() => {
          setWebviewVisible(false);
          Alert.alert("Cancelled", "Payment was cancelled.");
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>PayHere Checkout</Text>
            <TouchableOpacity
              onPress={() => {
                setWebviewVisible(false);
                Alert.alert("Cancelled", "Payment was cancelled.");
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {webviewHtml ? (
            <WebView
              ref={webviewRef}
              originWhitelist={["*"]}
              source={{ html: webviewHtml }}
              onShouldStartLoadWithRequest={handleWebViewNav}
              onNavigationStateChange={handleWebViewNav}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.webviewLoaderText}>Loading PayHere...</Text>
                </View>
              )}
              style={{ flex: 1 }}
            />
          ) : (
            <View style={styles.webviewLoader}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },

  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.soft,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
    maxWidth: "55%",
    textAlign: "right",
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.primary,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },

  methodCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "transparent",
    ...theme.shadow.soft,
  },
  methodCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBg,
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  methodIcon: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  methodIconText: { fontSize: 22 },
  methodName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  methodDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  radioSelected: { borderColor: theme.colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },

  notice: {
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  noticeText: {
    fontSize: 13,
    color: theme.colors.warningText,
    lineHeight: 19,
  },

  payButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: theme.spacing.md,
    ...theme.shadow.soft,
  },
  payButtonDisabled: { backgroundColor: theme.colors.border },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secureNote: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.spacing.md,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.neutralBg,
    borderRadius: theme.radius.pill,
  },
  closeBtnText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  webviewLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  webviewLoaderText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});

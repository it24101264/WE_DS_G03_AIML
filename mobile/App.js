import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./src/api";
import { theme } from "./src/ui/theme";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AiToolsScreen from "./src/screens/AiToolsScreen";
import LostFoundCreateScreen from "./src/screens/LostFoundCreateScreen";
import LostFoundDetailScreen from "./src/screens/LostFoundDetailScreen";
import LostFoundAiSearchScreen from "./src/screens/LostFoundAiSearchScreen";
import LostFoundMyPostsScreen from "./src/screens/LostFoundMyPostsScreen";
import LostFoundScreen from "./src/screens/LostFoundScreen";
import MarketplaceBuyerScreen from "./src/screens/MarketplaceBuyerScreen";
import MarketplaceBuyerDetailScreen from "./src/screens/MarketplaceBuyerDetailScreen";
import MarketplaceBuyerRequestsScreen from "./src/screens/MarketplaceBuyerRequestsScreen";
import MarketplaceBuyerCartScreen from "./src/screens/MarketplaceBuyerCartScreen";
import MarketplaceChoiceScreen from "./src/screens/MarketplaceChoiceScreen";
import MarketplaceSellerDetailScreen from "./src/screens/MarketplaceSellerDetailScreen";
import MarketplaceSellerFormScreen from "./src/screens/MarketplaceSellerFormScreen";
import MarketplaceSellerHomeScreen from "./src/screens/MarketplaceSellerHomeScreen";
import MarketplaceSellerRequestsScreen from "./src/screens/MarketplaceSellerRequestsScreen";
import StudentScreen from "./src/screens/StudentScreen";
import RepScreen from "./src/screens/RepScreen";
import CanteenBottomTabs from "./src/screens/CanteenBottomTabs";
import ParkingScreen from "./src/screens/ParkingScreen";
import CanteenMenuScreen from "./src/screens/CanteenMenuScreen";
import { normalizeRole, ROLES } from "./src/constants/roles";
import StudyAreasScreen from "./src/screens/StudyAreasScreen";
import StudyAreaAdminScreen from "./src/screens/StudyAreaAdminScreen";
import StudyAreaDetailScreen from "./src/screens/StudyAreaDetailScreen";
// ── Payment screens ───────────────────────────────────────────────────────────
import PaymentScreen from "./src/screens/PaymentScreen";
import PaymentSuccessScreen from "./src/screens/PaymentSuccessScreen";

const Stack = createNativeStackNavigator();


const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizedRole = normalizeRole(user?.role);

  async function loadMe() {
    try {
      const res = await api.me();
      setUser(res.data || res.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);


  async function logout() {
    await AsyncStorage.removeItem("token");
    setUser(null);
  }

  if (loading) return null;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={
          !user
            ? "Login"
            : normalizedRole === ROLES.CANTEEN_OWNER
              ? "CanteenOwner"
              : normalizedRole === ROLES.ADMIN
                ? "StudyAreaAdmin"
                : "Home"
        }
        screenOptions={{
          headerTitleAlign: "left",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: "800", fontSize: 20 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
      
        {!user ? (
          <>
            <Stack.Screen name="Login" options={{ title: "Welcome" }}>
              {(props) => (
                <LoginScreen {...props} onLoggedIn={loadMe} />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Register"
              options={{ title: "Create Account" }}
              component={RegisterScreen}
            />
          </>
        ) : normalizedRole === ROLES.CANTEEN_OWNER ? (
          <>
            <Stack.Screen name="CanteenOwner" options={{ headerShown: false }}>
              {(props) => <CanteenBottomTabs {...props} user={user} onLogout={logout} />}
            </Stack.Screen>
          </>
        ) : normalizedRole === ROLES.ADMIN ? (
          <>
            <Stack.Screen name="StudyAreaAdmin" options={{ title: "Study Areas Admin" }}>
              {(props) => <StudyAreaAdminScreen {...props} user={user} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="StudyAreas" options={{ title: "Study Areas" }}>
              {(props) => <StudyAreasScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="StudyAreaDetail" options={{ title: "Study Area Details" }}>
              {(props) => <StudyAreaDetailScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Home" options={{ headerShown: false }}>
              {(props) => (
                <HomeScreen
                  {...props}
                  user={user}
                  normalizedRole={normalizedRole}
                  onLogout={logout}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="AiTools" options={{ title: "AI Tools" }}>
              {(props) => <AiToolsScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="CanteenOwner" options={{ headerShown: false }}>
              {(props) => <CanteenBottomTabs {...props} user={user} onLogout={logout} />}
            </Stack.Screen>

            <Stack.Screen name="Rep" options={{ title: "Rep Dashboard" }}>
              {(props) => <RepScreen {...props} user={user} onLogout={logout} />}
            </Stack.Screen>

            <Stack.Screen name="Student" options={{ title: "Smart Study Support" }}>
              {(props) => <StudentScreen {...props} user={user} onLogout={logout} />}
            </Stack.Screen>

            <Stack.Screen name="CanteenMenu" options={{ title: "Food Corner" }}>
              {(props) => <CanteenMenuScreen {...props} user={user} onLogout={logout} />}
            </Stack.Screen>

            <Stack.Screen name="Parking" options={{ title: "Parking" }}>
              {(props) => <ParkingScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="StudyAreas" options={{ title: "Study Areas" }}>
              {(props) => <StudyAreasScreen {...props} user={user} />}
            </Stack.Screen>
            
            <Stack.Screen name="StudyAreaDetail" options={{ title: "Study Area Details" }}>
              {(props) => <StudyAreaDetailScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="LostFound" options={{ title: "Lost and Found" }}>
              {(props) => <LostFoundScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="LostFoundCreate" options={{ title: "Create Post" }}>
              {(props) => <LostFoundCreateScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="LostFoundEdit" options={{ title: "Edit Post" }}>
              {(props) => <LostFoundCreateScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="LostFoundMyPosts" options={{ title: "My Posts" }}>
              {(props) => <LostFoundMyPostsScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="LostFoundAiSearch" options={{ title: "AI Search" }}>
              {(props) => <LostFoundAiSearchScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="LostFoundDetail" options={{ title: "Post Details" }}>
              {(props) => <LostFoundDetailScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceChoice" options={{ title: "Marketplace" }}>
              {(props) => <MarketplaceChoiceScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceSellerHome" options={{ title: "Seller Side" }}>
              {(props) => <MarketplaceSellerHomeScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceSellerForm" options={{ title: "Seller Post" }}>
              {(props) => <MarketplaceSellerFormScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceSellerDetail" options={{ title: "Seller Post Details" }}>
              {(props) => <MarketplaceSellerDetailScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceSellerRequests" options={{ title: "Seller Requests" }}>
              {(props) => <MarketplaceSellerRequestsScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceBuyerHome" options={{ title: "Buyer Side" }}>
              {(props) => <MarketplaceBuyerScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceBuyerDetail" options={{ title: "Item Details" }}>
              {(props) => <MarketplaceBuyerDetailScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="MarketplaceBuyerRequests" options={{ title: "My Requests" }}>
              {(props) => <MarketplaceBuyerRequestsScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="MarketplaceBuyerCart" options={{ title: "My Cart" }}>
              {(props) => <MarketplaceBuyerCartScreen {...props} user={user} />}
            </Stack.Screen>

            {/* ── Payment screens ─────────────────────────────────────────── */}
            <Stack.Screen name="Payment" options={{ title: "Payment" }}>
              {(props) => <PaymentScreen {...props} user={user} />}
            </Stack.Screen>

            <Stack.Screen name="PaymentSuccess" options={{ headerShown: false }}>
              {(props) => <PaymentSuccessScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

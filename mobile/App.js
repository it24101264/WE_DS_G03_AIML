import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./src/api";
import { theme } from "./src/ui/theme";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import KuppiScreen from "./src/screens/KuppiScreen";
import LostFoundScreen from "./src/screens/LostFoundScreen";
import LostFoundPostScreen from "./src/screens/LostFoundPostScreen";
import LostFoundMyItemsScreen from "./src/screens/LostFoundMyItemsScreen";
import LostFoundDetailScreen from "./src/screens/LostFoundDetailScreen";
import LostFoundEditScreen from "./src/screens/LostFoundEditScreen";
import RepScreen from "./src/screens/RepScreen";
import CanteenOwnerScreen from "./src/screens/CanteenOwnerScreen";
import ParkingScreen from "./src/screens/ParkingScreen";
import { normalizeRole, ROLES } from "./src/constants/roles";

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
        screenOptions={{
          headerTitleAlign: "left",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: "500", fontSize: 20 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" options={{ title: "Welcome" }}>
              {(props) => <LoginScreen {...props} onLoggedIn={loadMe} />}
            </Stack.Screen>
            <Stack.Screen name="Register" options={{ title: "Create Account" }} component={RegisterScreen} />
          </>
        ) : normalizedRole === ROLES.BATCH_REP ? (
          <>
            <Stack.Screen name="Rep" options={{ title: "Coordinator" }}>
              {(props) => <RepScreen {...props} user={user} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="Parking" options={{ title: "Parking" }}>
              {(props) => <ParkingScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        ) : normalizedRole === ROLES.CANTEEN_OWNER ? (
          <>
            <Stack.Screen name="CanteenOwner" options={{ title: "Canteen Owner" }}>
              {(props) => <CanteenOwnerScreen {...props} user={user} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="Parking" options={{ title: "Parking" }}>
              {(props) => <ParkingScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Home" options={{ title: "Home" }}>
              {(props) => <HomeScreen {...props} user={user} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="Kuppi" options={{ title: "Kuppi Sessions" }}>
              {(props) => <KuppiScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="LostFound" options={{ title: "Lost & Found" }}>
              {(props) => <LostFoundScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="LostFoundPost" options={{ title: "Post Item" }}>
              {(props) => <LostFoundPostScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="LostFoundMyItems" options={{ title: "My Items" }}>
              {(props) => <LostFoundMyItemsScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="LostFoundEdit" options={{ title: "Edit Item" }}>
              {(props) => <LostFoundEditScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="LostFoundDetail" options={{ title: "Item Details" }}>
              {(props) => <LostFoundDetailScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="Parking" options={{ title: "Parking" }}>
              {(props) => <ParkingScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

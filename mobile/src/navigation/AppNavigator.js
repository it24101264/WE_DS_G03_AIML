import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import StudentScreen from "../screens/StudentScreen";
import RepScreen from "../screens/RepScreen";
import CanteenBottomTabs from "../screens/CanteenBottomTabs";
import CanteenMenuScreen from "../screens/CanteenMenuScreen";
import ParkingScreen from "../screens/ParkingScreen";
import LostFoundScreen from "../screens/LostFoundScreen";
import LostFoundCreateScreen from "../screens/LostFoundCreateScreen";
import LostFoundMyPostsScreen from "../screens/LostFoundMyPostsScreen";
import LostFoundDetailScreen from "../screens/LostFoundDetailScreen";
import StudentStudyAreaScreen from "../screens/StudentStudyAreaScreen";
import StudyAreaDetailsScreen from "../screens/StudyAreaDetailsScreen";
import AdminStudyAreaScreen from "../screens/AdminStudyAreaScreen";
import { api } from "../api";
import { normalizeRole } from "../constants/roles";
import { theme } from "../constants/theme";

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary
  }
};

export default function AppNavigator() {
  const [booting, setBooting] = React.useState(true);
  const [token, setToken] = React.useState("");
  const [user, setUser] = React.useState(null);

  const loadSession = React.useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem("token");
      if (!savedToken) {
        setToken("");
        setUser(null);
        return;
      }

      setToken(savedToken);
      const meRes = await api.me();
      const nextUser = meRes?.data || null;
      if (!nextUser) {
        await AsyncStorage.removeItem("token");
        setToken("");
        setUser(null);
        return;
      }

      setUser(nextUser);
    } catch (_error) {
      await AsyncStorage.removeItem("token");
      setToken("");
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  React.useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleLogout = React.useCallback(async () => {
    await AsyncStorage.removeItem("token");
    setToken("");
    setUser(null);
  }, []);

  const normalizedRole = normalizeRole(user?.role);

  if (booting) {
    return null;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: "left",
          headerStyle: {
            backgroundColor: theme.colors.surface
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: "800"
          },
          contentStyle: {
            backgroundColor: theme.colors.bg
          }
        }}
      >
        {!token || !user ? (
          <>
            <Stack.Screen
              name="Login"
              options={{ headerShown: false }}
            >
              {(props) => <LoginScreen {...props} onLoggedIn={loadSession} />}
            </Stack.Screen>
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: "Create Account" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              options={{ title: "Home", headerShown: false }}
            >
              {(props) => (
                <HomeScreen
                  {...props}
                  user={user}
                  normalizedRole={normalizedRole}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Student"
              options={{ title: "Student Dashboard" }}
            >
              {(props) => <StudentScreen {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen
              name="Rep"
              options={{ title: "Batch Rep Dashboard" }}
            >
              {(props) => <RepScreen {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen
              name="CanteenOwner"
              options={{ title: "Canteen Owner" }}
            >
              {(props) => <CanteenBottomTabs {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen
              name="CanteenMenu"
              options={{ title: "Food Corner" }}
            >
              {(props) => <CanteenMenuScreen {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen
              name="Parking"
              options={{ title: "Parking" }}
            >
              {(props) => <ParkingScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen
              name="LostFound"
              options={{ title: "Lost and Found" }}
            >
              {(props) => <LostFoundScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen
              name="LostFoundCreate"
              options={{ title: "Create Post" }}
            >
              {(props) => <LostFoundCreateScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen
              name="LostFoundEdit"
              options={{ title: "Edit Post" }}
            >
              {(props) => <LostFoundCreateScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen
              name="LostFoundMyPosts"
              options={{ title: "My Posts" }}
            >
              {(props) => <LostFoundMyPostsScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen
              name="LostFoundDetail"
              options={{ title: "Post Details" }}
            >
              {(props) => <LostFoundDetailScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen
              name="StudentStudyAreas"
              component={StudentStudyAreaScreen}
              options={{ title: "Study Areas" }}
            />
            <Stack.Screen
              name="StudyAreaDetails"
              component={StudyAreaDetailsScreen}
              options={{ title: "Study Area Details" }}
            />
            <Stack.Screen
              name="AdminStudyAreas"
              component={AdminStudyAreaScreen}
              options={{ title: "Manage Study Areas" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
import React from "react";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return <AppNavigator />;
}
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
        initialRouteName={!user ? "Login" : normalizedRole === ROLES.CANTEEN_OWNER ? "CanteenOwner" : "Home"}
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

            <Stack.Screen name="LostFoundDetail" options={{ title: "Post Details" }}>
              {(props) => <LostFoundDetailScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

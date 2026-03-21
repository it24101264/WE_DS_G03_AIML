import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import StudentStudyAreaScreen from "../screens/StudentStudyAreaScreen";
import StudyAreaDetailsScreen from "../screens/StudyAreaDetailsScreen";
import AdminStudyAreaScreen from "../screens/AdminStudyAreaScreen";
import { theme } from "../constants/theme";

const Stack = createNativeStackNavigator();

// Change this value when you want to test admin or student
const TEST_ROLE = "student"; // use "admin" or "student"

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
        {TEST_ROLE === "student" ? (
          <>
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
          </>
        ) : (
          <Stack.Screen
            name="AdminStudyAreas"
            component={AdminStudyAreaScreen}
            options={{ title: "Manage Study Areas" }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
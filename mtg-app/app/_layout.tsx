// app/_layout.tsx
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar, View } from "react-native";

export default function RootLayoutWrapper() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}

function RootLayout() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Mana: require("../assets/fonts/Mana.ttf"),
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#fff" }} />;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff" } }}>
        {user ? (
          // connecté → onglets
          <Stack.Screen name="(tabs)" />
        ) : (
          // pas connecté → login
          <Stack.Screen name="(auth)/login" />
        )}
      </Stack>
      <StatusBar barStyle="dark-content" />
    </ThemeProvider>
  );
}

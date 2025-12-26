// app/_layout.tsx
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // ⚡ Charger la police Mana
  const [fontsLoaded] = useFonts({
    Mana: require('../assets/fonts/Mana.ttf'), // ajuste le chemin si besoin
  });

  // Si la font n'est pas encore chargée, afficher un écran vide (ou splash)
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Écran principal : tes onglets */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Écran modal */}
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Modal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* ============================
   TYPES
============================ */
type CommanderCard = {
  name: string;
  type_line: string;
  color_identity?: string[];
  image_uris?: { normal: string };
};

type GradientColors = readonly [string, string, ...string[]];

/* ============================
   CONSTANTES
============================ */
const COLORS = [
  { code: "W" },
  { code: "U" },
  { code: "B" },
  { code: "R" },
  { code: "G" },
  { code: "C" }, // incolore
  { code: "P" }, // Phyrexian
] as const;

const MANA_FONT_MAP: Record<string, string> = {
  W: "\ue600",
  U: "\ue601",
  B: "\ue602",
  R: "\ue603",
  G: "\ue604",
  C: "\ue904",
  P: "\ue618",
};

const COLOR_MAP: Record<string, string> = {
  W: "#fef9e7",
  U: "#d0e8ff",
  B: "#d3d3d3",
  R: "#ffd6d6",
  G: "#d6ffd6",
  C: "#f0f0f0",
  P: "#d9d9ff",
};

const DEFAULT_GRADIENT: GradientColors = ["#f6f4ff", "#e0d7ff"];

/* ============================
   HELPERS
============================ */
const getGradientColors = (colors?: string[]): GradientColors => {
  if (!colors || colors.length === 0) return DEFAULT_GRADIENT;
  const mapped = colors.map((c) => COLOR_MAP[c] ?? DEFAULT_GRADIENT[0]);
  return mapped.length === 1 ? [mapped[0], mapped[0]] : (mapped as unknown as GradientColors);
};

// Exact match des couleurs
const buildScryfallQuery = (selectedColors: string[]) => {
  let query = "is:commander";
  if (selectedColors.length > 0) {
    query += ` ci=${selectedColors.join("")}`;
  }
  return query;
};

/* ============================
   COMPONENT
============================ */
export default function HomeScreen() {
  const [card, setCard] = useState<CommanderCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const getRandomCommander = async () => {
    try {
      setLoading(true);
      setError(null);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);

      const query = buildScryfallQuery(selectedColors);
      const response = await fetch(
        `https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error();
      const data = await response.json();

      setCard({
        name: data.name,
        type_line: data.type_line,
        color_identity: data.color_identity,
        image_uris: data.image_uris,
      });
    } catch {
      setError("Impossible de tirer un commandant avec ce filtre");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!card) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [card]);

  const currentGradient: GradientColors = card
    ? getGradientColors(card.color_identity)
    : DEFAULT_GRADIENT;

  return (
    <LinearGradient colors={currentGradient} style={styles.safe}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>✨Random Commander✨</Text>

          <GradientButton
            colors={currentGradient}
            label={showFilters ? "Masquer les filtres" : "Afficher les filtres"}
            onPress={() => setShowFilters((p) => !p)}
          />

          {showFilters && (
            <View style={styles.colorFilter}>
              {COLORS.map((c) => {
                const selected = selectedColors.includes(c.code);
                return (
                  <LinearGradient
                    key={c.code}
                    colors={getGradientColors([c.code])}
                    style={[styles.colorButton, { borderWidth: selected ? 2 : 1, borderColor: "#000" }]}
                  >
                    <Pressable onPress={() => toggleColor(c.code)} style={styles.colorPressable}>
                      <Text style={styles.manaIcon}>{MANA_FONT_MAP[c.code]}</Text>
                    </Pressable>
                  </LinearGradient>
                );
              })}
            </View>
          )}

          <GradientButton
            colors={currentGradient}
            label="Tirer un commandant"
            onPress={getRandomCommander}
            disabled={loading}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          {card && (
            <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.cardBackground}>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={styles.cardType}>{card.type_line}</Text>
                {card.image_uris?.normal && <Image source={{ uri: card.image_uris.normal }} style={styles.image} />}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ============================
   BOUTON GRADIENT
============================ */
function GradientButton({ colors, label, onPress, disabled }: { colors: GradientColors; label: string; onPress: () => void; disabled?: boolean; }) {
  return (
    <LinearGradient colors={colors} style={styles.bigButton}>
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.bigButtonPressable, pressed && { opacity: 0.8 }]}>
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
    </LinearGradient>
  );
}

/* ============================
   STYLES
============================ */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { alignItems: "center", padding: 20 },
  title: { fontSize: 26, fontWeight: "700", marginTop: 20, color: "#111" },

  bigButton: { borderRadius: 999, borderWidth: 1, borderColor: "#000", marginTop: 10, width: 220 },
  bigButtonPressable: { paddingVertical: 14, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#111" },

  colorFilter: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  colorButton: { borderRadius: 12, margin: 6, width: 60, height: 60, justifyContent: "center" },
  colorPressable: { flex: 1, justifyContent: "center", alignItems: "center" },
  manaIcon: { fontFamily: "Mana", fontSize: 32, color: "#111" },

  cardContainer: { marginTop: 30 },
  cardBackground: { borderRadius: 20, padding: 15, alignItems: "center", width: 260, backgroundColor: "#fff" },
  cardName: { fontSize: 20, fontWeight: "700", color: "#111" },
  cardType: { fontSize: 13, marginBottom: 10, color: "#111" },
  image: { width: 240, height: 340, resizeMode: "contain", borderRadius: 12 },

  error: { color: "#e63946", marginTop: 20, textAlign: "center" },
});

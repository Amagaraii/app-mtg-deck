import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import CommanderCardView from "@/src/components/CommanderCardView";
import { COLORS, DEFAULT_GRADIENT, MANA_FONT_MAP } from "@/src/constants/colors";
import { getPartner, getRandomCommander, Lang } from "@/src/services/scryfall";
import { CommanderCard } from "@/src/types/commander";
import { getGradientColors } from "@/src/utils/gradient";

type GradientColors = readonly [string, string, ...string[]];

const TEXTS = {
  fr: {
    title: "✨ Commandant aléatoire ✨",
    showFilters: "Afficher les filtres",
    hideFilters: "Masquer les filtres",
    draw: "Tirer un commandant",
    language: "Langue : Français",
  },
  en: {
    title: "✨ Random Commander ✨",
    showFilters: "Show filters",
    hideFilters: "Hide filters",
    draw: "Draw a commander",
    language: "Language: English",
  },
};

export default function HomeScreen() {
  const [card, setCard] = useState<CommanderCard | null>(null);
  const [partner, setPartner] = useState<CommanderCard | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");
  const t = TEXTS[lang];
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = partner ? Math.min(240, (screenWidth - 60) / 2) : 240;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const toggleColor = (c: string) =>
    setSelectedColors((p) =>
      p.includes(c) ? p.filter((x) => x !== c) : [...p, c]
    );

  const handleGetRandomCommander = async () => {
    try {
      setLoading(true);

      const data = await getRandomCommander(selectedColors, lang);
      const partnerCard = await getPartner(data, lang);
      setCard(data);
      setPartner(partnerCard);

      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const gradient: GradientColors = card
    ? getGradientColors(card.color_identity)
    : DEFAULT_GRADIENT;

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>{t.title}</Text>

          <GradientButton
            colors={gradient}
            label={t.language}
            onPress={() => setLang((l) => (l === "fr" ? "en" : "fr"))}
          />

          <GradientButton
            colors={gradient}
            label={showFilters ? t.hideFilters : t.showFilters}
            onPress={() => setShowFilters((p) => !p)}
          />

          {showFilters && (
            <View style={styles.colorFilter}>
              {COLORS.map((c) => (
                <LinearGradient
                  key={c}
                  colors={getGradientColors([c])}
                  style={[
                    styles.colorButton,
                    { borderWidth: selectedColors.includes(c) ? 2 : 1 },
                  ]}
                >
                  <Pressable
                    style={styles.colorPressable}
                    onPress={() => toggleColor(c)}
                  >
                    <Text style={styles.manaIcon}>{MANA_FONT_MAP[c]}</Text>
                  </Pressable>
                </LinearGradient>
              ))}
            </View>
          )}

          <GradientButton
            colors={gradient}
            label={t.draw}
            onPress={handleGetRandomCommander}
            disabled={loading}
          />

          {card && (
            <Animated.View
              style={[
                styles.cardsRow,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              <CommanderCardView key={card.id} card={card} width={cardWidth} />
              {partner && (
                <CommanderCardView
                  key={partner.id}
                  card={partner}
                  width={cardWidth}
                />
              )}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function GradientButton({
  colors,
  label,
  onPress,
  disabled,
}: {
  colors: GradientColors;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <LinearGradient colors={colors} style={styles.bigButton}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={styles.bigButtonPressable}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#111", marginTop: 20 },

  bigButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#000",
    width: 220,
    marginTop: 10,
  },
  bigButtonPressable: { paddingVertical: 14, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#111" },

  colorFilter: { flexDirection: "row", flexWrap: "wrap" },
  colorButton: {
    width: 60,
    height: 60,
    margin: 6,
    borderRadius: 12,
    borderColor: "#000",
  },
  colorPressable: { flex: 1, justifyContent: "center", alignItems: "center" },
  manaIcon: { fontFamily: "Mana", fontSize: 32, color: "#111" },

  cardsRow: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
});
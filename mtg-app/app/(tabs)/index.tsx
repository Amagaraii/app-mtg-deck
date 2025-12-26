import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
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

import { COLORS, DEFAULT_GRADIENT, MANA_FONT_MAP } from "@/src/constants/colors";
import { getRandomCommander } from "@/src/services/scryfall";
import { CommanderCard } from "@/src/types/commander";
import { openEdhrec } from "@/src/utils/edhrec";
import { getGradientColors } from "@/src/utils/gradient";

type GradientColors = readonly [string, string, ...string[]];

export default function HomeScreen() {
  const [card, setCard] = useState<CommanderCard | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  const toggleColor = (c: string) =>
    setSelectedColors((p) =>
      p.includes(c) ? p.filter((x) => x !== c) : [...p, c]
    );

  const handleGetRandomCommander = async () => {
    try {
      setLoading(true);
      setIsFlipped(false);
      flipAnim.setValue(0);

      const data = await getRandomCommander(selectedColors);
      setCard(data);

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
    } finally {
      setLoading(false);
    }
  };

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const gradient: GradientColors = card
    ? getGradientColors(card.color_identity)
    : DEFAULT_GRADIENT;

  const isDoubleFaced = card?.card_faces?.length === 2;

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>✨ Random Commander ✨</Text>

          <GradientButton
            colors={gradient}
            label={showFilters ? "Masquer les filtres" : "Afficher les filtres"}
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
                    {
                      borderWidth: selectedColors.includes(c) ? 2 : 1,
                    },
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
            label="Tirer un commandant"
            onPress={handleGetRandomCommander}
            disabled={loading}
          />

          {card && (
            <Pressable onPress={() => openEdhrec(card)}>
              <Animated.View
                style={[
                  styles.cardWrapper,
                  { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                ]}
              >
                <View style={styles.flipContainer}>
                  <Animated.View
                    style={[
                      styles.cardFace,
                      { transform: [{ rotateY: frontRotate }] },
                    ]}
                  >
                    <Image
                      source={{
                        uri:
                          card.image_uris?.normal ??
                          card.card_faces?.[0]?.image_uris?.normal,
                      }}
                      style={styles.image}
                    />
                  </Animated.View>

                  {isDoubleFaced && (
                    <Animated.View
                      style={[
                        styles.cardFace,
                        styles.cardBack,
                        { transform: [{ rotateY: backRotate }] },
                      ]}
                    >
                      <Image
                        source={{
                          uri: card.card_faces?.[1]?.image_uris?.normal,
                        }}
                        style={styles.image}
                      />
                    </Animated.View>
                  )}
                </View>

                {isDoubleFaced && (
                  <Pressable style={styles.flipButton} onPress={flipCard}>
                    <Text style={styles.flipText}>↺</Text>
                  </Pressable>
                )}
              </Animated.View>
            </Pressable>
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

  cardWrapper: { marginTop: 30, alignItems: "center" },

  flipContainer: { width: 240, height: 340 },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  cardBack: { transform: [{ rotateY: "180deg" }] },

  image: { width: "100%", height: "100%", resizeMode: "contain", borderRadius: 16 },

  flipButton: {
    marginTop: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  flipText: { color: "#fff", fontSize: 18 },
});

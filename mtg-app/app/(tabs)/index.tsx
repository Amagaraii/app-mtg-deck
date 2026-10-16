import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import CommanderCardView from "@/src/components/CommanderCardView";
import { COLORS, DEFAULT_GRADIENT, MANA_FONT_MAP } from "@/src/constants/colors";
import { useAuth } from "@/src/context/AuthContext";
import { getCollection } from "@/src/services/collection";
import {
  getCardByName,
  getPartner,
  getRandomCommander,
  Lang,
} from "@/src/services/scryfall";
import { CommanderCard } from "@/src/types/commander";
import { getGradientColors } from "@/src/utils/gradient";

type GradientColors = readonly [string, string, ...string[]];

const TEXTS = {
  fr: {
    title: "Commandant aléatoire",
    subtitle: "Tire ton prochain commandant au hasard",
    collectionOnly: "Ma collection uniquement",
    collectionHint: "Tirer parmi les cartes que tu possèdes",
    duosOnly: "Uniquement les duos",
    duosHint: "Commandants avec un partenaire imposé",
    duosDisabled: "Indisponible avec ta collection",
    colors: "Couleurs",
    clear: "Effacer",
    draw: "Tirer un commandant",
    noResult: "Aucun commandant trouvé avec ces filtres.",
    emptyCollection: "Ta collection est vide.",
    noMatchCollection: "Aucune carte de ta collection ne correspond à ces couleurs.",
  },
  en: {
    title: "Random Commander",
    subtitle: "Draw your next commander at random",
    collectionOnly: "My collection only",
    collectionHint: "Draw from the cards you own",
    duosOnly: "Partner pairs only",
    duosHint: "Commanders with a fixed partner",
    duosDisabled: "Unavailable with your collection",
    colors: "Colors",
    clear: "Clear",
    draw: "Draw a commander",
    noResult: "No commander found with these filters.",
    emptyCollection: "Your collection is empty.",
    noMatchCollection: "No card in your collection matches these colors.",
  },
};

const sameColors = (a: string[], b: string[]) =>
  [...a].sort().join("") === [...b].sort().join("");

export default function HomeScreen() {
  const { user } = useAuth();
  const [card, setCard] = useState<CommanderCard | null>(null);
  const [partner, setPartner] = useState<CommanderCard | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [collectionOnly, setCollectionOnly] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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
      setErrorMsg("");

      let shown: CommanderCard;
      let full: CommanderCard;

      if (collectionOnly) {
        if (!user) return;
        const all = await getCollection(user.id);
        if (all.length === 0) {
          setErrorMsg(t.emptyCollection);
          return;
        }
        const pool = selectedColors.length
          ? all.filter((c) => sameColors(c.color_identity ?? [], selectedColors))
          : all;
        if (pool.length === 0) {
          setErrorMsg(t.noMatchCollection);
          return;
        }
        shown = pool[Math.floor(Math.random() * pool.length)];
        // Anciennes cartes sans mots-clés : on récupère la fiche complète
        full =
          shown.keywords !== undefined
            ? shown
            : (await getCardByName(shown.name)) ?? shown;
      } else {
        shown = await getRandomCommander(selectedColors, lang, partnerOnly);
        full = shown;
      }

      const partnerCard = await getPartner(full, lang);
      setCard(shown);
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
      setErrorMsg(t.noResult);
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
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.langSwitch}>
              {(["fr", "en"] as Lang[]).map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLang(l)}
                  style={[styles.langOption, lang === l && styles.langActive]}
                >
                  <Text
                    style={[styles.langText, lang === l && styles.langTextActive]}
                  >
                    {l.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          {/* Panneau de réglages */}
          <View style={styles.panel}>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.label}>{t.collectionOnly}</Text>
                <Text style={styles.hint}>{t.collectionHint}</Text>
              </View>
              <Switch
                value={collectionOnly}
                onValueChange={setCollectionOnly}
                trackColor={{ false: "rgba(0,0,0,0.25)", true: "#111" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.divider} />

            <View style={[styles.row, collectionOnly && { opacity: 0.45 }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.label}>{t.duosOnly}</Text>
                <Text style={styles.hint}>
                  {collectionOnly ? t.duosDisabled : t.duosHint}
                </Text>
              </View>
              <Switch
                value={partnerOnly && !collectionOnly}
                onValueChange={setPartnerOnly}
                disabled={collectionOnly}
                trackColor={{ false: "rgba(0,0,0,0.25)", true: "#111" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.divider} />

            <Pressable
              style={styles.row}
              onPress={() => setShowFilters((p) => !p)}
            >
              <Text style={styles.label}>{t.colors}</Text>
              <View style={styles.rowRight}>
                {selectedColors.length > 0 && (
                  <Pressable onPress={() => setSelectedColors([])}>
                    <Text style={styles.clearText}>{t.clear}</Text>
                  </Pressable>
                )}
                <Text style={styles.chevron}>{showFilters ? "▲" : "▼"}</Text>
              </View>
            </Pressable>

            {showFilters && (
              <View style={styles.colorFilter}>
                {COLORS.map((c) => {
                  const selected = selectedColors.includes(c);
                  return (
                    <LinearGradient
                      key={c}
                      colors={getGradientColors([c])}
                      style={[
                        styles.colorButton,
                        selected ? styles.colorSelected : styles.colorUnselected,
                      ]}
                    >
                      <Pressable
                        style={styles.colorPressable}
                        onPress={() => toggleColor(c)}
                      >
                        <Text style={styles.manaIcon}>{MANA_FONT_MAP[c]}</Text>
                      </Pressable>
                    </LinearGradient>
                  );
                })}
              </View>
            )}
          </View>

          {/* Bouton de tirage */}
          <Pressable
            onPress={handleGetRandomCommander}
            disabled={loading}
            style={[styles.drawButton, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.drawText}>{t.draw}</Text>
            )}
          </Pressable>

          {errorMsg !== "" && <Text style={styles.errorText}>{errorMsg}</Text>}

          {/* Cartes */}
          {card && (
            <Animated.View
              style={[
                styles.cardsRow,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              <CommanderCardView
                key={`main-${card.id}`}
                card={card}
                width={cardWidth}
              />
              {partner && (
                <CommanderCardView
                  key={`partner-${partner.id}`}
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

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20, paddingBottom: 50 },

  header: { width: "100%", maxWidth: 420, alignItems: "center", marginTop: 10 },
  langSwitch: {
    alignSelf: "flex-end",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  langOption: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  langActive: { backgroundColor: "#111" },
  langText: { fontSize: 13, fontWeight: "700", color: "#111" },
  langTextActive: { color: "#fff" },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111",
    marginTop: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(0,0,0,0.65)",
    marginTop: 4,
    marginBottom: 18,
    textAlign: "center",
  },

  panel: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  label: { fontSize: 16, fontWeight: "700", color: "#111" },
  hint: { fontSize: 12, color: "rgba(0,0,0,0.6)", marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 14,
  },
  clearText: { fontSize: 13, fontWeight: "600", color: "#7a0000" },
  chevron: { fontSize: 12, color: "#111" },

  colorFilter: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  colorButton: { width: 54, height: 54, borderRadius: 27, borderColor: "#111" },
  colorSelected: { borderWidth: 3, transform: [{ scale: 1.12 }], opacity: 1 },
  colorUnselected: { borderWidth: 1, opacity: 0.55 },
  colorPressable: { flex: 1, justifyContent: "center", alignItems: "center" },
  manaIcon: { fontFamily: "Mana", fontSize: 28, color: "#111" },

  drawButton: {
    width: "100%",
    maxWidth: 420,
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
  },
  drawText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  errorText: { marginTop: 16, fontSize: 15, color: "#7a0000", textAlign: "center" },

  cardsRow: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 12,
  },
});
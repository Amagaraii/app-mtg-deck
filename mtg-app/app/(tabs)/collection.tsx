import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { DEFAULT_GRADIENT } from "@/src/constants/colors";
import { useAuth } from "@/src/context/AuthContext";
import {
  addToCollection,
  changeQuantity,
  getCollection,
  removeFromCollection,
} from "@/src/services/collection";
import { searchCards } from "@/src/services/scryfall";
import { CollectionCard } from "@/src/types/collection";
import { CommanderCard } from "@/src/types/commander";
import { openEdhrec } from "@/src/utils/edhrec";

const GROUP_ORDER = [
  "Creature",
  "Planeswalker",
  "Battle",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Land",
  "Other",
];

const LABELS: Record<string, string> = {
  Creature: "Créatures",
  Planeswalker: "Planeswalkers",
  Battle: "Batailles",
  Instant: "Éphémères",
  Sorcery: "Rituels",
  Artifact: "Artefacts",
  Enchantment: "Enchantements",
  Land: "Terrains",
  Other: "Autres",
};

const imageHeaders = {
  "User-Agent": "MTG-Deck-App/1.0",
  Accept: "image/*",
};

// On classe selon la FACE AVANT (aventures, cartes à double face...)
const frontType = (c: CommanderCard) =>
  c.card_faces?.[0]?.type_line ?? (c.type_line ?? "").split("//")[0];

const groupOf = (c: CommanderCard) => {
  const t = frontType(c);
  if (t.includes("Land")) return "Land";
  for (const g of [
    "Creature",
    "Planeswalker",
    "Battle",
    "Instant",
    "Sorcery",
    "Artifact",
    "Enchantment",
  ]) {
    if (t.includes(g)) return g;
  }
  return "Other";
};

const imageOf = (c: CommanderCard) =>
  c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal;

// Miniature légère pour la grille
const small = (url?: string) => url?.replace("/normal/", "/small/");

const edhrecSection = (c: CommanderCard): "commanders" | "cards" => {
  const t = frontType(c);
  return t.includes("Legendary") && t.includes("Creature")
    ? "commanders"
    : "cards";
};

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const GAP = 8;
const PAD = 12;

export default function CollectionScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();

  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommanderCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const chipsRef = useRef<ScrollView>(null);
  const chipsX = useRef(0);

  const toggleType = (k: string) =>
    setSelectedTypes((p) =>
      p.includes(k) ? p.filter((x) => x !== k) : [...p, k]
    );

  const scrollChips = (dir: number) =>
    chipsRef.current?.scrollTo({
      x: Math.max(0, chipsX.current + dir * 220),
      animated: true,
    });

  // Dimensions de la grille
  const contentW = Math.min(width, 960);
  const cols = contentW < 520 ? 3 : contentW < 760 ? 4 : 6;
  const cardW = (contentW - PAD * 2 - GAP * (cols - 1)) / cols;
  const cardH = (cardW * 680) / 488;

  useFocusEffect(
    useCallback(() => {
      if (user) getCollection(user.id).then(setCards);
    }, [user])
  );

  const copies = useMemo(
    () => cards.reduce((sum, c) => sum + c.quantity, 0),
    [cards]
  );
  const ownedNames = useMemo(() => new Set(cards.map((c) => c.name)), [cards]);
  const selected = cards.find((c) => c.name === selectedName) ?? null;

  // Filtre par texte (nom ou type)
  const textFiltered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.type_line ?? "").toLowerCase().includes(q)
    );
  }, [cards, filter]);

  // Un seul passage : regroupe par type et compte les commandants
  const { buckets, commanderCount } = useMemo(() => {
    const b: Record<string, CollectionCard[]> = {};
    let cmd = 0;
    for (const c of textFiltered) {
      const g = groupOf(c);
      if (!b[g]) b[g] = [];
      b[g].push(c);
      if (c.commander) cmd++;
    }
    return { buckets: b, commanderCount: cmd };
  }, [textFiltered]);

  const sections = useMemo(() => {
    return GROUP_ORDER.filter((g) => buckets[g]?.length).flatMap((g) => {
      let data = buckets[g];
      if (selectedTypes.length > 0) {
        const byType = selectedTypes.includes(g);
        const byCommander = selectedTypes.includes("commander");
        data = data.filter((c) => byType || (byCommander && c.commander));
      }
      if (data.length === 0) return [];
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      return [
        {
          key: g,
          title: LABELS[g],
          count: sorted.length,
          data: collapsed[g] ? [] : chunk(sorted, cols),
        },
      ];
    });
  }, [buckets, selectedTypes, collapsed, cols]);

  const chips = [
    { key: "commander", label: `Commandants (${commanderCount})` },
    ...GROUP_ORDER.filter((g) => buckets[g]?.length).map((g) => ({
      key: g,
      label: `${LABELS[g]} (${buckets[g].length})`,
    })),
  ];

  const runSearch = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      setResults(await searchCards(query));
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setSearched(true);
      setSearching(false);
    }
  };

  const add = async (c: CommanderCard) => {
    if (!user) return;
    setCards(await addToCollection(user.id, c, true));
  };

  const change = async (name: string, delta: number) => {
    if (!user) return;
    setCards(await changeQuantity(user.id, name, delta));
  };

  const remove = async (name: string) => {
    if (!user) return;
    setCards(await removeFromCollection(user.id, name));
    setSelectedName(null);
  };

  return (
    <LinearGradient colors={DEFAULT_GRADIENT} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Barre fixe */}
        <View style={styles.topBar}>
          <View style={[styles.topInner, { width: contentW }]}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Ma collection</Text>
                <Text style={styles.subtitle}>
                  {cards.length} carte{cards.length > 1 ? "s" : ""} · {copies}{" "}
                  exemplaire{copies > 1 ? "s" : ""}
                </Text>
              </View>
              <Pressable onPress={() => setShowAdd(true)} style={styles.addPill}>
                <Text style={styles.addPillText}>＋ Ajouter</Text>
              </Pressable>
              <Pressable onPress={signOut} style={styles.ghostPill}>
                <Text style={styles.ghostPillText}>Déconnexion</Text>
              </Pressable>
            </View>

            <TextInput
              placeholder="Rechercher dans ma collection (nom ou type)"
              value={filter}
              onChangeText={setFilter}
              style={styles.search}
            />

            <View style={styles.chipsRow}>
              {Platform.OS === "web" && (
                <Pressable onPress={() => scrollChips(-1)} style={styles.arrowBtn}>
                  <Text style={styles.arrowText}>◀</Text>
                </Pressable>
              )}

              <ScrollView
                ref={chipsRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                onScroll={(e) => {
                  chipsX.current = e.nativeEvent.contentOffset.x;
                }}
                style={{ flex: 1 }}
                {...(Platform.OS === "web"
                  ? ({
                      onWheel: (e: any) => {
                        chipsRef.current?.scrollTo({
                          x: chipsX.current + e.deltaY + e.deltaX,
                          animated: false,
                        });
                      },
                    } as any)
                  : {})}
              >
                <Pressable
                  onPress={() => setSelectedTypes([])}
                  style={[
                    styles.chip,
                    selectedTypes.length === 0 && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedTypes.length === 0 && styles.chipTextActive,
                    ]}
                  >
                    Toutes ({textFiltered.length})
                  </Text>
                </Pressable>

                {chips.map((ch) => {
                  const active = selectedTypes.includes(ch.key);
                  return (
                    <Pressable
                      key={ch.key}
                      onPress={() => toggleType(ch.key)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}
                      >
                        {active ? "✓ " : ""}
                        {ch.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {Platform.OS === "web" && (
                <Pressable onPress={() => scrollChips(1)} style={styles.arrowBtn}>
                  <Text style={styles.arrowText}>▶</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Grille */}
        <SectionList
          sections={sections}
          keyExtractor={(row) => row[0].name}
          renderItem={({ item: row }) => (
            <View style={[styles.gridRow, { width: contentW }]}>
              {row.map((c) => (
                <Pressable
                  key={c.name}
                  onPress={() => setSelectedName(c.name)}
                  style={{ width: cardW }}
                >
                  <Image
                    source={{ uri: small(imageOf(c)), headers: imageHeaders }}
                    style={{ width: cardW, height: cardH, borderRadius: 6 }}
                    contentFit="cover"
                  />
                  {c.quantity > 1 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>×{c.quantity}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <Pressable
              onPress={() =>
                setCollapsed((p) => ({ ...p, [section.key]: !p[section.key] }))
              }
              style={[styles.sectionHeader, { width: contentW - PAD * 2 }]}
            >
              <Text style={styles.sectionTitle}>
                {section.title} ({section.count})
              </Text>
              <Text style={styles.sectionChevron}>
                {collapsed[section.key] ? "▶" : "▼"}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {cards.length === 0
                ? "Ta collection est vide. Ajoute une carte avec le bouton « Ajouter », ou ouvre un deck dans l'onglet Decks pour l'ajouter d'un clic."
                : "Aucune carte ne correspond à ces filtres."}
            </Text>
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled
          initialNumToRender={12}
          windowSize={7}
        />
      </SafeAreaView>

      {/* Fiche d'une carte */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedName(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelectedName(null)}>
          {selected && (
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Image
                source={{ uri: imageOf(selected), headers: imageHeaders }}
                style={{
                  width: Math.min(260, width - 100),
                  height: (Math.min(260, width - 100) * 680) / 488,
                  borderRadius: 12,
                }}
                contentFit="cover"
              />
              <Text style={styles.sheetName} numberOfLines={2}>
                {selected.name}
              </Text>
              <Text style={styles.sheetType} numberOfLines={2}>
                {selected.type_line}
              </Text>

              <View style={styles.sheetStepper}>
                <Pressable
                  onPress={() => change(selected.name, -1)}
                  style={styles.sheetStepBtn}
                >
                  <Text style={styles.sheetStepText}>−</Text>
                </Pressable>
                <Text style={styles.sheetQty}>×{selected.quantity}</Text>
                <Pressable
                  onPress={() => change(selected.name, 1)}
                  style={styles.sheetStepBtn}
                >
                  <Text style={styles.sheetStepText}>＋</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => openEdhrec(selected, edhrecSection(selected))}
                style={styles.sheetBtn}
              >
                <Text style={styles.sheetBtnText}>Voir sur EDHREC</Text>
              </Pressable>
              <Pressable
                onPress={() => remove(selected.name)}
                style={styles.sheetDelete}
              >
                <Text style={styles.sheetDeleteText}>
                  Retirer de ma collection
                </Text>
              </Pressable>
              <Pressable onPress={() => setSelectedName(null)}>
                <Text style={styles.sheetClose}>Fermer</Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      {/* Ajout par recherche */}
      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.addSheet}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { flex: 1, fontSize: 20 }]}>
                Ajouter une carte
              </Text>
              <Pressable onPress={() => setShowAdd(false)} style={styles.ghostPill}>
                <Text style={styles.ghostPillText}>Fermer</Text>
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                placeholder="Nom du commandant (FR ou EN)"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={runSearch}
                returnKeyType="search"
                style={[styles.search, { flex: 1, marginTop: 0 }]}
              />
              <Pressable
                onPress={runSearch}
                disabled={searching}
                style={styles.searchBtn}
              >
                {searching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.searchBtnText}>Chercher</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.hint}>
              Pour ajouter un deck entier, ouvre-le dans l&apos;onglet Decks.
            </Text>

            <ScrollView
              contentContainerStyle={styles.resultGrid}
              keyboardShouldPersistTaps="handled"
            >
              {searched && results.length === 0 && (
                <Text style={styles.noResult}>Aucun résultat.</Text>
              )}
              {results.map((c) => {
                const isOwned = ownedNames.has(c.name);
                return (
                  <View key={c.id} style={styles.resultItem}>
                    <Image
                      source={{ uri: imageOf(c), headers: imageHeaders }}
                      style={styles.resultImage}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => !isOwned && add(c)}
                      style={[styles.resultBtn, isOwned && styles.resultBtnOwned]}
                    >
                      <Text
                        style={[
                          styles.resultBtnText,
                          isOwned && { color: "#fff" },
                        ]}
                      >
                        {isOwned ? "✓ Ajoutée" : "＋ Ajouter"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  topInner: { paddingHorizontal: PAD, paddingTop: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 12, color: "rgba(0,0,0,0.6)", marginTop: 2 },

  addPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#111",
  },
  addPillText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  ghostPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
  },
  ghostPillText: { color: "#111", fontSize: 12, fontWeight: "700" },

  search: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  chipsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: { fontSize: 11, color: "#111" },
  chips: { gap: 8, paddingVertical: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  chipActive: { backgroundColor: "#111" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#111" },
  chipTextActive: { color: "#fff" },

  list: { alignItems: "center", paddingBottom: 60 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: GAP,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  sectionChevron: { fontSize: 12, color: "#111" },

  gridRow: {
    flexDirection: "row",
    gap: GAP,
    paddingHorizontal: PAD,
    marginBottom: GAP,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#111",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  empty: {
    marginTop: 40,
    paddingHorizontal: 30,
    fontSize: 15,
    color: "rgba(0,0,0,0.7)",
    textAlign: "center",
    maxWidth: 360,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    width: "88%",
    maxWidth: 380,
  },
  sheetName: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  sheetType: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(0,0,0,0.6)",
    textAlign: "center",
  },
  sheetStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 14,
  },
  sheetStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetStepText: { fontSize: 20, fontWeight: "700", color: "#111" },
  sheetQty: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    minWidth: 50,
    textAlign: "center",
  },
  sheetBtn: {
    marginTop: 14,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
  },
  sheetBtnText: { color: "#fff", fontWeight: "700" },
  sheetDelete: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#7a0000",
    alignItems: "center",
  },
  sheetDeleteText: { color: "#7a0000", fontWeight: "700" },
  sheetClose: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(0,0,0,0.6)",
  },

  addSheet: {
    width: "100%",
    height: "88%",
    marginTop: "auto",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxWidth: 560,
  },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  searchBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 92,
  },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  hint: { marginTop: 10, fontSize: 12, color: "rgba(0,0,0,0.55)" },
  noResult: { marginTop: 16, color: "rgba(0,0,0,0.65)" },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingTop: 14,
    paddingBottom: 30,
  },
  resultItem: { alignItems: "center" },
  resultImage: { width: 110, height: (110 * 680) / 488, borderRadius: 8 },
  resultBtn: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
  },
  resultBtnOwned: { backgroundColor: "#111" },
  resultBtnText: { fontSize: 12, fontWeight: "700", color: "#111" },
});
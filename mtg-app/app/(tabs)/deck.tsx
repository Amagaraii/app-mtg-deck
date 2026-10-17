import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { DEFAULT_GRADIENT } from "@/src/constants/colors";
import { useAuth } from "@/src/context/AuthContext";
import { addDeckToCollection } from "@/src/services/collection";
import {
  deleteDeck,
  getDecks,
  importDeck,
  isTokenCard,
} from "@/src/services/deck";
import { CommanderCard } from "@/src/types/commander";
import { Board, Deck, DeckEntry } from "@/src/types/deck";
import { openEdhrec } from "@/src/utils/edhrec";
import { getGradientColors } from "@/src/utils/gradient";

type GradientColors = readonly [string, string, ...string[]];

const ORDER = [
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

const frontType = (card: CommanderCard) =>
  card.card_faces?.[0]?.type_line ?? (card.type_line ?? "").split("//")[0];

// On classe selon la FACE AVANT (aventures, cartes à double face...)
const groupOf = (card: CommanderCard) => {
  const t = frontType(card);
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

const count = (entries: DeckEntry[]) =>
  entries.reduce((sum, e) => sum + e.quantity, 0);

// Les jetons ont leur propre zone, même dans les anciens decks importés
const kindOf = (e: DeckEntry): Board => {
  if (e.board === "commander") return "commander";
  if (isTokenCard(e.card)) return "token";
  if (e.board === "token") return "main"; // ancien classement par catégorie
  return e.board;
};

const edhrecSection = (c: CommanderCard): "commanders" | "cards" => {
  const t = frontType(c);
  return t.includes("Legendary") && t.includes("Creature")
    ? "commanders"
    : "cards";
};

const imageHeaders = {
  "User-Agent": "MTG-Deck-App/1.0",
  Accept: "image/*",
};

const GAP = 8;
const PAD = 12;

export default function DecksScreen() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selected, setSelected] = useState<Deck | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (user) getDecks(user.id).then(setDecks);
    }, [user])
  );

  const handleImport = async () => {
    if (!user) return;
    if (!text.trim()) {
      setError("Colle d'abord la liste de cartes.");
      return;
    }
    try {
      setImporting(true);
      setError("");
      const deck = await importDeck(user.id, text, name);
      setDecks(await getDecks(user.id));
      setText("");
      setName("");
      setShowImport(false);
      setSelected(deck);
    } catch (e: any) {
      setError(e.message ?? "Import impossible.");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDecks(await deleteDeck(user.id, id));
    setSelected(null);
  };

  if (selected) {
    return (
      <DeckDetail
        deck={selected}
        onBack={() => setSelected(null)}
        onDelete={() => handleDelete(selected.id)}
      />
    );
  }

  return (
    <LinearGradient colors={DEFAULT_GRADIENT} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Mes decks</Text>
          <Text style={styles.subtitle}>
            {decks.length} deck{decks.length > 1 ? "s" : ""}
          </Text>

          <Pressable
            onPress={() => setShowImport((p) => !p)}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryText}>
              {showImport ? "Fermer" : "＋ Importer un deck"}
            </Text>
          </Pressable>

          {showImport && (
            <View style={styles.panel}>
              <Text style={styles.label}>Nom du deck (facultatif)</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex : Atraxa Superfriends"
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: 14 }]}>
                Liste de cartes
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={"1x Sol Ring\n1x Atraxa, Praetors' Voice\n..."}
                multiline
                numberOfLines={8}
                style={[styles.input, styles.textarea]}
              />

              {error !== "" && <Text style={styles.error}>{error}</Text>}

              <Pressable
                onPress={handleImport}
                disabled={importing}
                style={[styles.primaryBtn, importing && { opacity: 0.7 }]}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Importer</Text>
                )}
              </Pressable>
            </View>
          )}

          {decks.length === 0 && !showImport && (
            <Text style={styles.empty}>
              Aucun deck pour le moment. Importe ta première liste depuis
              Archidekt.
            </Text>
          )}

          {decks.map((d) => {
            const commander = d.entries.find((e) => kindOf(e) === "commander");
            const total = count(
              d.entries.filter(
                (e) => kindOf(e) === "commander" || kindOf(e) === "main"
              )
            );
            return (
              <Pressable
                key={d.id}
                onPress={() => setSelected(d)}
                style={styles.deckRow}
              >
                {commander ? (
                  <Image
                    source={{
                      uri: imageOf(commander.card),
                      headers: imageHeaders,
                    }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.deckName}>{d.name}</Text>
                  <Text style={styles.deckMeta}>
                    {total} carte{total > 1 ? "s" : ""}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function DeckDetail({
  deck,
  onBack,
  onDelete,
}: {
  deck: Deck;
  onBack: () => void;
  onDelete: () => void;
}) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [confirming, setConfirming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<DeckEntry | null>(null);

  // La grille remplit presque toute la largeur, avec une marge sur les côtés
  const contentW = Math.min(width, 960);
  const cols = contentW < 520 ? 3 : contentW < 760 ? 4 : 6;
  const cardW = (contentW - PAD * 2 - GAP * (cols - 1)) / cols;
  const cardH = (cardW * 680) / 488;
  const layout = { contentW, cardW, cardH };

  const commanders = deck.entries.filter((e) => kindOf(e) === "commander");
  const main = deck.entries.filter((e) => kindOf(e) === "main");
  const side = deck.entries.filter((e) => kindOf(e) === "side");
  const tokens = deck.entries.filter((e) => kindOf(e) === "token");

  const colors = [
    ...new Set(commanders.flatMap((e) => e.card.color_identity ?? [])),
  ];
  const gradient: GradientColors = commanders.length
    ? getGradientColors(colors)
    : DEFAULT_GRADIENT;

  const groups = ORDER.map((g) => ({
    key: g,
    items: main
      .filter((e) => groupOf(e.card) === g)
      .sort((a, b) => a.card.name.localeCompare(b.card.name)),
  })).filter((g) => g.items.length > 0);

  // Tout sauf les jetons
  const importable = deck.entries.filter((e) => kindOf(e) !== "token");
  const uniqueCount = new Set(importable.map((e) => e.card.name)).size;

  const addAll = async () => {
    if (!user) return;
    try {
      setAdding(true);
      const r = await addDeckToCollection(
        user.id,
        importable.map((e) => ({
          card: e.card,
          quantity: e.quantity,
          commander: kindOf(e) === "commander",
        }))
      );
      if (r.added === 0 && r.updated === 0) {
        setMessage("Rien de nouveau : tout est déjà dans ta collection.");
      } else {
        setMessage(
          `${r.added} nouvelle${r.added > 1 ? "s" : ""} carte${
            r.added > 1 ? "s" : ""
          } ajoutée${r.added > 1 ? "s" : ""}` +
            (r.updated ? `, ${r.updated} quantité(s) mise(s) à jour` : "") +
            ` · ${r.total} cartes dans ta collection`
        );
      }
    } catch (e) {
      console.error(e);
      setMessage("Ajout impossible, réessaie.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.detailContainer}>
          <View style={[styles.header, { width: contentW - PAD * 2 }]}>
            <View style={styles.topBar}>
              <Pressable onPress={onBack} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>← Retour</Text>
              </Pressable>
              {confirming ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={onDelete} style={styles.dangerBtn}>
                    <Text style={styles.dangerText}>Confirmer</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirming(false)}
                    style={styles.smallBtn}
                  >
                    <Text style={styles.smallBtnText}>Annuler</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setConfirming(true)}
                  style={styles.smallBtn}
                >
                  <Text style={[styles.smallBtnText, { color: "#7a0000" }]}>
                    Supprimer
                  </Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.title}>{deck.name}</Text>
            <Text style={[styles.subtitle, { textAlign: "center" }]}>
              {count([...commanders, ...main])} cartes
            </Text>

            <Pressable
              onPress={addAll}
              disabled={adding}
              style={[styles.addAllBtn, adding && { opacity: 0.7 }]}
            >
              {adding ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.addAllText}>
                  ＋ Ajouter les {uniqueCount} cartes à ma collection
                </Text>
              )}
            </Pressable>

            {message !== "" && (
              <View style={styles.info}>
                <Text style={styles.infoText}>{message}</Text>
              </View>
            )}

            {deck.notFound.length > 0 && (
              <View style={styles.warning}>
                <Text style={styles.warningText}>
                  Cartes non trouvées : {deck.notFound.join(", ")}
                </Text>
              </View>
            )}
          </View>

          {commanders.length > 0 && (
            <Section
              title="Commandant"
              entries={commanders}
              layout={layout}
              onSelect={setPreview}
            />
          )}
          {groups.map((g) => (
            <Section
              key={g.key}
              title={LABELS[g.key]}
              entries={g.items}
              layout={layout}
              onSelect={setPreview}
            />
          ))}
          {side.length > 0 && (
            <Section
              title="Réserve"
              entries={side}
              layout={layout}
              onSelect={setPreview}
            />
          )}
          {tokens.length > 0 && (
            <Section
              title="Jetons"
              entries={tokens}
              layout={layout}
              onSelect={setPreview}
            />
          )}
        </ScrollView>
      </SafeAreaView>

      {preview && (
        <CardPreview
          key={preview.card.id}
          entry={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </LinearGradient>
  );
}

function Section({
  title,
  entries,
  layout,
  onSelect,
}: {
  title: string;
  entries: DeckEntry[];
  layout: { contentW: number; cardW: number; cardH: number };
  onSelect: (e: DeckEntry) => void;
}) {
  return (
    <View style={{ width: layout.contentW, alignItems: "center" }}>
      <Text style={styles.sectionTitle}>
        {title} ({count(entries)})
      </Text>
      <View style={[styles.grid, { width: layout.contentW - PAD * 2 }]}>
        {entries.map((e) => (
          <Pressable
            key={`${e.board}-${e.card.id}`}
            onPress={() => onSelect(e)}
            style={{ width: layout.cardW }}
          >
            <Image
              source={{ uri: imageOf(e.card), headers: imageHeaders }}
              style={{
                width: layout.cardW,
                height: layout.cardH,
                borderRadius: 6,
              }}
              contentFit="cover"
            />
            {e.quantity > 1 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>×{e.quantity}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CardPreview({
  entry,
  onClose,
}: {
  entry: DeckEntry;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [back, setBack] = useState(false);

  const card = entry.card;
  const isDoubleFaced = card.card_faces?.length === 2;
  const uri =
    back && isDoubleFaced
      ? card.card_faces?.[1]?.image_uris?.normal
      : imageOf(card);

  const imgW = Math.min(300, width - 80);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Image
            source={{ uri, headers: imageHeaders }}
            style={{
              width: imgW,
              height: (imgW * 680) / 488,
              borderRadius: 14,
            }}
            contentFit="cover"
          />

          <Text style={styles.sheetName} numberOfLines={2}>
            {card.name}
          </Text>
          <Text style={styles.sheetType} numberOfLines={2}>
            {card.type_line}
            {entry.quantity > 1 ? `  ·  ×${entry.quantity}` : ""}
          </Text>

          {isDoubleFaced && (
            <Pressable onPress={() => setBack((b) => !b)} style={styles.flipBtn}>
              <Text style={styles.flipText}>↺ Retourner la carte</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => openEdhrec(card, edhrecSection(card))}
            style={styles.sheetBtn}
          >
            <Text style={styles.sheetBtnText}>Voir sur EDHREC</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={styles.sheetClose}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20, paddingBottom: 50 },
  detailContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 60,
  },
  header: { alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginTop: 10,
    textAlign: "center",
  },
  subtitle: { fontSize: 14, color: "rgba(0,0,0,0.65)", marginTop: 4 },

  primaryBtn: {
    marginTop: 16,
    width: "100%",
    maxWidth: 420,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  panel: {
    width: "100%",
    maxWidth: 420,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  label: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { minHeight: 150, textAlignVertical: "top" },
  error: { color: "#7a0000", marginTop: 10 },

  empty: {
    marginTop: 30,
    fontSize: 15,
    color: "rgba(0,0,0,0.7)",
    textAlign: "center",
    maxWidth: 320,
  },

  deckRow: {
    width: "100%",
    maxWidth: 420,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  thumb: { width: 56, height: 78, borderRadius: 6 },
  thumbEmpty: { backgroundColor: "rgba(0,0,0,0.15)" },
  deckName: { fontSize: 16, fontWeight: "700", color: "#111" },
  deckMeta: { fontSize: 13, color: "rgba(0,0,0,0.6)", marginTop: 2 },
  chevron: { fontSize: 26, color: "#111" },

  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  smallBtnText: { fontSize: 13, fontWeight: "700", color: "#111" },
  dangerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#7a0000",
  },
  dangerText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  addAllBtn: {
    marginTop: 14,
    width: "100%",
    maxWidth: 420,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
  },
  addAllText: { fontSize: 15, fontWeight: "700", color: "#111" },
  info: {
    marginTop: 12,
    maxWidth: 420,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  infoText: { fontSize: 13, color: "#111", textAlign: "center" },

  warning: {
    marginTop: 14,
    maxWidth: 420,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  warningText: { fontSize: 12, color: "#7a0000" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginTop: 26,
  },
  grid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
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

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    width: "90%",
    maxWidth: 400,
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
  flipBtn: {
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
  },
  flipText: { fontSize: 13, fontWeight: "700", color: "#111" },
  sheetBtn: {
    marginTop: 12,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
  },
  sheetBtnText: { color: "#fff", fontWeight: "700" },
  sheetClose: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(0,0,0,0.6)",
  },
});
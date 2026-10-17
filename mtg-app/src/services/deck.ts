import { getCardFuzzy, getCardsByNames } from "@/src/services/scryfall";
import { CommanderCard } from "@/src/types/commander";
import { Board, Deck, DeckEntry } from "@/src/types/deck";
import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (userId: string) => `DECKS_${userId}`;

type ParsedLine = { quantity: number; name: string; board: Board };

const SECTION =
  /^(?:\/\/\s*)?(commanders?|companion|sideboard|side|maybeboard|mainboard|main|deck|tokens?)\s*:?\s*$/i;

// Jeton ou emblème : seul le TYPE de la carte décide, jamais une catégorie
export const isTokenCard = (c: CommanderCard) =>
  c.layout === "token" ||
  c.layout === "double_faced_token" ||
  c.layout === "emblem" ||
  /\b(Token|Emblem)\b/.test(c.type_line ?? "");

// Transforme le texte collé en liste de { quantité, nom, zone }
export function parseDeckList(text: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let section: Board = "main";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const sec = line.match(SECTION);
    if (sec) {
      const s = sec[1].toLowerCase();
      section = s.startsWith("commander")
        ? "commander"
        : ["sideboard", "side", "maybeboard", "companion"].includes(s)
        ? "side"
        : "main"; // « Tokens » n'est qu'un titre : on revient sur le deck
      continue;
    }
    if (line.startsWith("//") || line.startsWith("#")) continue;

    let board: Board = section;
    let rest = line;
    const sb = rest.match(/^SB:\s*(.*)$/i);
    if (sb) {
      board = "side";
      rest = sb[1];
    }

    const m = rest.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!m) continue;

    const quantity = parseInt(m[1], 10);
    let name = m[2];

    // Catégories Archidekt entre crochets : seules Commander et Sideboard comptent
    const tags = [...name.matchAll(/\[([^\]]*)\]/g)].map((x) => x[1]);
    if (tags.some((t) => /commander/i.test(t))) board = "commander";
    else if (tags.some((t) => /sideboard|maybeboard/i.test(t))) board = "side";

    name = name
      .replace(/\*[A-Za-z]+\*/g, "") // *F* (foil)
      .replace(/\[[^\]]*\]/g, "") // [catégories]
      .replace(/\^[^^]*\^/g, "") // ^étiquettes^
      .replace(/\s*\([A-Za-z0-9]{2,6}\)\s*[\w★-]*\s*$/, "") // (c21) 263
      .trim();

    if (name) lines.push({ quantity, name, board });
  }

  return lines;
}

// On ne garde que le nécessaire pour afficher la carte
const slim = (c: CommanderCard): CommanderCard => ({
  id: c.id,
  name: c.name,
  layout: c.layout,
  type_line: c.type_line,
  color_identity: c.color_identity,
  image_uris: c.image_uris ? { normal: c.image_uris.normal } : undefined,
  card_faces: c.card_faces?.map((f) => ({
    name: f.name,
    type_line: f.type_line,
    image_uris: f.image_uris ? { normal: f.image_uris.normal } : undefined,
  })),
});

export async function getDecks(userId: string): Promise<Deck[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  return raw ? JSON.parse(raw) : [];
}

export async function importDeck(
  userId: string,
  text: string,
  name: string
): Promise<Deck> {
  const parsed = parseDeckList(text);
  if (parsed.length === 0) throw new Error("Aucune carte reconnue dans la liste.");

  const names = [...new Set(parsed.map((p) => p.name))];
  const found = await getCardsByNames(names);

  const byName = new Map<string, CommanderCard>();

  // 1) Noms complets d'abord : ils ont toujours priorité
  for (const c of found) byName.set(c.name.toLowerCase(), c);

  // 2) Noms de face (aventures, double face), sans jamais écraser un nom complet
  for (const c of found) {
    c.card_faces?.forEach((f) => {
      const k = f.name.toLowerCase();
      if (!byName.has(k)) byName.set(k, c);
    });
  }

  // 3) Seconde chance pour les noms encore introuvables
  const missing = names.filter((n) => !byName.has(n.toLowerCase()));
  for (const n of missing.slice(0, 20)) {
    const c = await getCardFuzzy(n);
    if (c) byName.set(n.toLowerCase(), c);
  }

  const merged = new Map<string, DeckEntry>();
  const notFound: string[] = [];

  for (const p of parsed) {
    const card = byName.get(p.name.toLowerCase());
    if (!card) {
      if (!notFound.includes(p.name)) notFound.push(p.name);
      continue;
    }
    // Un jeton est reconnu à son type, pas à sa catégorie
    const board: Board =
      isTokenCard(card) && p.board !== "commander" ? "token" : p.board;

    const k = `${board}|${card.id}`;
    const existing = merged.get(k);
    if (existing) existing.quantity += p.quantity;
    else merged.set(k, { quantity: p.quantity, board, card: slim(card) });
  }

  const entries = [...merged.values()];
  if (entries.length === 0) throw new Error("Aucune carte trouvée sur Scryfall.");

  const commanderNames = entries
    .filter((e) => e.board === "commander")
    .map((e) => e.card.name.split(",")[0]);

  const deck: Deck = {
    id: Date.now().toString(),
    name: name.trim() || commanderNames.join(" & ") || "Deck importé",
    createdAt: Date.now(),
    entries,
    notFound,
  };

  const list = await getDecks(userId);
  await AsyncStorage.setItem(key(userId), JSON.stringify([deck, ...list]));
  return deck;
}

export async function deleteDeck(userId: string, id: string): Promise<Deck[]> {
  const list = await getDecks(userId);
  const next = list.filter((d) => d.id !== id);
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}
import { CollectionCard } from "@/src/types/collection";
import { CommanderCard } from "@/src/types/commander";
import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (userId: string) => `COLLECTION_${userId}`;

export type NewCard = {
  card: CommanderCard;
  quantity: number;
  commander: boolean;
};

// On ne garde que le nécessaire pour afficher la carte
const slim = (c: CommanderCard): CommanderCard => ({
  id: c.id,
  name: c.name,
  layout: c.layout,
  type_line: c.type_line,
  oracle_text: c.oracle_text,
  keywords: c.keywords,
  all_parts: c.all_parts,
  color_identity: c.color_identity,
  image_uris: c.image_uris ? { normal: c.image_uris.normal } : undefined,
  card_faces: c.card_faces?.map((f) => ({
    name: f.name,
    type_line: f.type_line,
    oracle_text: f.oracle_text,
    image_uris: f.image_uris ? { normal: f.image_uris.normal } : undefined,
  })),
});

// Les anciennes cartes n'ont ni quantité ni indicateur : c'étaient des commandants
const normalize = (c: any): CollectionCard => ({
  ...c,
  quantity: c.quantity ?? 1,
  commander: c.commander ?? true,
});

const save = async (userId: string, list: CollectionCard[]) => {
  await AsyncStorage.setItem(key(userId), JSON.stringify(list));
  return list;
};

export async function getCollection(userId: string): Promise<CollectionCard[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  return raw ? JSON.parse(raw).map(normalize) : [];
}

// Ajout d'une seule carte (recherche). On compare par NOM.
export async function addToCollection(
  userId: string,
  card: CommanderCard,
  commander = true
): Promise<CollectionCard[]> {
  const list = await getCollection(userId);
  const existing = list.find((c) => c.name === card.name);

  if (existing) {
    if (commander && !existing.commander) {
      existing.commander = true;
      return save(userId, list);
    }
    return list;
  }
  return save(userId, [{ ...slim(card), quantity: 1, commander }, ...list]);
}

export async function removeFromCollection(
  userId: string,
  name: string
): Promise<CollectionCard[]> {
  const list = await getCollection(userId);
  return save(
    userId,
    list.filter((c) => c.name !== name)
  );
}

// +1 / −1 ; à 0, la carte est retirée
export async function changeQuantity(
  userId: string,
  name: string,
  delta: number
): Promise<CollectionCard[]> {
  const list = await getCollection(userId);
  const next: CollectionCard[] = [];
  for (const c of list) {
    if (c.name !== name) {
      next.push(c);
      continue;
    }
    const quantity = c.quantity + delta;
    if (quantity > 0) next.push({ ...c, quantity });
  }
  return save(userId, next);
}

// Ajoute toutes les cartes d'un deck en une seule écriture
export async function addDeckToCollection(userId: string, items: NewCard[]) {
  const list = await getCollection(userId);
  const byName = new Map<string, CollectionCard>(
    list.map((c) => [c.name, c] as [string, CollectionCard])
  );

  let added = 0;
  let updated = 0;

  for (const it of items) {
    const existing = byName.get(it.card.name);
    if (existing) {
      const quantity = Math.max(existing.quantity, it.quantity);
      const commander = existing.commander || it.commander;
      if (quantity !== existing.quantity || commander !== existing.commander) {
        existing.quantity = quantity;
        existing.commander = commander;
        updated++;
      }
    } else {
      const created: CollectionCard = {
        ...slim(it.card),
        quantity: it.quantity,
        commander: it.commander,
      };
      list.push(created);
      byName.set(created.name, created);
      added++;
    }
  }

  await save(userId, list);
  return { added, updated, total: list.length };
}
import { CommanderCard } from "@/src/types/commander";
import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (userId: string) => `COLLECTION_${userId}`;

// On ne garde que le nécessaire pour afficher la carte
const slim = (c: CommanderCard): CommanderCard => ({
  id: c.id,
  name: c.name,
  type_line: c.type_line,
  oracle_text: c.oracle_text,
  keywords: c.keywords,
  all_parts: c.all_parts,
  color_identity: c.color_identity,
  image_uris: c.image_uris ? { normal: c.image_uris.normal } : undefined,
  card_faces: c.card_faces?.map((f) => ({
    name: f.name,
    oracle_text: f.oracle_text,
    image_uris: f.image_uris ? { normal: f.image_uris.normal } : undefined,
  })),
});

export async function getCollection(userId: string): Promise<CommanderCard[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  return raw ? JSON.parse(raw) : [];
}

// On compare par NOM : la version FR et EN d'une carte ne comptent qu'une fois
export async function addToCollection(
  userId: string,
  card: CommanderCard
): Promise<CommanderCard[]> {
  const list = await getCollection(userId);
  if (list.some((c) => c.name === card.name)) return list;
  const next = [slim(card), ...list];
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export async function removeFromCollection(
  userId: string,
  name: string
): Promise<CommanderCard[]> {
  const list = await getCollection(userId);
  const next = list.filter((c) => c.name !== name);
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}
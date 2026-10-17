import { CommanderCard } from "@/src/types/commander";
import { Linking } from "react-native";

const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // retire virgules, apostrophes, etc.
    .trim()
    .replace(/\s+/g, "-");

export const openEdhrec = (
  card: CommanderCard,
  section?: "commanders" | "cards"
) => {
  const frontName = card.card_faces?.[0]?.name ?? card.name;
  const slug = slugify(frontName);

  // Par défaut : page commandant, sauf pour les Backgrounds
  const isBackground = card.type_line?.includes("Background");
  const target = section ?? (isBackground ? "cards" : "commanders");

  Linking.openURL(`https://edhrec.com/${target}/${slug}`);
};
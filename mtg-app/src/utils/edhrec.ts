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

export const openEdhrec = (card: CommanderCard) => {
  const frontName = card.card_faces?.[0]?.name ?? card.name;
  const slug = slugify(frontName);

  // Les Backgrounds ne sont pas des commandants : page « carte »
  const isBackground = card.type_line?.includes("Background");
  const section = isBackground ? "cards" : "commanders";

  Linking.openURL(`https://edhrec.com/${section}/${slug}`);
};
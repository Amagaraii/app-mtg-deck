import { CommanderCard } from "@/src/types/commander";
import { Linking } from "react-native";

export const openEdhrec = (card: CommanderCard) => {
  const frontName = card.card_faces?.[0]?.name ?? card.name;
  const slug = frontName.toLowerCase().replace(/,/g, "").replace(/'/g, "").replace(/\s+/g, "-");
  Linking.openURL(`https://edhrec.com/commanders/${slug}`);
};

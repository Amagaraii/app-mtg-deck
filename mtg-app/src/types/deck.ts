import { CommanderCard } from "@/src/types/commander";

export type Board = "commander" | "main" | "side";

export type DeckEntry = {
  quantity: number;
  board: Board;
  card: CommanderCard;
};

export type Deck = {
  id: string;
  name: string;
  createdAt: number;
  entries: DeckEntry[];
  notFound: string[];
};
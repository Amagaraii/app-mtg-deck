import { CommanderCard } from "@/src/types/commander";

export type CollectionCard = CommanderCard & {
  quantity: number;
  commander: boolean;
};
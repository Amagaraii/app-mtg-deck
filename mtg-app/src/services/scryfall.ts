import { CommanderCard } from "@/src/types/commander";

export type Lang = "en" | "fr";

export const buildQuery = (colors: string[], lang: Lang = "en") => {
  const base = colors.length
    ? `is:commander ci=${colors.join("")}`
    : "is:commander";
  return lang === "en" ? base : `${base} lang:${lang}`;
};

const fetchRandom = async (query: string) =>
  fetch(
    `https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`
  );

export const getRandomCommander = async (
  colors: string[],
  lang: Lang = "en"
): Promise<CommanderCard> => {
  let res = await fetchRandom(buildQuery(colors, lang));

  // Aucun résultat dans cette langue : on retente en anglais
  if (!res.ok && lang !== "en") {
    res = await fetchRandom(buildQuery(colors, "en"));
  }

  if (!res.ok) throw new Error("Aucun commandant trouvé");
  return await res.json();
};

export const getPartner = async (
  card: CommanderCard,
  lang: Lang = "en"
): Promise<CommanderCard | null> => {
  if (!card.keywords?.includes("Partner with")) return null;

  const part = card.all_parts?.find(
    (p) => p.component === "combo_piece" && p.id !== card.id
  );
  if (!part) return null;

  // On cherche d'abord la version dans la langue demandée
  if (lang !== "en") {
    const search = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
        `!"${part.name}" lang:${lang}`
      )}`
    );
    if (search.ok) {
      const json = await search.json();
      if (json.data?.length) return json.data[0];
    }
  }

  // Sinon, version anglaise
  const res = await fetch(part.uri);
  if (!res.ok) return null;
  return await res.json();
};
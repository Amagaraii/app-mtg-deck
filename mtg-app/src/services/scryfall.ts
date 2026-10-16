import { CommanderCard } from "@/src/types/commander";

export type Lang = "en" | "fr";

let lastCall = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Toutes les requêtes passent par ici : espacement + nouvel essai
const scryfallFetch = async (url: string, retries = 1): Promise<Response> => {
  const wait = Math.max(0, lastCall + 150 - Date.now());
  if (wait) await sleep(wait);
  lastCall = Date.now();

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 429 && retries > 0) {
      await sleep(1500);
      return scryfallFetch(url, retries - 1);
    }
    return res;
  } catch (e) {
    // Sur le web, un 429 arrive ici comme une erreur réseau
    if (retries > 0) {
      await sleep(1500);
      return scryfallFetch(url, retries - 1);
    }
    throw e;
  }
};

export const buildQuery = (
  colors: string[],
  lang: Lang = "en",
  partnerOnly = false
) => {
  const ci = colors.length ? ` ci=${colors.join("")}` : "";

  let q: string;
  if (partnerOnly) {
    q =
      `(is:commander${ci} (keyword:"partner with" OR keyword:partner` +
      ` OR keyword:"friends forever" OR keyword:"choose a background"` +
      ` OR keyword:"doctor's companion" OR type:"time lord doctor"))` +
      ` OR (type:background${ci})`;
  } else {
    q = `is:commander${ci}`;
  }

  if (lang !== "en") q = `(${q}) lang:${lang}`;
  return q;
};

const fetchRandom = (query: string) =>
  scryfallFetch(
    `https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`
  );

const fetchOne = async (
  query: string,
  lang: Lang
): Promise<CommanderCard | null> => {
  if (lang !== "en") {
    const res = await fetchRandom(`${query} lang:${lang}`);
    if (res.ok) return await res.json();
  }
  const res = await fetchRandom(query);
  return res.ok ? await res.json() : null;
};

export const getRandomCommander = async (
  colors: string[],
  lang: Lang = "en",
  partnerOnly = false
): Promise<CommanderCard> => {
  let res = await fetchRandom(buildQuery(colors, lang, partnerOnly));

  // Aucun résultat dans cette langue : on retente en anglais
  if (!res.ok && lang !== "en") {
    res = await fetchRandom(buildQuery(colors, "en", partnerOnly));
  }

  if (!res.ok) throw new Error("Aucun commandant trouvé");
  return await res.json();
};

export const getPartner = async (
  card: CommanderCard,
  lang: Lang = "en"
): Promise<CommanderCard | null> => {
  const kw = (card.keywords ?? []).map((k) => k.toLowerCase());
  const has = (k: string) => kw.includes(k.toLowerCase());
  const text = card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? "";
  const typeLine = card.type_line ?? "";
  const notSelf = `-!"${card.name}"`;
  let partner: CommanderCard | null = null;

  // 1) « Partner with » : partenaire imposé
  if (has("Partner with")) {
    const part = card.all_parts?.find(
      (p) => p.component === "combo_piece" && p.name !== card.name
    );
    if (!part) return null;

    if (lang !== "en") {
      const search = await scryfallFetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
          `!"${part.name}" lang:${lang}`
        )}`
      );
      if (search.ok) {
        const json = await search.json();
        if (json.data?.length) partner = json.data[0];
      }
    }
    if (!partner) {
      const res = await scryfallFetch(part.uri);
      if (res.ok) partner = await res.json();
    }
  }
  // 2) « Partner » (générique ou restreint)
  else if (has("Partner")) {
    const restricted = text.match(/Partner—([^\n(]+)/);
    const base = restricted
      ? `is:commander o:"Partner—${restricted[1].trim()}"`
      : 'is:commander keyword:partner -keyword:"partner with" -o:"Partner—"';
    partner = await fetchOne(`${base} ${notSelf}`, lang);
  }
  // 3) « Friends forever »
  else if (has("Friends forever")) {
    partner = await fetchOne(
      `is:commander keyword:"friends forever" ${notSelf}`,
      lang
    );
  }
  // 4) « Choose a Background » → un Background (sans is:commander !)
  else if (has("Choose a Background") || /choose a background/i.test(text)) {
    partner = await fetchOne("type:background", lang);
  }
  // 5) Un Background → un commandant « Choose a Background »
  else if (typeLine.includes("Background")) {
    partner = await fetchOne(
      'is:commander keyword:"choose a background"',
      lang
    );
  }
  // 6) « Doctor's companion » → un Doctor
  else if (has("Doctor's companion")) {
    partner = await fetchOne('is:commander type:"time lord doctor"', lang);
  }
  // 7) Un Doctor → un commandant « Doctor's companion »
  else if (typeLine.includes("Time Lord Doctor")) {
    partner = await fetchOne(
      'is:commander keyword:"doctor\'s companion"',
      lang
    );
  }

  // Sécurité : jamais la même carte que le commandant
  if (!partner || partner.name === card.name) return null;
  return partner;
};
export const buildQuery = (colors: string[]) =>
  colors.length ? `is:commander ci=${colors.join("")}` : "is:commander";

export const getRandomCommander = async (colors: string[]) => {
  const res = await fetch(`https://api.scryfall.com/cards/random?q=${encodeURIComponent(buildQuery(colors))}`);
  return await res.json();
};

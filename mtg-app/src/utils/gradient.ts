import { COLOR_MAP, DEFAULT_GRADIENT } from "@/src/constants/colors";

type GradientColors = [string, string, ...string[]];

export const getGradientColors = (colors?: string[]): GradientColors => {
  if (!colors || colors.length === 0) return DEFAULT_GRADIENT;
  const mapped = colors.map((c) => COLOR_MAP[c] ?? DEFAULT_GRADIENT[0]);
  return mapped.length === 1
    ? [mapped[0], mapped[0]] as const
    : mapped as [string, string, ...string[]]; // <-- assure au moins 2 éléments
};

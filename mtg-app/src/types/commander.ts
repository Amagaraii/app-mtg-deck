export type CommanderCard = {
  id: string;
  name: string;
  lang?: string;
  set?: string;
  collector_number?: string;
  type_line: string;
  oracle_text?: string;
  color_identity?: string[];
  keywords?: string[];
  image_uris?: { normal: string };
  card_faces?: {
    name: string;
    oracle_text?: string;
    image_uris?: { normal: string };
  }[];
  all_parts?: {
    id: string;
    component: string;
    name: string;
    uri: string;
  }[];
};
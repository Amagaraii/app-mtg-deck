export type CommanderCard = {
  name: string;
  type_line: string;
  color_identity?: string[];
  image_uris?: { normal: string };
  card_faces?: {
    name: string;
    image_uris?: { normal: string };
  }[];
};

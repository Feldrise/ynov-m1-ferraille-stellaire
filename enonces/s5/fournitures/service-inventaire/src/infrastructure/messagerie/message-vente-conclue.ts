import { z } from "zod";
import type { VenteConclue } from "../../domain/vente-conclue.ts";

// Le message de la Vente conclue, tel que le publie le Service Bourse, validé à la frontière comme le corps d'une
// requête HTTP : un message mal formé est refusé ici, il n'atteint pas le use case.
const MessageVenteConclue = z.object({
  type: z.literal("VenteConclue"),
  annonceId: z.string().min(1),
  objetId: z.string().min(1),
  vendeurId: z.string().min(1),
  acheteurId: z.string().min(1),
  concluLe: z.iso.datetime(),
});

export class MessageIllisible extends Error {
  constructor(detail: string) {
    super(`Message de Vente conclue illisible : ${detail}`);
    this.name = new.target.name;
  }
}

export function lireLaVenteConclue(contenu: Buffer): VenteConclue {
  let json: unknown;
  try {
    json = JSON.parse(contenu.toString("utf8"));
  } catch {
    throw new MessageIllisible("ce n'est pas du JSON");
  }
  const lu = MessageVenteConclue.safeParse(json);
  if (!lu.success) {
    throw new MessageIllisible(lu.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; "));
  }
  const { annonceId, objetId, vendeurId, acheteurId, concluLe } = lu.data;
  return { annonceId, objetId, vendeurId, acheteurId, concluLe: new Date(concluLe) };
}

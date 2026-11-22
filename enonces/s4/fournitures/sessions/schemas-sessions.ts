import { z } from "zod";

// Les objets de transfert des sessions. Le refresh token n'y figure pas : il voyage dans un cookie httpOnly,
// que le JavaScript d'une page ne lit pas.

export const CorpsOuvertureDeSession = z
  .object({
    pseudo: z.string().min(1).max(64).meta({ description: "Le pseudo du Joueur" }),
    motDePasse: z.string().min(1).max(200).meta({ description: "Son mot de passe" }),
  })
  .meta({ examples: [{ pseudo: "zephyr", motDePasse: "ferraille" }] });

export const SessionDto = z
  .object({
    jetonDAcces: z.string().meta({ description: "Jeton d'accès à envoyer dans l'en-tête Authorization: Bearer <jeton>" }),
    expireDans: z.number().int().meta({ description: "Durée de vie du jeton d'accès, en secondes" }),
  })
  .meta({ examples: [{ jetonDAcces: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ6ZXBoeXIifQ.signature", expireDans: 900 }] });

export function versSessionDto(session: { jetonDAcces: string; expireDans: number }): z.infer<typeof SessionDto> {
  return { jetonDAcces: session.jetonDAcces, expireDans: session.expireDans };
}

import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { JetonsDAcces } from "../../../src/infrastructure/http/authentification.ts";
import { applicationDeTest, SECRET_DE_TEST } from "./application-de-test.ts";

// Un jeton signé à la main, comme le ferait un attaquant : en-tête et charge utile choisis, signature HMAC.
function jetonSigne(entete: object, charge: object, secret: string, algorithme = "sha256") {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const signature = createHmac(algorithme, secret).update(`${b64(entete)}.${b64(charge)}`).digest("base64url");
  return `${b64(entete)}.${b64(charge)}.${signature}`;
}
const dansUneHeure = Math.floor(Date.now() / 1000) + 3600;

describe("Authentification : le jeton d'accès, vérifié dans l'adapter HTTP", () => {
  const acheter = async (headers: Record<string, string>) => {
    const { app } = await applicationDeTest();
    return app.inject({ method: "POST", url: "/annonces/a-bobine-zephyr/achat", headers });
  };

  it("refuse un achat sans jeton (401, WWW-Authenticate)", async () => {
    const reponse = await acheter({});
    expect(reponse.statusCode).toBe(401);
    expect(reponse.headers["www-authenticate"]).toBe('Bearer realm="bourse"');
    expect(reponse.json()).toMatchObject({ title: "Authentification requise", status: 401 });
  });

  it("refuse le jeton forgé avec « secret », celui qui ouvre le Legacy", async () => {
    const forge = jetonSigne({ alg: "HS256", typ: "JWT" }, { sub: "lyra", exp: dansUneHeure }, "secret");
    expect((await acheter({ authorization: `Bearer ${forge}` })).statusCode).toBe(401);
  });

  it("refuse un jeton expiré, un jeton d'un autre algorithme, un jeton non signé", async () => {
    const jetons = new JetonsDAcces(SECRET_DE_TEST);
    const expire = await jetons.emettre("lyra", new Date(Date.now() - 16 * 60 * 1000));
    const hs384 = jetonSigne({ alg: "HS384", typ: "JWT" }, { sub: "lyra", exp: dansUneHeure }, SECRET_DE_TEST, "sha384");
    const nonSigne = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(`{"sub":"lyra","exp":${dansUneHeure}}`).toString("base64url")}.`;
    for (const jeton of [expire, hs384, nonSigne]) {
      expect((await acheter({ authorization: `Bearer ${jeton}` })).statusCode).toBe(401);
    }
    expect((await acheter({ authorization: `Bearer ${expire}` })).json().detail).toBe("Jeton d'accès expiré");
  });

  it("l'acheteur est le Joueur du jeton, quoi que dise le corps de la requête", async () => {
    const { app, enTantQue, bourse } = await applicationDeTest();
    const reponse = await app.inject({
      method: "POST",
      url: "/annonces/a-bobine-zephyr/achat",
      headers: await enTantQue("lyra"),
      payload: { acheteurId: "kessa" },
    });
    expect(reponse.json().acheteurId).toBe("lyra");
    expect((await bourse.porteMonnaie.solde("kessa")).montant).toBe(300);
  });

  it("le vendeur est le Joueur du jeton : on ne vend pas l'Objet d'un autre en se faisant passer pour lui", async () => {
    const { app, enTantQue } = await applicationDeTest();
    const reponse = await app.inject({
      method: "POST",
      url: "/annonces",
      headers: await enTantQue("lyra"),
      payload: { objetId: "o-pile-zephyr", prix: 10, vendeurId: "zephyr" },
    });
    expect(reponse.statusCode).toBe(403);
  });

  it("exige un secret d'au moins 32 caractères", () => {
    expect(() => new JetonsDAcces("secret")).toThrow(/32 caractères/);
  });
});

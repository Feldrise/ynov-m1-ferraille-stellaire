import { describe, expect, it } from "vitest";
import { applicationDeTest } from "./application-de-test.ts";

// Les routes des sessions, par app.inject : le refresh token voyage dans le cookie refresh_token, que les tests
// renvoient à la main, comme le ferait un navigateur.
type Reponse = Awaited<ReturnType<Awaited<ReturnType<typeof applicationDeTest>>["app"]["inject"]>>;
const leCookie = (reponse: Reponse) => reponse.cookies.find((c) => c.name === "refresh_token");

async function ouvrir(motDePasse = "ferraille") {
  const contexte = await applicationDeTest();
  const reponse = await contexte.app.inject({ method: "POST", url: "/sessions", payload: { pseudo: "zephyr", motDePasse } });
  return { ...contexte, reponse };
}

describe("POST /sessions", () => {
  it("ouvre une session : jeton d'accès dans le corps, refresh token dans un cookie httpOnly, Secure, SameSite=Strict", async () => {
    const { reponse } = await ouvrir();
    expect(reponse.statusCode).toBe(201);
    expect(reponse.json()).toEqual({ jetonDAcces: expect.any(String), expireDans: 900 });
    expect(JSON.stringify(reponse.json())).not.toContain(leCookie(reponse)!.value);
    expect(leCookie(reponse)).toMatchObject({ httpOnly: true, secure: true, sameSite: "Strict", path: "/sessions" });
  });

  it("le jeton d'accès obtenu ouvre les routes protégées", async () => {
    const { app, reponse } = await ouvrir();
    const achat = await app.inject({
      method: "POST",
      url: "/annonces/a-boite-lyra/achat",
      headers: { authorization: `Bearer ${reponse.json().jetonDAcces}` },
    });
    expect(achat.statusCode).toBe(201);
    expect(achat.json().acheteurId).toBe("zephyr");
  });

  it("refuse un mot de passe faux (401, Problem Details), sans cookie", async () => {
    const { reponse } = await ouvrir("rouille");
    expect(reponse.statusCode).toBe(401);
    expect(reponse.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(reponse.json()).toMatchObject({ title: "Pseudo ou mot de passe incorrect", status: 401 });
    expect(leCookie(reponse)).toBeUndefined();
  });
});

describe("POST /sessions/renouvellement et DELETE /sessions/courante", () => {
  it("renouvelle avec le cookie : nouveau jeton d'accès, nouveau refresh token (rotation)", async () => {
    const { app, reponse } = await ouvrir();
    const premier = leCookie(reponse)!.value;
    const renouvellement = await app.inject({ method: "POST", url: "/sessions/renouvellement", cookies: { refresh_token: premier } });
    expect(renouvellement.statusCode).toBe(200);
    expect(renouvellement.json().jetonDAcces).toEqual(expect.any(String));
    expect(leCookie(renouvellement)!.value).not.toBe(premier);
  });

  it("refuse le rejeu d'un refresh token volé, puis le refresh token neuf du Joueur : la session est révoquée", async () => {
    const { app, reponse } = await ouvrir();
    const vole = leCookie(reponse)!.value;
    const duJoueur = leCookie(await app.inject({ method: "POST", url: "/sessions/renouvellement", cookies: { refresh_token: vole } }))!.value;
    const rejeu = await app.inject({ method: "POST", url: "/sessions/renouvellement", cookies: { refresh_token: vole } });
    expect(rejeu.statusCode).toBe(401);
    expect(rejeu.json()).toMatchObject({ type: expect.stringMatching(/refresh-token-refuse$/), status: 401 });
    expect((await app.inject({ method: "POST", url: "/sessions/renouvellement", cookies: { refresh_token: duJoueur } })).statusCode).toBe(401);
  });

  it("refuse un renouvellement sans cookie (401)", async () => {
    const { app } = await applicationDeTest();
    const reponse = await app.inject({ method: "POST", url: "/sessions/renouvellement" });
    expect(reponse.statusCode).toBe(401);
    expect(reponse.json().detail).toBe("Refresh token absent : ouvrez une session");
  });

  it("ferme la session : 204, cookie effacé, et le refresh token ne renouvelle plus rien", async () => {
    const { app, reponse } = await ouvrir();
    const refreshToken = leCookie(reponse)!.value;
    const fermeture = await app.inject({ method: "DELETE", url: "/sessions/courante", cookies: { refresh_token: refreshToken } });
    expect(fermeture.statusCode).toBe(204);
    expect(fermeture.body).toBe("");
    expect(leCookie(fermeture)).toMatchObject({ value: "", path: "/sessions" });
    expect((await app.inject({ method: "POST", url: "/sessions/renouvellement", cookies: { refresh_token: refreshToken } })).statusCode).toBe(401);
    expect((await app.inject({ method: "DELETE", url: "/sessions/courante" })).statusCode).toBe(204);
  });
});

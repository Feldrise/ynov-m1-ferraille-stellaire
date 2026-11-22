// Tests d'architecture de l'état de référence (dependency-cruiser) : la règle de dépendance, vérifiée.
// Le Domain ne dépend de rien ; l'Application dépend du Domain seul et déclare ses ports ;
// l'Infrastructure (adapters et racine de composition) dépend de tout, sauf l'adapter HTTP : un adapter entrant
// appelle les use cases, jamais un adapter sortant (mémoire, PostgreSQL, et depuis la Séance 4 le cache).
// Sans ancre : les paquets sont résolus en ../node_modules/... depuis service-bourse/.
// Sans tsConfig : les imports relatifs en .ts se résolvent tels quels, sans tsconfig.json dans service-bourse/.
const PILOTES = "(^|/)node_modules/(pg|kysely|fastify|@fastify|ioredis|amqplib|jose|zod)(/|$)";

module.exports = {
  forbidden: [
    { name: "domain-ne-depend-de-rien", severity: "error", from: { path: "^src/domain" }, to: { path: "^src/(application|infrastructure)" } },
    { name: "domain-sans-npm", severity: "error", from: { path: "^src/domain" }, to: { dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer", "npm-unknown"] } },
    { name: "domain-sans-node-natif", severity: "error", from: { path: "^src/domain" }, to: { dependencyTypes: ["core"] } },
    { name: "application-sans-infrastructure", severity: "error", from: { path: "^src/application" }, to: { path: "^src/infrastructure" } },
    { name: "application-sans-pilotes", severity: "error", from: { path: "^src/application" }, to: { path: PILOTES } },
    { name: "application-sans-node-natif", severity: "error", from: { path: "^src/application" }, to: { dependencyTypes: ["core"] } },
    { name: "http-sans-adapters-sortants", severity: "error", from: { path: "^src/infrastructure/http" }, to: { path: "^src/infrastructure/(memoire|postgres|cache)" } },
    { name: "pas-de-cycle", severity: "error", from: {}, to: { circular: true } },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    exclude: { path: "^test" },
  },
};

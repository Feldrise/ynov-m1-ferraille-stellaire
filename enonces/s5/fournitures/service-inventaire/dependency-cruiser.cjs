// Tests d'architecture du Service Inventaire (dependency-cruiser) : les mêmes couches, la même règle de dépendance
// que le Service Bourse. Le Domain ne dépend de rien ; l'Application dépend du Domain seul et déclare ses ports ;
// l'Infrastructure dépend de tout, sauf ses deux adapters entrants : la messagerie (le consommateur des Ventes
// conclues) et HTTP appellent les use cases, jamais un adapter sortant (mémoire, PostgreSQL).
// Sans ancre : les paquets sont résolus en ../node_modules/... depuis service-inventaire/.
const PILOTES = "(^|/)node_modules/(pg|kysely|fastify|@fastify|ioredis|amqplib|jose|zod)(/|$)";

module.exports = {
  forbidden: [
    { name: "domain-ne-depend-de-rien", severity: "error", from: { path: "^src/domain" }, to: { path: "^src/(application|infrastructure)" } },
    { name: "domain-sans-npm", severity: "error", from: { path: "^src/domain" }, to: { dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer", "npm-unknown"] } },
    { name: "domain-sans-node-natif", severity: "error", from: { path: "^src/domain" }, to: { dependencyTypes: ["core"] } },
    { name: "application-sans-infrastructure", severity: "error", from: { path: "^src/application" }, to: { path: "^src/infrastructure" } },
    { name: "application-sans-pilotes", severity: "error", from: { path: "^src/application" }, to: { path: PILOTES } },
    { name: "application-sans-node-natif", severity: "error", from: { path: "^src/application" }, to: { dependencyTypes: ["core"] } },
    { name: "entrants-sans-adapters-sortants", severity: "error", from: { path: "^src/infrastructure/(http|messagerie)" }, to: { path: "^src/infrastructure/(memoire|postgres)" } },
    { name: "pas-de-cycle", severity: "error", from: {}, to: { circular: true } },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    exclude: { path: "^test" },
  },
};

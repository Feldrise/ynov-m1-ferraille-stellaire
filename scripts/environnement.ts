// Charge .env s'il existe, puis les valeurs par défaut de .env.example.
// Une variable déjà définie dans l'environnement n'est jamais remplacée.
export function chargerEnvironnement() {
  for (const fichier of ["../.env", "../.env.example"]) {
    try {
      process.loadEnvFile(new URL(fichier, import.meta.url));
    } catch {
      // fichier absent
    }
  }
}

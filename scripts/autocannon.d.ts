// Les types de ce que scripts/charge.ts utilise d'autocannon, qui n'en publie pas : rien à installer de plus.
declare module "autocannon" {
  type Statistiques = { average: number; total: number; p50: number; p99: number; max: number };
  type Resultat = {
    requests: Statistiques;
    latency: Statistiques;
    errors: number;
    timeouts: number;
    non2xx: number;
    statusCodeStats?: Record<string, { count: number }>;
  };
  type Options = { url: string; connections: number; duration: number; requests: Array<{ method: string; path: string }> };
  export default function autocannon(options: Options): Promise<Resultat>;
}

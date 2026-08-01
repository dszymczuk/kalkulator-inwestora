/**
 * Definicje "kubełków" inwestycyjnych.
 *
 * Kolejność w ASSET_KEYS jest znacząca: to jednocześnie kolejność wyświetlania
 * (legenda, tabele, kolejność warstw na wykresie słupkowym) oraz kolejność
 * przypisania kolorów. Paleta została zwalidowana pod kątem rozróżnialności
 * sąsiednich par przy zaburzeniach widzenia barw dla tła #162232 — zmiana
 * kolejności albo samych kolorów wymaga ponownej walidacji.
 */

export const ASSET_KEYS = [
  'ike',
  'ikze',
  'stocks',
  'etf',
  'bonds',
  'gold',
  'deposits',
  'crypto',
] as const;

export type AssetKey = (typeof ASSET_KEYS)[number];

/** Konta emerytalne — "opakowania" traktowane w kalkulatorze inaczej niż zwykłe klasy aktywów. */
export const WRAPPER_KEYS = ['ike', 'ikze'] as const satisfies readonly AssetKey[];

export type WrapperKey = (typeof WRAPPER_KEYS)[number];

/** Klasy aktywów poza kontami emerytalnymi. */
export const PLAIN_KEYS = ASSET_KEYS.filter(
  (key): key is Exclude<AssetKey, WrapperKey> => !isWrapper(key),
);

export function isWrapper(key: AssetKey): key is WrapperKey {
  return key === 'ike' || key === 'ikze';
}

export interface AssetMeta {
  key: AssetKey;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

export const ASSETS: Record<AssetKey, AssetMeta> = {
  ike: {
    key: 'ike',
    label: 'IKE',
    shortLabel: 'IKE',
    description: 'Indywidualne Konto Emerytalne — zysk bez podatku Belki przy wypłacie po 60. roku życia.',
    color: '#3987e5',
  },
  ikze: {
    key: 'ikze',
    label: 'IKZE',
    shortLabel: 'IKZE',
    description: 'Indywidualne Konto Zabezpieczenia Emerytalnego — wpłatę odliczasz od podstawy opodatkowania.',
    color: '#d95926',
  },
  stocks: {
    key: 'stocks',
    label: 'Akcje',
    shortLabel: 'Akcje',
    description: 'Pojedyncze spółki kupowane bezpośrednio na rachunku maklerskim.',
    color: '#199e70',
  },
  etf: {
    key: 'etf',
    label: 'ETF',
    shortLabel: 'ETF',
    description: 'Fundusze pasywne odwzorowujące indeksy — szeroka dywersyfikacja niskim kosztem.',
    color: '#c98500',
  },
  bonds: {
    key: 'bonds',
    label: 'Obligacje',
    shortLabel: 'Oblig.',
    description: 'Obligacje skarbowe lub korporacyjne — część portfela o niższej zmienności.',
    color: '#d55181',
  },
  gold: {
    key: 'gold',
    label: 'Złoto i metale szlachetne',
    shortLabel: 'Złoto',
    description: 'Złoto, srebro, platyna — fizycznie lub przez ETC.',
    color: '#008300',
  },
  deposits: {
    key: 'deposits',
    label: 'Lokaty',
    shortLabel: 'Lokaty',
    description: 'Lokaty i konta oszczędnościowe — poduszka bezpieczeństwa i płynność.',
    color: '#9085e9',
  },
  crypto: {
    key: 'crypto',
    label: 'Kryptowaluty',
    shortLabel: 'Krypto',
    description: 'Aktywa cyfrowe — najwyższa zmienność, zwykle niewielka część portfela.',
    color: '#e66767',
  },
};

export function emptyAllocation(): Record<AssetKey, number> {
  return Object.fromEntries(ASSET_KEYS.map((key) => [key, 0])) as Record<AssetKey, number>;
}

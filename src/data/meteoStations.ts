// Generated from public/data/meteo-stations.geojson (Govern d'Andorra layer + meteo.ad station pages).
// Regenerate after `npm run data:static`: node scripts/gen-meteo-stations.mjs
// Kept as a TS module so the Worker can bundle it (no fs access at runtime).

export interface MeteoStationMeta {
  code: string
  name: string
  lon: number
  lat: number
  altitude?: number
}

export const METEO_STATIONS: MeteoStationMeta[] = [
  { code: "39", name: "Arcalís - SAIH", lon: 1.47959, lat: 42.63349, altitude: 2220 },
  { code: "40", name: "Bordes de Setúria - SAIH", lon: 1.44067, lat: 42.55098, altitude: 1910 },
  { code: "403", name: "Borda Sabaté - SAIH", lon: 1.48162, lat: 42.44535, altitude: 861 },
  { code: "41", name: "Grau Roig - SAIH", lon: 1.69847, lat: 42.53269, altitude: 2083 },
  { code: "7993", name: "Pal", lon: 1.48986, lat: 42.53622, altitude: 1876 },
  { code: "7994", name: "Arcalís", lon: 1.5, lat: 42.6317, altitude: 2059 },
  { code: "7995", name: "Arinsal", lon: 1.4708, lat: 42.57325, altitude: 1923 },
  { code: "7996", name: "Soldeu", lon: 1.65062, lat: 42.56415, altitude: 2467 },
  { code: "7997", name: "Grau Roig", lon: 1.70033, lat: 42.53216, altitude: 2152 },
  { code: "7998", name: "El Pas de la Casa", lon: 1.7331, lat: 42.5399, altitude: 2120 },
  { code: "90000100", name: "Canillo", lon: 1.6, lat: 42.566, altitude: 1526 },
  { code: "90000200", name: "Ràdio Andorra", lon: 1.5698, lat: 42.5285, altitude: 1200 },
  { code: "99130001", name: "FEDA (Central)", lon: 1.55357, lat: 42.51554, altitude: 1135 },
  { code: "99130002", name: "Engolasters - FEDA", lon: 1.56537, lat: 42.51682, altitude: 1638 },
  { code: "99130004", name: "Ransol - FEDA", lon: 1.63941, lat: 42.57872, altitude: 1641 },
  { code: "99130005", name: "Roc St. Pere", lon: 1.53264, lat: 42.51263, altitude: 1113 },
  { code: "99130006", name: "Envalira", lon: 1.71698, lat: 42.535, altitude: 2510 },
  { code: "99130007", name: "Les Salines", lon: 1.53803, lat: 42.61064, altitude: 1445 },
  { code: "99130008", name: "La Comella", lon: 1.52294, lat: 42.49692, altitude: 1225 },
  { code: "99130009", name: "Borda Vidal", lon: 1.47492, lat: 42.43556, altitude: 873 },
  { code: "99130010", name: "Perafita", lon: 1.58378, lat: 42.46891, altitude: 2402 },
  { code: "99130011", name: "Aixàs", lon: 1.47715, lat: 42.48374, altitude: 1538 },
  { code: "99130012", name: "Bony de les Neres", lon: 1.57171, lat: 42.54933, altitude: 2080 },
  { code: "99130013", name: "Les Fonts d'Arinsal", lon: 1.47761, lat: 42.60014, altitude: 2681 },
  { code: "99130014", name: "Sorteny", lon: 1.57113, lat: 42.6117, altitude: 2271 },
  { code: "99130016", name: "La Margineda - FEDA", lon: 1.49359, lat: 42.48494, altitude: 950 },
  { code: "99130017", name: "Vall del Riu FEDA", lon: 1.5946, lat: 42.5993, altitude: 2500 },
  { code: "99130018", name: "Cabana Sorda", lon: 1.6723, lat: 42.6113, altitude: 2295 },
  { code: "99130019", name: "Tossa Espiolets", lon: 1.64607, lat: 42.54889, altitude: 2446 },
  { code: "99130020", name: "Grau Roig - FEDA", lon: 1.69802, lat: 42.54878, altitude: 2090 },
  { code: "99130021", name: "Fontverd", lon: 1.59399, lat: 42.49218, altitude: 1880 },
  { code: "99130022", name: "Coll Ordino", lon: 1.56886, lat: 42.55653, altitude: 1901 },
  { code: "99130023", name: "La Solana", lon: 1.75091, lat: 42.57888, altitude: 2470 },
  { code: "99130024", name: "Caborreu", lon: 1.54711, lat: 42.43488, altitude: 2250 },
  { code: "99130025", name: "Coll Pa", lon: 1.47612, lat: 42.51248, altitude: 2280 },
  { code: "99130026", name: "Setúria", lon: 1.44312, lat: 42.54688, altitude: 1900 },
  { code: "99130027", name: "Envalira Antenes", lon: 1.71682, lat: 42.53299, altitude: 2510 },
  { code: "9913004", name: "Ransol", lon: 1.63941, lat: 42.57872, altitude: 1645 },
]

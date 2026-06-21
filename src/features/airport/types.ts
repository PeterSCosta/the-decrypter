/** [IATA (3), ICAO (4), nome, cidade, país, lat, lng] — campos vazios = "". */
export type AirportRow = [
  iata: string,
  icao: string,
  name: string,
  city: string,
  country: string,
  lat: number,
  lng: number,
];

export interface AirportsData {
  source: string;
  generatedAt: string;
  count: number;
  rows: AirportRow[];
}

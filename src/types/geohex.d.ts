declare module "geohex" {
  export interface GeoHexCell {
    lat: number;
    lon: number;
    x: number;
    y: number;
    code: string;
  }
  export function getCellByCode(code: string): GeoHexCell;
  export function getCellByLocation(lat: number, lon: number, level: number): GeoHexCell;
  export function getCellByXY(x: number, y: number, level: number): GeoHexCell;
}

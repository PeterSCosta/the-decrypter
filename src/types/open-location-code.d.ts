// Tipos para `open-location-code` (não traz os próprios). API da v1.0.3.
declare module "open-location-code" {
  export interface CodeArea {
    latitudeLo: number;
    longitudeLo: number;
    latitudeHi: number;
    longitudeHi: number;
    codeLength: number;
    latitudeCenter: number;
    longitudeCenter: number;
  }
  export class OpenLocationCode {
    encode(latitude: number, longitude: number, codeLength?: number): string;
    decode(code: string): CodeArea;
    isValid(code: string): boolean;
    isShort(code: string): boolean;
    isFull(code: string): boolean;
    recoverNearest(
      shortCode: string,
      referenceLatitude: number,
      referenceLongitude: number,
    ): string;
    shorten(code: string, latitude: number, longitude: number): string;
  }
}

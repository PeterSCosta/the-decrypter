/** Dispositivo da frota (Traccar), via /api/fleet do backend. */
export interface FleetDevice {
  id: number;
  name: string;
  status: string; // online | offline | unknown
  lastUpdate: string | null;
  lat: number | null;
  lng: number | null;
  speedKmh: number | null;
  course: number | null;
  battery: number | null;
  moving: boolean;
}

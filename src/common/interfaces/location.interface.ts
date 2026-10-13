export interface ResolvedLocation {
  id?: string | number;
  name: string;
  country: string;
  countryCode?: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string | null;
}

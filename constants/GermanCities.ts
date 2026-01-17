export interface City {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  priority: number;
}

export const GERMAN_CITIES: City[] = [
  { name: 'Berlin', latitude: 52.5200, longitude: 13.4050, radius: 50, priority: 1 },
  { name: 'Hamburg', latitude: 53.5511, longitude: 9.9937, radius: 40, priority: 1 },
  { name: 'München', latitude: 48.1351, longitude: 11.5820, radius: 40, priority: 1 },
  { name: 'Köln', latitude: 50.9375, longitude: 6.9603, radius: 35, priority: 1 },
  { name: 'Frankfurt am Main', latitude: 50.1109, longitude: 8.6821, radius: 35, priority: 1 },
  { name: 'Stuttgart', latitude: 48.7758, longitude: 9.1829, radius: 30, priority: 2 },
  { name: 'Düsseldorf', latitude: 51.2277, longitude: 6.7735, radius: 30, priority: 2 },
  { name: 'Dortmund', latitude: 51.5136, longitude: 7.4653, radius: 30, priority: 2 },
  { name: 'Essen', latitude: 51.4556, longitude: 7.0116, radius: 30, priority: 2 },
  { name: 'Leipzig', latitude: 51.3397, longitude: 12.3731, radius: 30, priority: 2 },
  { name: 'Bremen', latitude: 53.0793, longitude: 8.8017, radius: 25, priority: 2 },
  { name: 'Dresden', latitude: 51.0504, longitude: 13.7373, radius: 25, priority: 2 },
  { name: 'Hannover', latitude: 52.3759, longitude: 9.7320, radius: 25, priority: 2 },
  { name: 'Nürnberg', latitude: 49.4521, longitude: 11.0767, radius: 25, priority: 2 },
  { name: 'Duisburg', latitude: 51.4344, longitude: 6.7623, radius: 20, priority: 3 },
  { name: 'Bochum', latitude: 51.4818, longitude: 7.2162, radius: 20, priority: 3 },
  { name: 'Wuppertal', latitude: 51.2562, longitude: 7.1508, radius: 20, priority: 3 },
  { name: 'Bielefeld', latitude: 52.0302, longitude: 8.5325, radius: 20, priority: 3 },
  { name: 'Bonn', latitude: 50.7374, longitude: 7.0982, radius: 20, priority: 3 },
  { name: 'Münster', latitude: 51.9607, longitude: 7.6261, radius: 20, priority: 3 },
  { name: 'Karlsruhe', latitude: 49.0069, longitude: 8.4037, radius: 20, priority: 3 },
  { name: 'Mannheim', latitude: 49.4875, longitude: 8.4660, radius: 20, priority: 3 },
  { name: 'Augsburg', latitude: 48.3705, longitude: 10.8978, radius: 20, priority: 3 },
  { name: 'Wiesbaden', latitude: 50.0826, longitude: 8.2400, radius: 20, priority: 3 },
  { name: 'Gelsenkirchen', latitude: 51.5177, longitude: 7.0857, radius: 15, priority: 4 },
  { name: 'Mönchengladbach', latitude: 51.1805, longitude: 6.4428, radius: 15, priority: 4 },
  { name: 'Braunschweig', latitude: 52.2689, longitude: 10.5268, radius: 15, priority: 4 },
  { name: 'Chemnitz', latitude: 50.8278, longitude: 12.9214, radius: 15, priority: 4 },
  { name: 'Kiel', latitude: 54.3233, longitude: 10.1228, radius: 15, priority: 4 },
  { name: 'Aachen', latitude: 50.7753, longitude: 6.0839, radius: 15, priority: 4 },
  { name: 'Halle (Saale)', latitude: 51.4969, longitude: 11.9688, radius: 15, priority: 4 },
  { name: 'Magdeburg', latitude: 52.1205, longitude: 11.6276, radius: 15, priority: 4 },
  { name: 'Freiburg im Breisgau', latitude: 47.9990, longitude: 7.8421, radius: 15, priority: 4 },
  { name: 'Krefeld', latitude: 51.3388, longitude: 6.5853, radius: 15, priority: 4 },
  { name: 'Lübeck', latitude: 53.8655, longitude: 10.6866, radius: 15, priority: 4 },
  { name: 'Oberhausen', latitude: 51.4963, longitude: 6.8516, radius: 15, priority: 4 },
  { name: 'Erfurt', latitude: 50.9848, longitude: 11.0299, radius: 15, priority: 4 },
  { name: 'Mainz', latitude: 49.9929, longitude: 8.2473, radius: 15, priority: 4 },
  { name: 'Rostock', latitude: 54.0887, longitude: 12.1403, radius: 15, priority: 4 },
  { name: 'Kassel', latitude: 51.3127, longitude: 9.4797, radius: 15, priority: 4 },
];

export const getCitiesByPriority = (priority?: number): City[] => {
  if (priority === undefined) return GERMAN_CITIES;
  return GERMAN_CITIES.filter(city => city.priority === priority);
};

export const getTopCities = (count: number): City[] => {
  return GERMAN_CITIES.slice(0, count);
};

export interface GeocodingResult {
  latitude: number;
  longitude: number;
}

export interface PlaceSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  importance: number;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'JetzzApp/1.0';

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

export async function geocodeAddress(
  street: string | null | undefined,
  city: string,
  postcode: string
): Promise<GeocodingResult | null> {
  try {
    await waitForRateLimit();

    const addressParts = [];
    if (street) addressParts.push(street);
    addressParts.push(postcode, city, 'Germany');

    const address = addressParts.join(', ');

    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'de',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.error('Geocoding request failed:', response.status);
      return getFallbackCoordinates(city, postcode);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      };
    }

    console.warn('No geocoding results found for:', address);
    return getFallbackCoordinates(city, postcode);
  } catch (error) {
    console.error('Error during geocoding:', error);
    return getFallbackCoordinates(city, postcode);
  }
}

function getFallbackCoordinates(city: string, postcode: string): GeocodingResult {
  const munichPostcodes: { [key: string]: GeocodingResult } = {
    '80331': { latitude: 48.1372, longitude: 11.5761 },
    '80335': { latitude: 48.1450, longitude: 11.5580 },
    '80469': { latitude: 48.1325, longitude: 11.5754 },
    '80538': { latitude: 48.1427, longitude: 11.5913 },
    '80539': { latitude: 48.1483, longitude: 11.5896 },
    '80634': { latitude: 48.1548, longitude: 11.5463 },
    '80636': { latitude: 48.1596, longitude: 11.5371 },
    '80637': { latitude: 48.1658, longitude: 11.5368 },
    '80638': { latitude: 48.1715, longitude: 11.5299 },
    '80639': { latitude: 48.1547, longitude: 11.5280 },
    '80686': { latitude: 48.1367, longitude: 11.5191 },
    '80687': { latitude: 48.1420, longitude: 11.5118 },
    '80796': { latitude: 48.1589, longitude: 11.5840 },
    '80798': { latitude: 48.1628, longitude: 11.5755 },
    '80799': { latitude: 48.1518, longitude: 11.5896 },
    '80801': { latitude: 48.1563, longitude: 11.5963 },
    '80802': { latitude: 48.1605, longitude: 11.6023 },
    '80803': { latitude: 48.1473, longitude: 11.6013 },
    '80804': { latitude: 48.1524, longitude: 11.6119 },
    '80805': { latitude: 48.1677, longitude: 11.6022 },
    '80807': { latitude: 48.1759, longitude: 11.5893 },
    '80809': { latitude: 48.1817, longitude: 11.5755 },
    '80933': { latitude: 48.1897, longitude: 11.5511 },
    '80935': { latitude: 48.1943, longitude: 11.5643 },
    '80937': { latitude: 48.2005, longitude: 11.5530 },
    '80939': { latitude: 48.2086, longitude: 11.5642 },
    '81241': { latitude: 48.1645, longitude: 11.4569 },
    '81243': { latitude: 48.1535, longitude: 11.4373 },
    '81245': { latitude: 48.1378, longitude: 11.4622 },
    '81247': { latitude: 48.1251, longitude: 11.4408 },
    '81249': { latitude: 48.1435, longitude: 11.4184 },
    '81369': { latitude: 48.1101, longitude: 11.5395 },
    '81371': { latitude: 48.1147, longitude: 11.5528 },
    '81373': { latitude: 48.1096, longitude: 11.5661 },
    '81375': { latitude: 48.1036, longitude: 11.5495 },
    '81377': { latitude: 48.0964, longitude: 11.5294 },
    '81379': { latitude: 48.0892, longitude: 11.5547 },
    '81475': { latitude: 48.0798, longitude: 11.5155 },
    '81476': { latitude: 48.0782, longitude: 11.4898 },
    '81477': { latitude: 48.0657, longitude: 11.5112 },
    '81479': { latitude: 48.0595, longitude: 11.5344 },
    '81541': { latitude: 48.1213, longitude: 11.5992 },
    '81543': { latitude: 48.1179, longitude: 11.6149 },
    '81545': { latitude: 48.1145, longitude: 11.6299 },
    '81547': { latitude: 48.1078, longitude: 11.6178 },
    '81549': { latitude: 48.1008, longitude: 11.6024 },
    '81667': { latitude: 48.1339, longitude: 11.6083 },
    '81669': { latitude: 48.1286, longitude: 11.6217 },
    '81671': { latitude: 48.1244, longitude: 11.6347 },
    '81673': { latitude: 48.1396, longitude: 11.6253 },
    '81675': { latitude: 48.1452, longitude: 11.6394 },
    '81677': { latitude: 48.1511, longitude: 11.6258 },
    '81679': { latitude: 48.1573, longitude: 11.6391 },
  };

  const fallback = munichPostcodes[postcode];
  if (fallback) {
    return fallback;
  }

  if (city.toLowerCase().includes('münchen') || city.toLowerCase().includes('munich')) {
    return { latitude: 48.1351, longitude: 11.5820 };
  }

  return { latitude: 48.1351, longitude: 11.5820 };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ city: string; street: string | null; postcode: string } | null> {
  try {
    await waitForRateLimit();

    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.error('Reverse geocoding request failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data || !data.address) {
      return null;
    }

    const address = data.address;
    const city = address.city || address.town || address.village || address.municipality || 'Unbekannt';
    const street = address.road ? `${address.house_number ? address.house_number + ' ' : ''}${address.road}` : null;
    const postcode = address.postcode || '00000';

    return { city, street, postcode };
  } catch (error) {
    console.error('Error during reverse geocoding:', error);
    return null;
  }
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    await waitForRateLimit();

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      countrycodes: 'de',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.error('Place search request failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((place: any) => ({
      displayName: place.display_name,
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon),
      type: place.type || 'place',
      importance: place.importance || 0,
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

export async function batchGeocodeAddresses(
  addresses: Array<{ street?: string; city: string; postcode: string }>
): Promise<Array<GeocodingResult | null>> {
  const results: Array<GeocodingResult | null> = [];

  for (const addr of addresses) {
    const result = await geocodeAddress(addr.street, addr.city, addr.postcode);
    results.push(result);
  }

  return results;
}

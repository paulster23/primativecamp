import { geocodingService, LocationResult } from '../geocodingService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('GeocodingService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    geocodingService.clearCache();
  });

  describe('searchLocation', () => {
    it('should return empty array for empty query', async () => {
      const result = await geocodingService.searchLocation('');
      expect(result).toEqual([]);
    });

    it('should return empty array for very short query', async () => {
      const result = await geocodingService.searchLocation('a');
      expect(result).toEqual([]);
    });

    it('should search for location and return results', async () => {
      const mockResponse = [
        {
          display_name: 'Albany, Albany County, New York, United States',
          lat: '42.6803',
          lon: '-73.8370',
          importance: '0.8',
          type: 'city',
          class: 'place',
          boundingbox: ['42.6003', '42.7603', '-73.9170', '-73.7570']
        }
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await geocodingService.searchLocation('Albany');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org/search'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'Campsite-Map-App/1.0'
          }
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        displayName: 'Albany, Albany County, New York, United States',
        latitude: 42.6803,
        longitude: -73.8370,
        importance: 0.8,
        type: 'city',
        bbox: [-73.9170, 42.6003, -73.7570, 42.7603]
      });
    });

    it('should filter out non-NY results', async () => {
      const mockResponse = [
        {
          display_name: 'Albany, Georgia, United States',
          lat: '31.5786',
          lon: '-84.1557',
          importance: '0.7',
          type: 'city',
          class: 'place'
        },
        {
          display_name: 'Albany, Albany County, New York, United States',
          lat: '42.6803',
          lon: '-73.8370',
          importance: '0.8',
          type: 'city',
          class: 'place'
        }
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await geocodingService.searchLocation('Albany');
      
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toContain('New York');
    });

    it('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(geocodingService.searchLocation('Albany')).rejects.toEqual({
        message: 'Unable to search for location.',
        code: 'NETWORK_ERROR'
      });
    });

    it('should handle API errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      await expect(geocodingService.searchLocation('Albany')).rejects.toEqual({
        message: 'Location search service unavailable.',
        code: 'API_ERROR'
      });
    });

    it('should handle rate limiting', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 429
      } as Response);

      await expect(geocodingService.searchLocation('Albany')).rejects.toEqual({
        message: 'Too many requests. Please wait a moment.',
        code: 'RATE_LIMIT'
      });
    });

    it('should cache successful results', async () => {
      const mockResponse = [
        {
          display_name: 'Albany, Albany County, New York, United States',
          lat: '42.6803',
          lon: '-73.8370',
          importance: '0.8',
          type: 'city',
          class: 'place'
        }
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      // First call should make API request
      await geocodingService.searchLocation('Albany');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await geocodingService.searchLocation('Albany');
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      const mockResponse = {
        display_name: 'Albany, Albany County, New York, United States',
        lat: '42.6803',
        lon: '-73.8370',
        importance: '0.8',
        type: 'city'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await geocodingService.reverseGeocode(42.6803, -73.8370);
      
      expect(result).toEqual({
        displayName: 'Albany, Albany County, New York, United States',
        latitude: 42.6803,
        longitude: -73.8370,
        importance: 0.8,
        type: 'city',
        bbox: undefined
      });
    });

    it('should return null on API error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await geocodingService.reverseGeocode(42.6803, -73.8370);
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await geocodingService.reverseGeocode(42.6803, -73.8370);
      expect(result).toBeNull();
    });
  });

  describe('getPopularNYLocations', () => {
    it('should return predefined popular locations', () => {
      const locations = geocodingService.getPopularNYLocations();
      
      expect(locations).toBeInstanceOf(Array);
      expect(locations.length).toBeGreaterThan(0);
      
      const albany = locations.find(loc => loc.displayName.includes('Albany'));
      expect(albany).toBeDefined();
      expect(albany?.latitude).toBe(42.6803);
      expect(albany?.longitude).toBe(-73.8370);
    });

    it('should include major NY destinations', () => {
      const locations = geocodingService.getPopularNYLocations();
      const locationNames = locations.map(loc => loc.displayName);
      
      expect(locationNames.some(name => name.includes('Albany'))).toBe(true);
      expect(locationNames.some(name => name.includes('Syracuse'))).toBe(true);
      expect(locationNames.some(name => name.includes('Buffalo'))).toBe(true);
      expect(locationNames.some(name => name.includes('Rochester'))).toBe(true);
      expect(locationNames.some(name => name.includes('Adirondack'))).toBe(true);
      expect(locationNames.some(name => name.includes('Catskill'))).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      const mockResponse = [
        {
          display_name: 'Test Location',
          lat: '42.0',
          lon: '-73.0',
          importance: '0.5',
          type: 'city',
          class: 'place'
        }
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      // Make initial request to populate cache
      await geocodingService.searchLocation('Test');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      geocodingService.clearCache();

      // Next request should hit API again
      await geocodingService.searchLocation('Test');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
import { loadCampsiteData, parseCampsiteCSV } from '../campsiteService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Campsite Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Reset environment variables
    delete process.env.PUBLIC_URL;
  });

  describe('parseCampsiteCSV', () => {
    it('should parse CSV data correctly', () => {
      const csvData = `Name,State Land,Latitude,Longitude,Address,Town,County
Test Campsite,Test Forest,44.1195,-75.2176,123 Test Rd,Test Town,Test County
Invalid Site,Test Forest,0,0,456 Test Ave,Test Town,Test County`;

      const result = parseCampsiteCSV(csvData);
      
      expect(result).toHaveLength(1); // Invalid site should be filtered out
      expect(result[0]).toEqual({
        name: 'Test Campsite',
        stateLand: 'Test Forest',
        latitude: 44.1195,
        longitude: -75.2176,
        address: '123 Test Rd',
        town: 'Test Town',
        county: 'Test County',
        notes: ''
      });
    });

    it('should filter out campsites with invalid coordinates', () => {
      const csvData = `Name,State Land,Latitude,Longitude,Address,Town,County
Valid Site,Test Forest,44.1195,-75.2176,123 Test Rd,Test Town,Test County
Invalid Site 1,Test Forest,0,0,456 Test Ave,Test Town,Test County
Invalid Site 2,Test Forest,,,-789 Test St,Test Town,Test County`;

      const result = parseCampsiteCSV(csvData);
      expect(result).toHaveLength(1);
    });
  });

  describe('loadCampsiteData', () => {
    it('should load and parse campsite data successfully', async () => {
      const mockCsvData = `Name,State Land,Latitude,Longitude,Address,Town,County
Test Campsite,Test Forest,44.1195,-75.2176,123 Test Rd,Test Town,Test County`;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsvData
      } as Response);

      const result = await loadCampsiteData();
      
      expect(fetch).toHaveBeenCalledWith('/campsites.csv');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Campsite');
    });

    it('should handle fetch errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await loadCampsiteData();
      
      expect(result).toEqual([]);
    });

    it('should load actual CSV data when file is available', async () => {
      // Mock successful fetch with real CSV structure
      const mockCsvData = `Name,State Land,Latitude,Longitude,Address,Town,County,,
South Creek Lake Campsite,Aldrich Pond Wild Forest,44.11950576,-75.21758162,98 Powell Rd,Fine,St. Lawrence,,
Streeter Lake Lean-To,Aldrich Pond Wild Forest,44.10708943,-75.06744485,407 Youngs Rd,Fine,St. Lawrence,,Note: Street address is nearest address in NY Street Address Management System.`;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsvData
      } as Response);

      const result = await loadCampsiteData();
      
      // This ensures our CSV parsing works with the real data structure
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('latitude');
      expect(result[0]).toHaveProperty('longitude');
      expect(result[0].latitude).not.toBe(0);
      expect(result[0].longitude).not.toBe(0);
      expect(result[0].name).toBe('South Creek Lake Campsite');
    });
  });
});
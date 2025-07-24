export interface LocationResult {
  displayName: string;
  latitude: number;
  longitude: number;
  bbox?: [number, number, number, number]; // [west, south, east, north]
  importance: number;
  type: string; // city, town, village, etc.
}

export interface GeocodingError {
  message: string;
  code: 'NETWORK_ERROR' | 'NO_RESULTS' | 'API_ERROR' | 'RATE_LIMIT';
}

class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly reverseUrl = 'https://nominatim.openstreetmap.org/reverse';
  private cache = new Map<string, LocationResult[]>();
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second between requests to respect rate limits

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  async searchLocation(query: string): Promise<LocationResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = query.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      await this.throttleRequest();

      // Focus search on New York State and nearby areas
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'us',
        // Bias results toward New York State
        viewbox: '-79.76,40.49,-71.78,45.01', // NY State bounding box
        bounded: '0', // Don't strictly limit to viewbox
        'accept-language': 'en',
        dedupe: '1'
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Campsite-Map-App/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMIT');
        }
        throw new Error('API_ERROR');
      }

      const data = await response.json();
      
      // Debug logging to understand API responses
      console.log('🔍 Nominatim API Response for query:', query);
      console.log('📊 Raw results count:', data.length);
      if (data.length > 0) {
        console.log('📍 Sample result:', {
          display_name: data[0].display_name,
          type: data[0].type,
          class: data[0].class,
          address: data[0].address
        });
      }
      
      const results: LocationResult[] = data
        .filter((item: any) => {
          // Enhanced NY State detection
          const displayName = (item.display_name || '').toLowerCase();
          const address = item.address || {};
          
          const isInNY = displayName.includes('new york') || 
                        displayName.includes(', ny') ||
                        displayName.includes(' ny ') ||
                        displayName.includes('ny,') ||
                        address.state === 'New York' ||
                        address.state === 'NY';
          
          // Expanded type and class checking
          const validTypes = ['city', 'town', 'village', 'hamlet', 'county', 'state', 
                             'municipality', 'borough', 'administrative', 'locality'];
          const validClasses = ['place', 'administrative', 'boundary'];
          
          const isRelevantType = validTypes.includes(item.type) ||
                               validClasses.includes(item.class);
          
          // Debug logging for filtering decisions
          if (displayName.includes('albany') || displayName.includes('buffalo') || displayName.includes('syracuse')) {
            console.log('🎯 Major city check:', {
              name: item.display_name,
              type: item.type,
              class: item.class,
              isInNY,
              isRelevantType,
              willInclude: isInNY && isRelevantType,
              address: address
            });
          }
          
          return isInNY && isRelevantType;
        })
        .map((item: any) => ({
          displayName: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          bbox: item.boundingbox ? [
            parseFloat(item.boundingbox[2]), // west
            parseFloat(item.boundingbox[0]), // south
            parseFloat(item.boundingbox[3]), // east
            parseFloat(item.boundingbox[1])  // north
          ] : undefined,
          importance: parseFloat(item.importance || '0'),
          type: item.type || 'place'
        }))
        .sort((a: LocationResult, b: LocationResult) => b.importance - a.importance); // Sort by importance

      console.log('✅ Filtered results count:', results.length);
      
      // Fallback strategy: if no NY results found, try with broader filtering
      if (results.length === 0 && data.length > 0) {
        console.warn('⚠️ No NY results found, trying fallback strategy...');
        
        // Try with just type/class filtering (no NY restriction)
        const fallbackResults = data
          .filter((item: any) => {
            const validTypes = ['city', 'town', 'village', 'hamlet', 'county', 'state', 
                               'municipality', 'borough', 'administrative', 'locality'];
            const validClasses = ['place', 'administrative', 'boundary'];
            
            return validTypes.includes(item.type) || validClasses.includes(item.class);
          })
          .slice(0, 3) // Limit to 3 fallback results
          .map((item: any) => ({
            displayName: item.display_name + ' (Outside NY)',
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            bbox: item.boundingbox ? [
              parseFloat(item.boundingbox[2]),
              parseFloat(item.boundingbox[0]),
              parseFloat(item.boundingbox[3]),
              parseFloat(item.boundingbox[1])
            ] : undefined,
            importance: parseFloat(item.importance || '0'),
            type: item.type || 'place'
          }));
          
        if (fallbackResults.length > 0) {
          console.log('🔄 Using fallback results:', fallbackResults.length);
          this.cache.set(cacheKey, fallbackResults);
          return fallbackResults;
        }
        
        console.log('🔍 First 3 raw results that were filtered out:', 
          data.slice(0, 3).map((item: any) => ({
            display_name: item.display_name,
            type: item.type,
            class: item.class,
            address: item.address
          }))
        );
      }
      
      // Cache successful results
      this.cache.set(cacheKey, results);
      
      return results;

    } catch (error) {
      console.error('Geocoding error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'RATE_LIMIT') {
          throw { message: 'Too many requests. Please wait a moment.', code: 'RATE_LIMIT' } as GeocodingError;
        }
        if (error.message === 'API_ERROR') {
          throw { message: 'Location search service unavailable.', code: 'API_ERROR' } as GeocodingError;
        }
      }
      
      throw { message: 'Unable to search for location.', code: 'NETWORK_ERROR' } as GeocodingError;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<LocationResult | null> {
    try {
      await this.throttleRequest();

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        'accept-language': 'en',
        zoom: '10'
      });

      const response = await fetch(`${this.reverseUrl}?${params.toString()}`, {
        headers: {
          'User-Agent': 'Campsite-Map-App/1.0'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (!data.display_name) {
        return null;
      }

      return {
        displayName: data.display_name,
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        bbox: data.boundingbox ? [
          parseFloat(data.boundingbox[2]),
          parseFloat(data.boundingbox[0]),
          parseFloat(data.boundingbox[3]),
          parseFloat(data.boundingbox[1])
        ] : undefined,
        importance: parseFloat(data.importance || '0'),
        type: data.type || 'place'
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Utility method to get popular NY locations for quick access
  getPopularNYLocations(): LocationResult[] {
    return [
      {
        displayName: "Albany, Albany County, New York",
        latitude: 42.6803,
        longitude: -73.8370,
        importance: 0.8,
        type: "city"
      },
      {
        displayName: "Syracuse, Onondaga County, New York", 
        latitude: 43.0481,
        longitude: -76.1474,
        importance: 0.8,
        type: "city"
      },
      {
        displayName: "Buffalo, Erie County, New York",
        latitude: 42.8864,
        longitude: -78.8784,
        importance: 0.8,
        type: "city"
      },
      {
        displayName: "Rochester, Monroe County, New York",
        latitude: 43.1566,
        longitude: -77.6088,
        importance: 0.8,
        type: "city"
      },
      {
        displayName: "Adirondack Park, New York",
        latitude: 43.8041,
        longitude: -74.2651,
        bbox: [-75.3, 43.0, -73.3, 44.9],
        importance: 0.9,
        type: "park"
      },
      {
        displayName: "Catskill Mountains, New York",
        latitude: 42.1834,
        longitude: -74.2651,
        bbox: [-75.0, 41.8, -73.5, 42.5],
        importance: 0.9,
        type: "mountain_range"
      }
    ];
  }
}

export const geocodingService = new GeocodingService();
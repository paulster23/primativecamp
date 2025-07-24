import React, { useState, useRef, useEffect } from 'react';
import { geocodingService, LocationResult, GeocodingError } from '../services/geocodingService';

interface LocationSearchBarProps {
  onLocationSelected: (location: LocationResult) => void;
  placeholder?: string;
  showPopularLocations?: boolean;
}

const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onLocationSelected,
  placeholder = "Search cities, towns, zip codes...",
  showPopularLocations = true
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Popular locations for quick access
  const popularLocations = geocodingService.getPopularNYLocations();

  const handleInputChange = (value: string) => {
    setQuery(value);
    setError(null);
    setActiveSuggestionIndex(-1);

    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce search requests
    debounceRef.current = setTimeout(async () => {
      await performSearch(value);
    }, 300);
  };

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await geocodingService.searchLocation(searchQuery);
      setSuggestions(results);
      setShowSuggestions(true);
      
    } catch (err) {
      const geocodingError = err as GeocodingError;
      setError(geocodingError.message);
      setSuggestions([]);
      setShowSuggestions(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    setQuery(location.displayName.split(',')[0]); // Show just the main location name
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    onLocationSelected(location);
    
    // Blur the input to hide mobile keyboard
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const totalSuggestions = suggestions.length + (showPopularLocations ? popularLocations.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : totalSuggestions - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0) {
          const allSuggestions = showPopularLocations ? 
            [...popularLocations, ...suggestions] : suggestions;
          if (allSuggestions[activeSuggestionIndex]) {
            handleLocationSelect(allSuggestions[activeSuggestionIndex]);
          }
        } else if (suggestions.length > 0) {
          handleLocationSelect(suggestions[0]);
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleLocationSelect(suggestions[0]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderSuggestion = (location: LocationResult, index: number, isPopular: boolean = false) => {
    const isActive = index === activeSuggestionIndex;
    const displayParts = location.displayName.split(',');
    const mainLocation = displayParts[0];
    const subLocation = displayParts.slice(1, 3).join(',');

    return (
      <div
        key={`${isPopular ? 'popular' : 'search'}-${index}`}
        className={`suggestion-item ${isActive ? 'active' : ''}`}
        onClick={() => handleLocationSelect(location)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid #eee',
          backgroundColor: isActive ? '#f0f8ff' : 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontWeight: '500', color: '#333' }}>
            {isPopular && '⭐ '}{mainLocation}
          </div>
          {subLocation && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {subLocation}
            </div>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#999', textTransform: 'capitalize' }}>
          {location.type}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }} ref={suggestionsRef}>
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            outline: 'none',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'border-color 0.2s ease',
            ...(showSuggestions ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {})
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#4285f4';
            if (query.length >= 2) setShowSuggestions(true);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#ddd';
          }}
        />
        
        {loading && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#666'
          }}>
            🔍
          </div>
        )}
      </form>

      {showSuggestions && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '2px solid #ddd',
            borderTop: 'none',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          {error && (
            <div style={{ 
              padding: '12px 16px', 
              color: '#d73a49', 
              fontSize: '14px',
              borderBottom: '1px solid #eee'
            }}>
              {error}
            </div>
          )}

          {!error && showPopularLocations && query.length < 2 && (
            <>
              <div style={{ 
                padding: '8px 16px', 
                fontSize: '12px', 
                color: '#666', 
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #eee',
                fontWeight: '500'
              }}>
                Popular Locations
              </div>
              {popularLocations.map((location, index) => 
                renderSuggestion(location, index, true)
              )}
            </>
          )}

          {!error && suggestions.length > 0 && (
            <>
              {showPopularLocations && query.length >= 2 && (
                <div style={{ 
                  padding: '8px 16px', 
                  fontSize: '12px', 
                  color: '#666', 
                  backgroundColor: '#f8f9fa',
                  borderBottom: '1px solid #eee',
                  fontWeight: '500'
                }}>
                  Search Results
                </div>
              )}
              {suggestions.map((location, index) => {
                const adjustedIndex = showPopularLocations ? 
                  index + popularLocations.length : index;
                return renderSuggestion(location, adjustedIndex);
              })}
            </>
          )}

          {!error && !loading && suggestions.length === 0 && query.length >= 2 && (
            <div style={{ 
              padding: '12px 16px', 
              color: '#666', 
              fontSize: '14px',
              textAlign: 'center'
            }}>
              No locations found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearchBar;
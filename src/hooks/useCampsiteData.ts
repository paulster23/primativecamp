import { useState, useEffect } from 'react';
import { Campsite } from '../types/Campsite';
import { loadCampsiteData, filterCampsitesByRegion, searchCampsites } from '../services/campsiteService';

interface UseCampsiteDataReturn {
  campsites: Campsite[];
  filteredCampsites: Campsite[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedRegion: string;
  setSearchQuery: (query: string) => void;
  setSelectedRegion: (region: string) => void;
}

export const useCampsiteData = (): UseCampsiteDataReturn => {
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [filteredCampsites, setFilteredCampsites] = useState<Campsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await loadCampsiteData();
        setCampsites(data);
        setFilteredCampsites(data);
      } catch (err) {
        setError('Failed to load campsite data');
        console.error('Error loading campsite data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = campsites;

    if (selectedRegion) {
      filtered = filterCampsitesByRegion(filtered, selectedRegion);
    }

    if (searchQuery) {
      filtered = searchCampsites(filtered, searchQuery);
    }

    setFilteredCampsites(filtered);
  }, [campsites, searchQuery, selectedRegion]);

  return {
    campsites,
    filteredCampsites,
    loading,
    error,
    searchQuery,
    selectedRegion,
    setSearchQuery,
    setSelectedRegion,
  };
};
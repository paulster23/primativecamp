import Papa from 'papaparse';
import { Campsite } from '../types/Campsite';

export const parseCampsiteCSV = (csvText: string): Campsite[] => {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row: any) => ({
    name: row.Name || '',
    stateLand: row['State Land'] || '',
    latitude: parseFloat(row.Latitude) || 0,
    longitude: parseFloat(row.Longitude) || 0,
    address: row.Address || '',
    town: row.Town || '',
    county: row.County || '',
    notes: row['Note'] || row['Notes'] || '',
  })).filter((site: Campsite) => 
    site.latitude !== 0 && site.longitude !== 0 && site.name.trim() !== ''
  );
};

export const loadCampsiteData = async (): Promise<Campsite[]> => {
  try {
    // Use process.env.PUBLIC_URL to handle both dev and production environments
    const publicUrl = process.env.PUBLIC_URL || '';
    const response = await fetch(`${publicUrl}/campsites.csv`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    return parseCampsiteCSV(csvText);
  } catch (error) {
    console.error('Error loading campsite data:', error);
    return [];
  }
};

export const filterCampsitesByRegion = (campsites: Campsite[], stateLand?: string): Campsite[] => {
  if (!stateLand) return campsites;
  return campsites.filter(site => 
    site.stateLand.toLowerCase().includes(stateLand.toLowerCase())
  );
};

export const searchCampsites = (campsites: Campsite[], query: string): Campsite[] => {
  if (!query.trim()) return campsites;
  
  const searchTerm = query.toLowerCase();
  return campsites.filter(site => 
    site.name.toLowerCase().includes(searchTerm) ||
    site.stateLand.toLowerCase().includes(searchTerm) ||
    site.town.toLowerCase().includes(searchTerm) ||
    site.county.toLowerCase().includes(searchTerm)
  );
};
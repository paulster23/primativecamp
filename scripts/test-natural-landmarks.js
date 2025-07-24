#!/usr/bin/env node

/**
 * Test script to research natural landmarks and geographic features
 * that can be found via Nominatim API for camping-related searches
 */

// For Node.js environments that don't have fetch
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

async function testNaturalLandmarkQueries() {
  console.log('🏔️ Testing natural landmark and geographic feature searches...');
  
  const testQueries = [
    // User's specific examples
    'Pharoah Lake New York',
    'Wilcox Lake Wild Forest NY',
    'Wolf Pond Mountain New York',
    
    // Additional natural features for broader testing
    'Lake George New York',
    'High Peaks Wilderness NY',
    'Adirondack Park NY',
    'Catskill Mountains NY',
    'Finger Lakes NY',
    'Thousand Islands NY',
    'Saratoga Springs State Park',
    
    // More specific features
    'Mount Marcy NY',
    'Algonquin Peak NY',
    'Blue Mountain Lake NY',
    'Raquette Lake NY'
  ];
  
  let totalNaturalFeatures = 0;
  let foundFeatures = 0;
  
  for (const query of testQueries) {
    console.log(`\n🔍 Testing natural feature: "${query}"`);
    totalNaturalFeatures++;
    
    try {
      // Test the actual Nominatim API
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '8', // More results for natural features
        countrycodes: 'us',
        viewbox: '-79.76,40.49,-71.78,45.01', // NY State bounds
        bounded: '0',
        'accept-language': 'en',
        dedupe: '1'
      });

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Campsite-Map-App/1.0'
        }
      });

      if (!response.ok) {
        console.log(`❌ API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`📊 Raw results: ${data.length}`);
      
      if (data.length > 0) {
        foundFeatures++;
        
        // Analyze the types of results we get
        const naturalFeatures = data.filter(item => {
          return item.class === 'natural' || 
                 item.class === 'leisure' || 
                 item.class === 'landuse' ||
                 item.type === 'water' ||
                 item.type === 'lake' ||
                 item.type === 'peak' ||
                 item.type === 'forest' ||
                 item.type === 'wood' ||
                 item.type === 'nature_reserve' ||
                 item.type === 'protected_area';
        });
        
        const adminFeatures = data.filter(item => {
          return item.class === 'boundary' || 
                 item.class === 'place' ||
                 item.class === 'administrative';
        });
        
        console.log(`🌲 Natural features found: ${naturalFeatures.length}`);
        console.log(`🏛️ Administrative features found: ${adminFeatures.length}`);
        
        // Show the best matches
        if (naturalFeatures.length > 0) {
          console.log(`✅ Best natural match: ${naturalFeatures[0].display_name}`);
          console.log(`   🏷️ Type: ${naturalFeatures[0].type}, Class: ${naturalFeatures[0].class}`);
          console.log(`   📍 Coords: ${naturalFeatures[0].lat}, ${naturalFeatures[0].lon}`);
          if (naturalFeatures[0].boundingbox) {
            console.log(`   📐 Has bounding box: YES`);
          }
        }
        
        if (adminFeatures.length > 0 && naturalFeatures.length === 0) {
          console.log(`⚠️ Only admin match: ${adminFeatures[0].display_name}`);
          console.log(`   🏷️ Type: ${adminFeatures[0].type}, Class: ${adminFeatures[0].class}`);
        }
        
        // Show what would be filtered out by current logic
        const currentValidTypes = ['city', 'town', 'village', 'hamlet', 'county', 'state', 
                                  'municipality', 'borough', 'administrative', 'locality'];
        const currentValidClasses = ['place', 'administrative', 'boundary'];
        
        const currentlyAllowed = data.filter(item => {
          return currentValidTypes.includes(item.type) || currentValidClasses.includes(item.class);
        });
        
        const currentlyFiltered = data.filter(item => {
          return !currentValidTypes.includes(item.type) && !currentValidClasses.includes(item.class);
        });
        
        console.log(`👍 Currently allowed: ${currentlyAllowed.length}`);
        console.log(`🚫 Currently filtered out: ${currentlyFiltered.length}`);
        
        if (currentlyFiltered.length > 0) {
          console.log(`   🚫 Filtered types: ${[...new Set(currentlyFiltered.map(item => item.type))].join(', ')}`);
          console.log(`   🚫 Filtered classes: ${[...new Set(currentlyFiltered.map(item => item.class))].join(', ')}`);
        }
        
      } else {
        console.log(`❌ No results found for "${query}"`);
      }
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1100));
      
    } catch (error) {
      console.log(`❌ Error testing "${query}":`, error.message);
    }
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`🔍 Total queries tested: ${totalNaturalFeatures}`);
  console.log(`✅ Queries with results: ${foundFeatures}`);
  console.log(`📊 Success rate: ${Math.round((foundFeatures/totalNaturalFeatures)*100)}%`);
  console.log('\n💡 Key insights:');
  console.log('   • Natural features use classes: natural, leisure, landuse');
  console.log('   • Natural types include: water, lake, peak, forest, wood, nature_reserve');
  console.log('   • Many results are currently being filtered out by the geocoding service');
  console.log('   • Expanding the allowed types/classes will enable natural landmark search');
}

// Run the test
if (require.main === module) {
  testNaturalLandmarkQueries().catch(console.error);
}

module.exports = { testNaturalLandmarkQueries };
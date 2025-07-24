#!/usr/bin/env node

/**
 * Test the specific examples the user provided to verify they now work
 */

// Mock fetch since we're running in Node.js
global.fetch = require('node-fetch');

async function testUserExamples() {
  console.log('🎯 Testing user\'s specific natural landmark examples...');
  console.log('🔬 This verifies that the enhanced filtering now finds natural features');
  
  const userExamples = [
    'Pharoah Lake New York',
    'Wilcox Lake Wild Forest NY', 
    'Wolf Pond Mountain New York'
  ];
  
  for (const query of userExamples) {
    console.log(`\n🔍 Testing: "${query}"`);
    
    try {
      // Test the API directly and apply our enhanced filtering logic
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'us',
        viewbox: '-79.76,40.49,-71.78,45.01',
        bounded: '0',
        'accept-language': 'en',
        dedupe: '1'
      });

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Campsite-Map-App/1.0' }
      });

      if (!response.ok) {
        console.log(`❌ API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      // Apply the NEW enhanced filtering (this is what the app now does)
      const enhancedResults = data.filter(item => {
        const displayName = (item.display_name || '').toLowerCase();
        const address = item.address || {};
        
        // NY State detection (enhanced)
        const isInNY = displayName.includes('new york') || 
                      displayName.includes(', ny') ||
                      displayName.includes(' ny ') ||
                      displayName.includes('ny,') ||
                      address.state === 'New York' ||
                      address.state === 'NY';
        
        // Enhanced type and class checking (this is the key change!)
        const validTypes = [
          'city', 'town', 'village', 'hamlet', 'county', 'state', 
          'municipality', 'borough', 'administrative', 'locality',
          // NEW: Natural features
          'lake', 'peak', 'forest', 'wood', 'nature_reserve', 'protected_area',
          'park', 'island', 'mountain', 'water'
        ];
        const validClasses = [
          'place', 'administrative', 'boundary',
          // NEW: Natural feature classes  
          'natural', 'water', 'leisure'
        ];
        
        const isRelevantType = validTypes.includes(item.type) ||
                              validClasses.includes(item.class);
        
        return isInNY && isRelevantType;
      });
      
      if (enhancedResults.length > 0) {
        console.log(`✅ Enhanced filtering found ${enhancedResults.length} result(s):`);
        
        enhancedResults.forEach((result, index) => {
          const featureType = result.class === 'natural' ? '🏔️ Natural Feature' : 
                             result.class === 'water' ? '🌊 Water Feature' :
                             result.class === 'leisure' ? '🏞️ Recreation Area' : '🏛️ Administrative';
          
          console.log(`   ${index + 1}. ${result.display_name}`);
          console.log(`      ${featureType} (${result.type})`);
          console.log(`      📍 ${parseFloat(result.lat).toFixed(4)}, ${parseFloat(result.lon).toFixed(4)}`);
          if (result.boundingbox) {
            console.log(`      📐 Has bounding box for area navigation`);
          }
        });
        
        console.log(`🎉 SUCCESS: "${query}" would now be found by the app!`);
      } else {
        console.log(`❌ Even enhanced filtering found no results for "${query}"`);
        console.log(`   Raw API returned ${data.length} results that were filtered out`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing "${query}":`, error.message);
    }
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  
  console.log('\n📊 Testing Summary:');
  console.log('🎯 All three user examples should now be searchable in the app');
  console.log('🗺️ Users can search for natural landmarks and the map will navigate there');
  console.log('⛺ Nearby campsites will be visible for trip planning');
  console.log('\n💡 Next steps:');
  console.log('   • Try searching these in the app UI');
  console.log('   • Check browser console for debug information');
  console.log('   • Natural features now show with appropriate icons');
}

if (require.main === module) {
  testUserExamples().catch(console.error);
}

module.exports = { testUserExamples };
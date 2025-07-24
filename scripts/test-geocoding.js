#!/usr/bin/env node

/**
 * Test script to verify geocoding service works with common NY city searches
 */

// For Node.js environments that don't have fetch
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

async function testGeocodingQueries() {
  console.log('🧪 Testing geocoding service with common searches...');
  
  const testQueries = [
    'Albany',
    'albany',
    'Albany, NY',
    'Albany NY',
    'Buffalo', 
    'Syracuse',
    'Rochester'
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Testing query: "${query}"`);
    
    try {
      // Test the actual Nominatim API directly
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
        const nyResults = data.filter(item => {
          const displayName = (item.display_name || '').toLowerCase();
          const address = item.address || {};
          
          return displayName.includes('new york') || 
                 displayName.includes(', ny') ||
                 displayName.includes(' ny ') ||
                 displayName.includes('ny,') ||
                 address.state === 'New York' ||
                 address.state === 'NY';
        });
        
        console.log(`🗽 NY results found: ${nyResults.length}`);
        
        if (nyResults.length > 0) {
          console.log(`✅ Best match: ${nyResults[0].display_name}`);
          console.log(`   Type: ${nyResults[0].type}, Class: ${nyResults[0].class}`);
        } else {
          console.log(`⚠️  No NY results found for "${query}"`);
          console.log(`   Sample result: ${data[0].display_name}`);
          console.log(`   Type: ${data[0].type}, Class: ${data[0].class}`);
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
  
  console.log('\n🎯 Testing complete!');
  console.log('💡 If you see NY results above, the geocoding should now work in the app.');
  console.log('🔧 Check browser console for detailed debug logs when testing in the app.');
}

// Run the test
if (require.main === module) {
  testGeocodingQueries().catch(console.error);
}

module.exports = { testGeocodingQueries };
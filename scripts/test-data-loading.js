#!/usr/bin/env node

/**
 * Integration test to verify campsite data loading works correctly.
 * This script tests the actual data loading from the dev server.
 */

async function testDataLoading() {
  console.log('🧪 Testing campsite data loading...');
  
  try {
    // Test if CSV file is accessible (with homepage prefix for dev server)
    const csvResponse = await fetchWithTimeout('http://localhost:3000/primativecamp/campsites.csv', 5000);
    
    if (!csvResponse.ok) {
      throw new Error(`CSV file not accessible: ${csvResponse.status} ${csvResponse.statusText}`);
    }
    
    const csvText = await csvResponse.text();
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Basic CSV validation
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file has insufficient data (needs header + at least 1 row)');
    }
    
    const header = lines[0];
    if (!header.includes('Name') || !header.includes('Latitude') || !header.includes('Longitude')) {
      throw new Error('CSV file missing required columns (Name, Latitude, Longitude)');
    }
    
    const dataRows = lines.slice(1).filter(line => line.trim().length > 0);
    console.log(`✅ CSV file accessible with ${dataRows.length} data rows`);
    
    // Basic validation completed - CSV file is accessible and has valid structure
    
    console.log('✅ Data loading integration test passed');
    console.log(`📊 Found ${dataRows.length} total campsite records`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Data loading test failed:', error.message);
    return false;
  }
}

async function fetchWithTimeout(url, timeout) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

// For Node.js environments that don't have fetch
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Run the test
if (require.main === module) {
  testDataLoading().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testDataLoading };
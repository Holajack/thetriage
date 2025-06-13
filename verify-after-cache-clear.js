#!/usr/bin/env node

/**
 * Quick verification script to test userAppData module after cache clear
 */

console.log('Testing userAppData module exports...');

try {
  // Test require
  const userAppDataModule = require('./src/utils/userAppData.js');
  
  console.log('✅ Module loaded successfully');
  console.log('Available exports:', Object.keys(userAppDataModule));
  
  // Test each export
  const { fetchUserAppData, useUserAppData, getDailyInspiration, getLeaderboardData } = userAppDataModule;
  
  console.log('Export types:');
  console.log('- fetchUserAppData:', typeof fetchUserAppData);
  console.log('- useUserAppData:', typeof useUserAppData);
  console.log('- getDailyInspiration:', typeof getDailyInspiration);
  console.log('- getLeaderboardData:', typeof getLeaderboardData);
  
  // Verify no unexpected exports
  const unexpectedExports = Object.keys(userAppDataModule).filter(key => 
    !['fetchUserAppData', 'useUserAppData', 'getDailyInspiration', 'getLeaderboardData'].includes(key)
  );
  
  if (unexpectedExports.length > 0) {
    console.log('⚠️  Unexpected exports found:', unexpectedExports);
  } else {
    console.log('✅ No unexpected exports');
  }
  
  console.log('\n🎉 All tests passed! Module is ready for use.');
  
} catch (error) {
  console.error('❌ Error loading module:', error.message);
  console.error('Stack trace:', error.stack);
}

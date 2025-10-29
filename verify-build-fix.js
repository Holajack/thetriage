#!/usr/bin/env node

/**
 * Verification script to confirm build fixes are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Build Fix...\n');

const checks = [];

// Check 1: Verify userAppData.js doesn't import mock-admin-data
const userAppDataPath = path.join(__dirname, 'src/utils/userAppData.js');
const userAppDataContent = fs.readFileSync(userAppDataPath, 'utf8');

if (userAppDataContent.includes("require('../../scripts/mock-admin-data')")) {
  checks.push({ name: 'userAppData.js fix', status: '❌', message: 'Still contains old mock-admin-data import' });
} else if (userAppDataContent.includes('getLocalMockData')) {
  checks.push({ name: 'userAppData.js fix', status: '✅', message: 'Using inline mock data helper' });
} else {
  checks.push({ name: 'userAppData.js fix', status: '⚠️', message: 'No mock data helper found' });
}

// Check 2: Verify USE_MOCK_DATA is false
const useMockDataMatch = userAppDataContent.match(/const USE_MOCK_DATA = (true|false);/);
if (useMockDataMatch) {
  const value = useMockDataMatch[1];
  if (value === 'false') {
    checks.push({ name: 'USE_MOCK_DATA config', status: '✅', message: 'Set to false (uses real Supabase data)' });
  } else {
    checks.push({ name: 'USE_MOCK_DATA config', status: '⚠️', message: 'Set to true (uses mock data)' });
  }
} else {
  checks.push({ name: 'USE_MOCK_DATA config', status: '❌', message: 'Configuration not found' });
}

// Check 3: Verify metro.config.js has resolver improvements
const metroConfigPath = path.join(__dirname, 'metro.config.js');
const metroConfigContent = fs.readFileSync(metroConfigPath, 'utf8');

if (metroConfigContent.includes('resolver.sourceExts')) {
  checks.push({ name: 'Metro config optimization', status: '✅', message: 'Source extensions configured' });
} else {
  checks.push({ name: 'Metro config optimization', status: '⚠️', message: 'Source extensions not configured (optional)' });
}

// Check 4: Verify mock-admin-data script exists (should exist but not be imported)
const mockAdminDataPath = path.join(__dirname, 'scripts/mock-admin-data.js');
if (fs.existsSync(mockAdminDataPath)) {
  checks.push({ name: 'mock-admin-data.js', status: '✅', message: 'Exists (used only by scripts, not in app)' });
} else {
  checks.push({ name: 'mock-admin-data.js', status: '⚠️', message: 'Not found (not needed for app builds)' });
}

// Check 5: Verify Supabase client is properly imported
if (userAppDataContent.includes("require('./supabase')")) {
  checks.push({ name: 'Supabase integration', status: '✅', message: 'Supabase client imported correctly' });
} else {
  checks.push({ name: 'Supabase integration', status: '❌', message: 'Supabase client not found' });
}

// Print results
console.log('═══════════════════════════════════════════════════════════\n');
checks.forEach(check => {
  console.log(`${check.status} ${check.name}`);
  console.log(`   ${check.message}\n`);
});
console.log('═══════════════════════════════════════════════════════════\n');

// Summary
const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;
const warnings = checks.filter(c => c.status === '⚠️').length;

console.log('Summary:');
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  ⚠️  Warnings: ${warnings}`);
console.log('');

if (failed === 0) {
  console.log('✨ All critical checks passed! Your app is ready to build.');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: eas build --platform ios --profile production');
  console.log('  2. Or: eas build --platform android --profile production');
  console.log('');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review the issues above.');
  console.log('');
  process.exit(1);
}


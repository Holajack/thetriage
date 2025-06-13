// Quick test to verify userAppData exports
const userAppDataModule = require('./src/utils/userAppData');

console.log('=== USERAPPDATA MODULE TEST ===');
console.log('Module keys:', Object.keys(userAppDataModule));
console.log('useUserAppData type:', typeof userAppDataModule.useUserAppData);
console.log('getDailyInspiration type:', typeof userAppDataModule.getDailyInspiration);

if (userAppDataModule.useUserAppData) {
  console.log('✅ useUserAppData is available');
} else {
  console.log('❌ useUserAppData is missing');
}

if (userAppDataModule.getDailyInspiration) {
  console.log('✅ getDailyInspiration is available');
} else {
  console.log('❌ getDailyInspiration is missing');
}

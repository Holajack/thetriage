// Simple wrapper for userAppData exports
const userAppDataModule = require('./userAppData.js');

export const useUserAppData = userAppDataModule.useUserAppData;
export const getDailyInspiration = userAppDataModule.getDailyInspiration;
export const fetchUserAppData = userAppDataModule.fetchUserAppData;
export const getLeaderboardData = userAppDataModule.getLeaderboardData;
export const setConvexClient = userAppDataModule.setConvexClient;

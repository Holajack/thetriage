import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import FloatingNoraChatbot from '../components/FloatingNoraChatbot';
import { useAuth } from './AuthContext';

interface FloatingNoraContextType {
  currentScreen: string;
  contextData: any;
  setContextData: (data: any) => void;
  hideFloatingBot: () => void;
  showFloatingBot: () => void;
  isFloatingBotVisible: boolean;
}

const FloatingNoraContext = createContext<FloatingNoraContextType | undefined>(undefined);

export const FloatingNoraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, hasCompletedOnboarding } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [contextData, setContextData] = useState({});
  const [isFloatingBotVisible, setIsFloatingBotVisible] = useState(false); // Start with false since initial screen is Home
  const [navigationReady, setNavigationReady] = useState(false);
  const [navigationInstance, setNavigationInstance] = useState<any>(null);

  // Screen mapping for better context
  const getScreenDisplayName = (routeName: string) => {
    const screenMap: { [key: string]: string } = {
      'Home': 'Home',
      'NoraScreen': 'Nora Assistant',
      'EBooks': 'EBooks',
      'Leaderboard': 'Leaderboard',
      'Results': 'Results',
      'Settings': 'Settings',
      'Community': 'Community',
      'Profile': 'Profile',
      'Bonuses': 'Bonuses',
      'FocusSession': 'Focus Session',
      'Tasks': 'Tasks'
    };

    return screenMap[routeName] || routeName || 'Unknown';
  };

  // Determine if Nora should be shown based on screen name and auth status
  const shouldShowNora = (screenName: string = currentScreen) => {
    // Don't show if not authenticated or hasn't completed onboarding
    if (!isAuthenticated || !hasCompletedOnboarding) {
      return false;
    }

    // Get current route name to check against restricted screens
    const restrictedScreens = [
      'Landing',
      'Auth', 
      'Onboarding',
      'SplashScreen',
      'Home' // Add Home to restricted screens to remove chatbot from home screen only
    ];

    // Check if we're on a restricted screen - be more specific about Home screen
    const isHomeScreen = screenName === 'Home' || screenName.toLowerCase().includes('home');
    const isOtherRestrictedScreen = restrictedScreens.slice(0, -1).some(screen => screenName.includes(screen));
    
    return !isHomeScreen && !isOtherRestrictedScreen;
  };

  // Navigation tracking component that uses hooks safely
  const NavigationTracker = () => {
    const navigation = useNavigation();
    
    useEffect(() => {
      // Mark navigation as ready and store navigation instance
      setNavigationReady(true);
      setNavigationInstance(navigation);
      
      const unsubscribe = navigation.addListener('state', () => {
        try {
          const state = navigation.getState();
          if (state && state.routes && state.routes.length > 0) {
            const currentRouteIndex = state.index || 0;
            const currentRoute = state.routes[currentRouteIndex];
            
            let routeName = currentRoute.name;
            if (currentRoute.state && currentRoute.state.routes) {
              const nestedIndex = currentRoute.state.index || 0;
              const nestedRoute = currentRoute.state.routes[nestedIndex];
              routeName = nestedRoute.name;
            }
            
            const displayName = getScreenDisplayName(routeName);
            setCurrentScreen(displayName);
            
            if (routeName === 'NoraScreen') {
              setIsFloatingBotVisible(false);
            } else {
              // Use shouldShowNora logic to determine visibility
              const shouldShow = shouldShowNora(displayName);
              setIsFloatingBotVisible(shouldShow);
            }
          }
        } catch (error) {
          console.warn('FloatingNora: Error updating screen state:', error);
        }
      });

      // Set initial state
      try {
        const state = navigation.getState();
        if (state && state.routes && state.routes.length > 0) {
          const currentRouteIndex = state.index || 0;
          const currentRoute = state.routes[currentRouteIndex];
          let routeName = currentRoute.name;
          
          if (currentRoute.state && currentRoute.state.routes) {
            const nestedIndex = currentRoute.state.index || 0;
            const nestedRoute = currentRoute.state.routes[nestedIndex];
            routeName = nestedRoute.name;
          }
          
          const displayName = getScreenDisplayName(routeName);
          setCurrentScreen(displayName);
        }
      } catch (error) {
        console.warn('FloatingNora: Error setting initial screen:', error);
      }

      return unsubscribe;
    }, []);

    return null;
  };

  const hideFloatingBot = () => setIsFloatingBotVisible(false);
  const showFloatingBot = () => setIsFloatingBotVisible(true);
  
  // Handle navigation to full Nora screen
  const handleNavigateToNora = (messages: any[]) => {
    if (navigationInstance) {
      try {
        navigationInstance.navigate('Main', {
          screen: 'Nora',
          params: {
            preloadedMessages: messages,
            fromFloatingBot: true,
          }
        });
      } catch (error) {
        console.warn('FloatingNora: Error navigating to Nora screen:', error);
      }
    }
  };

  const value = {
    currentScreen,
    contextData,
    setContextData,
    hideFloatingBot,
    showFloatingBot,
    isFloatingBotVisible,
  };

  return (
    <FloatingNoraContext.Provider value={value}>
      <NavigationTracker />
      {children}
      {navigationReady && isFloatingBotVisible && shouldShowNora() && currentScreen !== 'Home' && (
        <FloatingNoraChatbot
          currentScreen={currentScreen}
          contextData={contextData}
          onNavigateToNora={handleNavigateToNora}
        />
      )}
    </FloatingNoraContext.Provider>
  );
};

export const useFloatingNora = () => {
  const context = useContext(FloatingNoraContext);
  if (context === undefined) {
    throw new Error('useFloatingNora must be used within a FloatingNoraProvider');
  }
  return context;
};
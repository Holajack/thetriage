import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WalkthroughContextType {
  isWalkthroughActive: boolean;
  startWalkthrough: () => void;
  endWalkthrough: () => void;
  shouldShowWalkthrough: boolean;
  setShouldShowWalkthrough: (show: boolean) => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

interface WalkthroughProviderProps {
  children: ReactNode;
}

export const WalkthroughProvider: React.FC<WalkthroughProviderProps> = ({ children }) => {
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [shouldShowWalkthrough, setShouldShowWalkthrough] = useState(false);

  const startWalkthrough = () => {
    setIsWalkthroughActive(true);
    setShouldShowWalkthrough(false);
  };

  const endWalkthrough = () => {
    setIsWalkthroughActive(false);
    setShouldShowWalkthrough(false);
  };

  const value = {
    isWalkthroughActive,
    startWalkthrough,
    endWalkthrough,
    shouldShowWalkthrough,
    setShouldShowWalkthrough,
  };

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (context === undefined) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }
  return context;
};
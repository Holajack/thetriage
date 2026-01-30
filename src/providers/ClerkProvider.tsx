import React, { useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

interface ClerkProviderProps {
  children: React.ReactNode;
}

// Custom token cache using expo-secure-store (official recommendation)
const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log('ClerkProvider: Token retrieved from cache');
      }
      return item;
    } catch (error) {
      console.error('ClerkProvider: SecureStore getToken error:', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('ClerkProvider: SecureStore saveToken error:', error);
    }
  },
};

// Clerk components loaded dynamically
let ClerkProviderBase: React.ComponentType<any> | null = null;
let ClerkLoaded: React.ComponentType<any> | null = null;

/**
 * ClerkProvider wraps the app with Clerk authentication.
 * Uses lazy loading to catch initialization errors.
 */
export function ClerkProvider({ children }: ClerkProviderProps) {
  const [clerkState, setClerkState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    const initClerk = async () => {
      console.log('ClerkProvider: Starting initialization...');
      console.log('ClerkProvider: Publishable key present:', !!publishableKey);

      if (!publishableKey || !publishableKey.startsWith('pk_')) {
        console.warn('ClerkProvider: Missing or invalid publishable key');
        setClerkState('error');
        setErrorMessage('Missing or invalid EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
        return;
      }

      console.log('ClerkProvider: Key prefix:', publishableKey.substring(0, 20));

      try {
        // Dynamically import Clerk to catch any module-level errors
        const clerkModule = await import('@clerk/clerk-expo');

        ClerkProviderBase = clerkModule.ClerkProvider;
        ClerkLoaded = clerkModule.ClerkLoaded;

        console.log('ClerkProvider: Clerk module loaded successfully');
        setClerkState('ready');
      } catch (error: any) {
        console.error('ClerkProvider: Failed to load Clerk module');
        console.error('ClerkProvider: Error:', error?.message || error);
        setClerkState('error');
        setErrorMessage(error?.message || 'Failed to load Clerk');
      }
    };

    initClerk();
  }, [publishableKey]);

  // Still loading
  if (clerkState === 'loading') {
    console.log('ClerkProvider: Still loading...');
    return <>{children}</>;
  }

  // Error or no Clerk available - render without auth
  if (clerkState === 'error' || !ClerkProviderBase || !ClerkLoaded) {
    console.warn('ClerkProvider: Running without Clerk auth:', errorMessage || 'Components not loaded');
    return <>{children}</>;
  }

  // Wrap in error boundary for runtime errors
  return (
    <ClerkErrorBoundary fallback={children}>
      <ClerkProviderBase publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          {children}
        </ClerkLoaded>
      </ClerkProviderBase>
    </ClerkErrorBoundary>
  );
}

// Error boundary specifically for Clerk
interface ClerkErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ClerkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ClerkErrorBoundary extends React.Component<ClerkErrorBoundaryProps, ClerkErrorBoundaryState> {
  constructor(props: ClerkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ClerkErrorBoundaryState {
    console.error('ClerkErrorBoundary: Caught error:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ClerkErrorBoundary: Error details:', error);
    console.error('ClerkErrorBoundary: Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      console.warn('ClerkErrorBoundary: Rendering without Clerk due to error');
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default ClerkProvider;

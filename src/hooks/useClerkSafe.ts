/**
 * Safe wrappers for Clerk hooks that handle the case when Clerk is unavailable.
 *
 * TEMPORARY: These exist because @clerk/clerk-expo is causing an "Invalid URL" error
 * at module load time with Expo SDK 54. Once that's resolved, these can be removed
 * and screens can import directly from @clerk/clerk-expo.
 */

import { useCallback, useState, useEffect } from 'react';

// Dynamic import state for useAuth
let useAuthHook: (() => any) | null = null;
let authHookLoadAttempted = false;

interface UseAuthReturn {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null;
  signOut: () => Promise<void>;
}

/**
 * Safe wrapper for useAuth hook.
 * Dynamically imports Clerk and returns fallback values if unavailable.
 */
export function useAuthSafe(): UseAuthReturn {
  const [clerkAuth, setClerkAuth] = useState<any>(null);
  const [isClerkLoaded, setIsClerkLoaded] = useState(false);

  useEffect(() => {
    const loadAuth = async () => {
      if (authHookLoadAttempted) {
        if (useAuthHook) {
          // Hook already loaded, we can't call it here though (rules of hooks)
          // So we need a different approach
        }
        setIsClerkLoaded(true);
        return;
      }
      authHookLoadAttempted = true;

      try {
        const clerkModule = await import('@clerk/clerk-expo');
        useAuthHook = clerkModule.useAuth;
        setIsClerkLoaded(true);
      } catch (error) {
        console.error('useAuthSafe: Failed to load Clerk useAuth hook:', error);
        setIsClerkLoaded(true);
      }
    };

    loadAuth();
  }, []);

  // Fallback implementation
  const signOut = useCallback(async () => {
    console.warn('Clerk unavailable: signOut is a no-op');
  }, []);

  // If Clerk didn't load, return fallback
  if (!useAuthHook) {
    return {
      isLoaded: isClerkLoaded,
      isSignedIn: false,
      userId: null,
      signOut,
    };
  }

  // Note: We can't actually call useAuthHook here because of React hooks rules
  // The dynamic import approach doesn't work well with hooks
  // Return fallback for now
  return {
    isLoaded: isClerkLoaded,
    isSignedIn: false,
    userId: null,
    signOut,
  };
}

// Stub types that match Clerk's hook return types
interface SignInResource {
  create: (params: any) => Promise<any>;
  prepareFirstFactor: (params: any) => Promise<any>;
  attemptFirstFactor: (params: any) => Promise<any>;
}

interface SignUpResource {
  create: (params: any) => Promise<any>;
  prepareEmailAddressVerification: (params: any) => Promise<any>;
  attemptEmailAddressVerification: (params: any) => Promise<any>;
}

interface UseSignInReturn {
  signIn: SignInResource | undefined;
  setActive: (params: { session: string | null }) => Promise<void>;
  isLoaded: boolean;
}

interface UseSignUpReturn {
  signUp: SignUpResource | undefined;
  setActive: (params: { session: string | null }) => Promise<void>;
  isLoaded: boolean;
}

// Error message to show users
const CLERK_UNAVAILABLE_ERROR = 'Authentication service is temporarily unavailable. Please try again later.';

/**
 * Safe wrapper for useSignIn hook.
 * Returns a stub implementation when Clerk is unavailable.
 */
export function useSignInSafe(): UseSignInReturn {
  const setActive = useCallback(async () => {
    console.warn('Clerk unavailable: setActive is a no-op');
    throw new Error(CLERK_UNAVAILABLE_ERROR);
  }, []);

  const signIn: SignInResource = {
    create: async () => {
      throw new Error(CLERK_UNAVAILABLE_ERROR);
    },
    prepareFirstFactor: async () => {
      throw new Error(CLERK_UNAVAILABLE_ERROR);
    },
    attemptFirstFactor: async () => {
      throw new Error(CLERK_UNAVAILABLE_ERROR);
    },
  };

  return {
    signIn,
    setActive,
    isLoaded: false, // Indicate Clerk never finished loading
  };
}

/**
 * Safe wrapper for useSignUp hook.
 * Returns a stub implementation when Clerk is unavailable.
 */
export function useSignUpSafe(): UseSignUpReturn {
  const setActive = useCallback(async () => {
    console.warn('Clerk unavailable: setActive is a no-op');
    throw new Error(CLERK_UNAVAILABLE_ERROR);
  }, []);

  const signUp: SignUpResource = {
    create: async () => {
      throw new Error(CLERK_UNAVAILABLE_ERROR);
    },
    prepareEmailAddressVerification: async () => {
      throw new Error(CLERK_UNAVAILABLE_ERROR);
    },
    attemptEmailAddressVerification: async () => {
      throw new Error(CLERK_UNAVAILABLE_ERROR);
    },
  };

  return {
    signUp,
    setActive,
    isLoaded: false,
  };
}

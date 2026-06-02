import React, { useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

interface ClerkProviderProps {
  children: React.ReactNode;
}

const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
};

let ClerkProviderBase: React.ComponentType<any> | null = null;
let ClerkLoaded: React.ComponentType<any> | null = null;

export function ClerkProvider({ children }: ClerkProviderProps) {
  const [clerkState, setClerkState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    const initClerk = async () => {
      if (!publishableKey || !publishableKey.startsWith("pk_")) {
        setClerkState("error");
        return;
      }

      try {
        const clerkModule = await import("@clerk/clerk-expo");
        ClerkProviderBase = clerkModule.ClerkProvider;
        ClerkLoaded = clerkModule.ClerkLoaded;
        setClerkState("ready");
      } catch {
        setClerkState("error");
      }
    };

    initClerk();
  }, [publishableKey]);

  if (clerkState === "loading") {
    return <>{children}</>;
  }

  if (clerkState === "error" || !ClerkProviderBase || !ClerkLoaded) {
    return <>{children}</>;
  }

  return (
    <ClerkErrorBoundary fallback={children}>
      <ClerkProviderBase
        publishableKey={publishableKey}
        tokenCache={tokenCache}
      >
        <ClerkLoaded>{children}</ClerkLoaded>
      </ClerkProviderBase>
    </ClerkErrorBoundary>
  );
}

interface ClerkErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ClerkErrorBoundaryState {
  hasError: boolean;
}

class ClerkErrorBoundary extends React.Component<
  ClerkErrorBoundaryProps,
  ClerkErrorBoundaryState
> {
  constructor(props: ClerkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ClerkErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default ClerkProvider;

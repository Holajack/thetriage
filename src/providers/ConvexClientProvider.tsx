import React, { useEffect, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { setConvexClient } from "../utils/convexClient";

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convex = useMemo(() => {
    const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

    if (
      !convexUrl ||
      convexUrl.trim() === "" ||
      !convexUrl.startsWith("http")
    ) {
      return null;
    }

    try {
      return new ConvexReactClient(convexUrl);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (convex) {
      setConvexClient(convex);
    }
  }, [convex]);

  if (!convex) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export default ConvexClientProvider;

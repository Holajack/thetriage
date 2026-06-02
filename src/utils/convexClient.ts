import { ConvexReactClient } from "convex/react";

let _client: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _client = client;
}

export function getConvexClient(): ConvexReactClient {
  if (!_client) {
    throw new Error(
      "Convex client not initialized. Call setConvexClient first.",
    );
  }
  return _client;
}

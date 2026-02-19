/**
 * Reactive hook that returns the user's currently equipped trail ID.
 *
 * Uses Convex's useQuery for real-time reactivity -- when the user equips
 * a new trail in the shop, all screens using this hook update automatically.
 *
 * Returns 'forest' (the default/free trail) when:
 * - No trail is equipped
 * - User is not authenticated
 * - The equipped trail has no available assets
 */
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { DEFAULT_TRAIL, isTrailAvailable, type TrailId } from '../config/trailAssets';

export function useEquippedTrail(): TrailId {
  const equippedItems = useQuery(api.inventory.getEquipped);

  if (!equippedItems) return DEFAULT_TRAIL;

  const equippedTrail = equippedItems.find(
    (item: any) => item.itemCategory === 'trail'
  );

  if (!equippedTrail) return DEFAULT_TRAIL;

  if (!isTrailAvailable(equippedTrail.itemId)) return DEFAULT_TRAIL;

  return equippedTrail.itemId as TrailId;
}

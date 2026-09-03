import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_KEY = "@age_gate_pending";
const DENIED_KEY = "@age_gate_denied";

export type PendingBirth = { birthYear: number; birthMonth: number };

function isPendingBirth(value: unknown): value is PendingBirth {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PendingBirth>;
  return (
    typeof candidate.birthYear === "number" &&
    typeof candidate.birthMonth === "number"
  );
}

/** Birth month and year captured before signup, applied once the account exists. */
export async function savePendingBirth(birth: PendingBirth): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(birth));
}

export async function readPendingBirth(): Promise<PendingBirth | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return isPendingBirth(parsed) ? parsed : null;
}

export async function clearPendingBirth(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

/** Remembered on the device so the back button is not a second try. */
export async function markAgeDenied(): Promise<void> {
  await AsyncStorage.setItem(DENIED_KEY, new Date().toISOString());
}

export async function wasAgeDenied(): Promise<boolean> {
  return (await AsyncStorage.getItem(DENIED_KEY)) !== null;
}

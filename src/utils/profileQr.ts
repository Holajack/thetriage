/**
 * The profile QR code carries the user id and, for teen accounts, the invite
 * code that lets an adult send them a friend request at all.
 */
export type ProfileQrPayload = { userId: string; inviteCode?: string };

const PROFILE_PATH = /profile\/([a-zA-Z0-9-]+)(?:\?invite=([A-Z0-9]+))?/;

function tryParseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

export function parseProfileQr(data: string): ProfileQrPayload | null {
  const parsed = tryParseJson(data);
  if (typeof parsed === "object" && parsed !== null) {
    const { userId, inviteCode } = parsed as {
      userId?: unknown;
      inviteCode?: unknown;
    };
    if (typeof userId === "string" && userId.length > 0) {
      return {
        userId,
        inviteCode: typeof inviteCode === "string" ? inviteCode : undefined,
      };
    }
  }
  const match = data.match(PROFILE_PATH);
  return match ? { userId: match[1], inviteCode: match[2] } : null;
}

export function buildProfileQr(profile: {
  userId: string | undefined;
  username: string | undefined;
  fullName: string | undefined;
  inviteCode: string | undefined;
}): string {
  const query = profile.inviteCode ? `?invite=${profile.inviteCode}` : "";
  return JSON.stringify({
    userId: profile.userId,
    username: profile.username,
    fullName: profile.fullName,
    inviteCode: profile.inviteCode,
    profileUrl: `hikewise://profile/${profile.userId}${query}`,
  });
}

// Ambiguous glyphs (0/O, 1/I) removed: codes get read aloud and typed in.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A human-friendly random code (room codes, friend invite codes). */
export function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

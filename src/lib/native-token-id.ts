/** The engine bearer is a public token ID followed by a secret. Keep only the ID. */
export function publicTokenId(bearer: string): string | null {
  const separator = bearer.indexOf(".");
  return separator > 0 ? bearer.slice(0, separator) : null;
}

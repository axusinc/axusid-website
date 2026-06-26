import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync("oauth-private.pem", privateKey);
writeFileSync("oauth-public.pem", publicKey);

console.log("Wrote oauth-private.pem and oauth-public.pem");
console.log("Add to .env.local:");
console.log(`OAUTH_JWT_PRIVATE_KEY="${privateKey.trim().replace(/\n/g, "\\n")}"`);
console.log(`OAUTH_JWT_PUBLIC_KEY="${publicKey.trim().replace(/\n/g, "\\n")}"`);

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

try {
  console.log("Generating SAML IdP private key and self-signed certificate using openssl...");
  execSync(
    'openssl req -x509 -newkey rsa:2048 -keyout saml-private.pem -out saml-cert.pem -days 3650 -nodes -subj "/CN=axusid-saml-idp"',
    { stdio: "inherit" }
  );

  const privateKey = readFileSync("saml-private.pem", "utf8");
  const certificate = readFileSync("saml-cert.pem", "utf8");

  console.log("\nSAML credentials generated successfully!");
  console.log("\nAdd the following lines to your .env.local file:\n");
  console.log(`SAML_IDP_PRIVATE_KEY="${privateKey.trim().replace(/\n/g, "\\n")}"`);
  console.log(`SAML_IDP_CERTIFICATE="${certificate.trim().replace(/\n/g, "\\n")}"`);
} catch (error) {
  console.error("Failed to generate SAML credentials using openssl:", error);
}

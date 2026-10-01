import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Troubleshoot AXUS ID sign-in",
  description:
    "Diagnose redirect URI mismatches, PKCE failures, missing claims, callback errors and refresh token rotation.",
};
const issues = [
  {
    id: "permissions", title: "A permission cannot be checked or shared",
    symptom: "The engine reports UNDECLARED_PERMISSION, INVALID_PERMISSION_BINDINGS, or an invariant/dynamic validation failure.",
    steps: [
      "Use the owner app’s permissionContext, or system context for AXUS ID capabilities. Identical keys in different contexts represent different permissions.",
      "Discover the declaration and provide valid typed bindings. Prefix wildcards such as identity.1.* cannot be delegated; parameter wildcards require allowWildcard.",
      "PERMISSION_VALIDATOR_UNAVAILABLE means the grant was rejected. Retry when the app’s validator is available. Degraded search only changes how values are entered.",
      "After app validation data changes, the owner should call notifyValidationChanged to clear cached verdicts. Existing NOT_AUTHORIZED and TOKEN_* errors keep their meanings.",
    ],
    link: "/developers/permissions#errors", cta: "Read permission error codes",
  },
  {
    id: "oauth-permissions",
    title: "Sign-in is denied or an optional feature is unavailable",
    symptom: "The callback reports access_denied or consent_required, or a requested scope is missing from the token response.",
    steps: [
      "Validate the callback state before handling errors. access_denied can mean cancelled consent, missing mandatory account access, or an engine denial. No code is issued; do not exchange or create a local session. The AXUS ID session remains active.",
      "Keep permissions your app requires in scope. Put user-controlled features in optional_scope and access required only when held in conditional_scope. Do not repeat a scope across lists; conditional_scope accepts AXUS permissions only.",
      "Only approved scopes appear in the token response's scope field. Declined optional scopes and unavailable optional or conditional permissions are omitted. Disable those features while allowing the remaining sign-in to finish.",
      "A held conditional permission cannot be turned off. If that feature should be user-controlled, request it in optional_scope instead. Effective permission checks run again when consent is submitted.",
      "Requesting a declined optional scope again requires consent. With prompt=none, consent_required means approval is needed; restart interactively. Use prompt=consent to review already approved choices.",
      "Permission service failures are errors, not evidence that the account lacks a permission. Retry when the service recovers; read approved scopes again after refreshing tokens.",
    ],
    link: "/developers/quickstart#permission-modes",
    cta: "Review the OAuth permission flow",
  },
  {
    id: "redirect",
    title: "The redirect URI is rejected",
    symptom:
      "Authorization stops before returning to your app, or the token exchange reports redirect_uri mismatch.",
    steps: [
      "Compare the registered URL, the authorize request and the token request character for character. Protocol, port, path, query and trailing slash all matter.",
      "Use the callback URL of your app, not an AXUS ID URL. Register local and deployed URLs independently.",
      "After correcting it, start a new sign-in. Do not reuse the previous authorization code.",
    ],
    link: "/developers/quickstart#register",
    cta: "Check registration",
  },
  {
    id: "pkce",
    title: "The token endpoint returns invalid_grant",
    symptom:
      "Code exchange fails with an expired code, PKCE verification failed, or a client/redirect mismatch.",
    steps: [
      "Check that client_id and redirect_uri are identical to those used to start authorization.",
      "Send the original verifier, not the challenge. Its SHA-256 digest must encode to the challenge with base64url, without padding.",
      "Use each code once, within five minutes — a failed exchange can consume it, so start a new flow instead of retrying. Inspect error_description on your server without logging codes, verifiers, or tokens.",
    ],
    link: "/developers/reference#token",
    cta: "Read token errors",
  },
  {
    id: "state",
    title: "The callback is missing its state or session",
    symptom:
      "Your app rejects the callback or works in one tab but fails in another.",
    steps: [
      "Confirm your login route saved a browser-bound transaction before redirecting, and your callback reads the same store — separate transactions per state, consumed atomically, so two tabs never overwrite each other.",
      "Use HttpOnly, SameSite=Lax cookies, Secure in production. Check cookie domain and path; localhost and 127.0.0.1 are different hosts.",
      "A link generated in the playground does not create your app's transaction. Test the complete flow from your app's login button.",
    ],
    link: "/developers/quickstart#callback",
    cta: "Review callback handling",
  },
  {
    id: "claims",
    title: "The profile is missing a name or email",
    symptom:
      "Sign-in succeeds, but a claim is absent or the email ends in @amail.com.",
    steps: [
      "Request profile for name and preferred_username, and email for the synthetic email claim — a compatibility address, not a verified contact. Treat names as optional and key users by issuer + sub.",
      "Check the token response's scope field for approved OIDC and AXUS scopes. Optional scopes may have been declined, and unavailable optional or conditional permissions are omitted.",
    ],
    link: "/developers/reference#userinfo",
    cta: "See claims by scope",
  },
  {
    id: "tokens",
    title: "Token verification or userinfo fails",
    symptom:
      "Your JWT library rejects the token, or /oauth/userinfo returns 401.",
    steps: [
      "Verify id_token with the issuer's JWKS, RS256, the exact issuer and client_id as audience. Check expiry and the transaction's nonce. Check your server clock too.",
      "Pass access_token to userinfo. The default access token is opaque; do not try to decode it as a JWT. Neither id_token nor axus_access_token belongs in this request.",
      "Request openid. Userinfo also rejects expired tokens, revoked authorizations and tokens whose profile cannot be resolved.",
      "On revocation or failed refresh, clear your local session as appropriate and offer a new sign-in. Never bypass token verification to make the login work.",
    ],
    link: "/developers/quickstart#verify",
    cta: "Review identity verification",
  },
  {
    id: "refresh",
    title: "Refreshing signs the user out",
    symptom:
      "A refresh request returns invalid_grant, sometimes after concurrent requests.",
    steps: [
      "Use the same client_id the refresh token was issued to. Tokens are bound to their client.",
      "Serialize refresh requests per authorization and save each returned replacement atomically. Do not let parallel requests overwrite a newer token.",
      "Old tokens have a 30-second retry grace period. Reuse outside that window revokes the authorization.",
      "If the authorization is revoked, request a fresh sign-in. Repeated retries with the stale token will not restore access.",
    ],
    link: "/developers/reference#refresh",
    cta: "Read refresh behavior",
  },
  {
    id: "cors",
    title: "The request works on the server, but not in the browser",
    symptom:
      "The browser reports a CORS error when exchanging the code or loading userinfo.",
    steps: [
      "Use your backend for token and userinfo requests. These endpoints do not advertise browser CORS support.",
      "For a React or static frontend, add a backend callback and session layer. Navigate the browser to /authorize; do not fetch the authorization page as an API.",
      "Do not work around this by using no-cors or exposing tokens in URLs. Follow the server-side integration pattern.",
    ],
    link: "/developers/quickstart",
    cta: "Use the server walkthrough",
  },
];

export default function TroubleshootingPage() {
  return (
    <>
      <p className="docs-eyebrow">Troubleshooting</p>
      <h1>
        Find the failure.
        <br />
        Keep building.
      </h1>
      <p className="docs-lead">
        Start with the symptom. Most integration issues come down to an exact
        URL, a lost transaction, or the wrong token in the right endpoint.
      </p>
      <section id="start" className="mt-8 space-y-3">
        {issues.map((issue) => (
          <details
            key={issue.id}
            id={issue.id}
            className="group rounded-2xl border border-black/[0.07] bg-white open:border-black/[0.12]"
          >
            <summary className="cursor-pointer p-5 text-sm font-semibold text-neutral-950 marker:text-neutral-400">
              {issue.title}
            </summary>
            <div className="px-5 pb-5">
              <p className="text-sm leading-7 text-neutral-500">
                {issue.symptom}
              </p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-neutral-600">
                {issue.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Link
                href={issue.link}
                className="docs-link mt-5 inline-block text-xs"
              >
                {issue.cta} →
              </Link>
            </div>
          </details>
        ))}
      </section>
      <section id="next" className="docs-section">
        <h2>Still investigating?</h2>
        <p>
          Record the failing endpoint, HTTP status, error code, environment and
          approximate time. Redact credentials, codes, cookies and personal data
          from screenshots or logs. Check{" "}
          <Link href="/status" className="docs-link">
            service status
          </Link>{" "}
          if the flow suddenly stops working without an app change.
        </p>
      </section>
    </>
  );
}

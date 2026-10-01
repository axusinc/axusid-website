# OAuth permission checks and troubleshooting

An account can hold a permission while its browser session cannot delegate it,
or while an OAuth app token cannot use it. Check the subject, credential and
permission context before treating different results as an engine inconsistency.

## Account access and token access answer different questions

| Check | What it establishes | Caller requirement |
| --- | --- | --- |
| `describePermission(contextAuid, permission)` | The key is declared and can be described | Does not establish a grant |
| `checkPermission(auid, permission, permissionContext)` | The target account currently holds the permission | Caller must have `identity.<auid>.grants.read` in the system context |
| `checkTokenPermission(permission, permissionContext)` | The authenticated bearer currently has effective access, including its scopes and delegation chain | A valid native bearer; no account introspection permission is needed |
| OAuth token response `scope` | The permissions approved for this authorization | A consent snapshot; does not establish current effective access |

Consent availability uses account access. A protected application API must enforce
both approved consent and effective access of the app's native token. An account-level
allow cannot substitute for a token-level allow. Do not request broad account
`grants.read` merely to authorize an app token, or substitute an operator credential
when the user's credential is absent.

For a pcap admin who is AUID 1, the account subject is `1`, the app context is `46`,
and the key is `admin.view`. The app's OAuth client ID also happens to be `46`;
client registration does not implicitly select a permission context.

```graphql
# Account diagnosis: use a caller authorized to inspect account 1.
query AccountAccess {
  checkPermission(auid: "1", permission: "admin.view", permissionContext: "46") {
    allowed reason
  }
}

# App authorization: send the app's axus_access_token in Authorization: Bearer.
query TokenAccess {
  checkTokenPermission(permission: "admin.view", permissionContext: "46") {
    allowed reason
  }
}
```

These queries may legitimately disagree. They evaluate different subjects.
`NOT_AUTHORIZED` from the account query can also mean the caller cannot inspect
that account; it does not establish that the target lacks `admin.view`.

## Context is part of the permission identity

`admin.view` in context 46 and the same key in the system context are different
permissions. OAuth requests use `app:46:admin.view`; unprefixed custom scopes use
the system context. Pass the same explicit context to engine checks and delegation.
Match the website's `AXUS_SYSTEM_CONTEXT_AUID` to the deployed engine's
`AXUS_ID_CONTEXT`; do not infer an environment's context from a local default.
Also check that the provider and application use the intended engine endpoint.

Publishing a declaration creates a valid key, not an account grant. Likewise,
`receivedPermissionContexts` lists contexts with stored ALLOW identity grants;
entries can remain present even when their grants do not currently confer access.
The first app grant is issued by an authorized owner with `issuePermission`.
Delegation requires existing authority and cannot bootstrap it.

## A browser session must be able to delegate app access

The original failure pattern was an account-level allow followed by an engine
denial during app token issuance. The account held the app permission, but the
browser's native session token requested only `*` in the system context.
Token-to-token issuance requires the requested permission on that caller token.

Primary browser authentication now requests `["*", "app:*:*"]`. Ordinary `*`
keeps its selected-context meaning. The primary-authentication option adds
identity-delegated wildcards for currently received app contexts, excluding the
system context. It creates no new account grant: effective access remains bounded
by the identity's current permissions. OAuth requests reject `app:*:*`, and
`loginWithToken` rejects it with `TOKEN_SCOPE_INVALID`.

Deploy engine support before the website and app changes that depend on it.
Then sign out of AXUS ID and complete a fresh primary sign-in. Reloading a page,
switching accounts, or refreshing an OAuth token does not widen an old browser
session. Newly received app contexts also require a fresh primary sign-in.
Newly available conditional permissions still require app authorization through
consent, even when the browser session already covers their context.

App tokens remain children of the browser token. Losing an account grant removes
effective access downstream; revoking the parent session invalidates its delegation
chain. App implementations must check this live rather than trusting old consent.

## Use the correct credential and preserve consent on refresh

Engine GraphQL accepts the native `axus_access_token`. The IdP's OAuth
`access_token` is used at IdP endpoints, including `/oauth/graphql`; it is not an
engine bearer. An `id_token` establishes identity and is not an API credential.
Verify its signature, issuer, audience, expiry and nonce, and require userinfo's
subject to match when both are used during callback verification.

Required, optional and conditional scope lists describe requests, not issued
access. Store the token response's approved `scope` and use the replacement set
after refresh. Empty or OIDC-only sets must clear old native permissions instead
of retaining them. Refresh renews credentials; it does not rerun conditional-scope
selection or approve newly available access. Serialize rotation for a session and
never allow a completed refresh to recreate a logged-out local session.

## Distinguish denial from a failed check

`access_denied` covers missing mandatory permissions, declined consent and engine
authorization failures during the flow. A generic callback banner is not proof
that the account lacks a grant. Inspect `error_description` and the failing engine
operation. In this incident, the generic description was produced from engine
`NOT_AUTHORIZED`, rather than the explicit missing-required-permissions error.

For application access checks, retain the distinction between `allowed: false`
and an operation that failed to establish access. Both deny the request, but an
outage should not be reported as a missing grant. The engine's invalid-token code
is `TOKEN_INVALID`. An undefined `checkTokenPermission` field means the endpoint
does not yet implement that API; falling back to an account check would change
the meaning of the authorization decision.

Permission caches must distinguish endpoint, check subject (account or token),
target account where applicable, context, key and a hash of the bearer. Identity
alone is insufficient: two tokens for the same person can have different scopes
or revocation state. Bypass stale allows at authorization gates. Long-lived
streams also need periodic session and permission checks; checking only when
opening an SSE connection leaves it active after access is lost.

Bind each OAuth state to the initiating browser as well as storing it server-side.
Consume it atomically once, including error callbacks. PKCE and nonce do not
replace browser binding of the local login transaction.

## Collect evidence that permits a meaningful comparison

Record the UTC timestamp, engine endpoint/deployment, operation name, selected
account, permission context and exact key, approved scopes, error code/description,
and a short hash of the caller credential. Preserve the engine's `allowed` and
`reason` fields. Record check failures separately from denials.

For pcap diagnostics, `--app 46` selects context; `--auid 1` explicitly selects
the consenting account. A `HAVE` result for AUID 46 establishes nothing about
AUID 1. A declaration description establishes key validity, not access.

Compare the same operation and subject, endpoint, context, key, credential and
permission state before attributing contrary verdicts to the engine. Account
checks, token checks and issuance guards deliberately evaluate different things;
timestamps also matter when grants, parent tokens or validator decisions change.
Never include bearer tokens, authorization codes, state values, PKCE verifiers,
cookies or passwords in an evidence bundle.

# Permission declarations: website implementation plan

Status: implementation complete; live engine integration and deployment remain unverified.

Later update: the current engine schema includes `permissionContext` on `loginWithToken`.
OAuth now accepts `axus:<app AUID>:<permission key>` and delegates additional contexts to
the same native token. The original rollout notes below describe the earlier contract.

Implemented the schema/SDK update, context-aware actions, declaration picker, complete-definition publisher, OAuth consent corrections, and developer guides below. Contract checks used the local AXUS ID engine source and its authoritative SDL.

Confirmed contract decisions:

- Configure `AXUS_SYSTEM_CONTEXT_AUID` to match the engine's `AXUS_ID_CONTEXT`; the website defaults to `4`.
- Parameter read APIs do not expose types, constraints, or wildcard eligibility. The picker uses suggestions and text input with engine validation; it does not advertise wildcard options. Owners publish complete JSON definitions.
- Custom OAuth permission scopes remain in system context because token issuance has no context argument. App-context checks and identity delegation are supported.
- Engine V32 removes legacy hierarchical grants. Publishing declarations does not provision initial grants; rollout requires engine-side reprovisioning.

Verification: 80 Node tests, lint, TypeScript, codegen, and production build. Browser checks used an isolated in-memory engine fixture to verify context-specific sharing, degraded search, rejected dynamic grants, same-name version replacement, and owned cache invalidation. Both guides were inspected on desktop/mobile without horizontal overflow. The local engine was unavailable, so live validation, outage/retry timing, and deployment still require an integrated environment. Temporary UI routes and mock processes were removed.

Deliver context-aware permission management, a declaration-driven sharing picker, app-owner publishing tools, and developer documentation for the new AXUS ID engine contract.

## 1. Establish the backend contract

Start with the engine's authoritative SDL and update `schema_prod.graphql`. The current snapshot has neither declaration APIs nor `PermissionGrant.permissionContext`; both SDK generation and `/developers/api` depend on it. Do not reconstruct unknown GraphQL types from the handoff's abbreviated field list.

Resolve these dependencies before implementing the affected behavior:

- The concrete system context AUID: declaration discovery requires `contextAuid: ID!`, although grant/check/delegate APIs default to system context when it is omitted.
- How clients read parameter types, constraints, and `allowWildcard`. The handoff's `PermissionDeclaration` and `ParamOption` fields do not expose them. Never infer wildcard eligibility or advertise constraints the API cannot supply.
- Exact `allowedValues` input shape, numeric scalar representation, binding serialization, and supported permission-key grammar. Preserve LONG precision and nested AUIDs; the current frontend character restrictions are not the new contract.
- How app-context permissions are represented in native login/token scopes. Existing login operations accept only `[String!]`; the handoff adds context to checks/delegations but specifies no context encoding for token issuance.
- Engine handling of existing undeclared and legacy wildcard grants after deployment, including any required engine migration.

Implementation decisions: use the engine as the authority for declarations, validation, and effective access. Initially use exact scope matching when deciding whether stored OAuth consent covers a request. Build a complete-definition JSON publisher so declaration authoring does not depend on an unspecified parameter-read API.

## 2. Update GraphQL operations and shared models

Change `src/graphql/operations/permissions.graphql`, then regenerate `src/graphql/sdk.ts` with `npm run codegen`.

- Request `permissionContext` for incoming grants, outgoing grants, and delegation results.
- Add optional `permissionContext` variables to `EffectivePermission` and `SharePermission`.
- Add operations for `permissionDeclarations`, `describePermission`, `permissionTree`, `searchPermissionValues`, `publishPermissionDeclaration`, and `notifyValidationChanged`.
- Use explicit selections from the actual schema. Traverse permission trees with a documented supported depth and detect unsupported deeper results; GraphQL cannot request arbitrary recursive depth.

Extend `src/lib/permission-types.ts` to carry context through requests, results, picker selections, and displayed permissions. A permission's identity is `(context, key)`, not its string key alone. Normalize omitted/null system context consistently with the system AUID returned by the engine. Apply this identity to caches, duplicate detection, React keys, and selection state.

Keep declaration data in the engine. This phase requires no website database migration. Any later OAuth context storage change depends on the confirmed token-scope contract.

## 3. Make permission actions and presentation context-aware

Update `src/app/actions/permissions.ts` and `src/lib/permission-presentation.ts`.

- Keep session-derived granter identity, server-side recipient username resolution, and ownership checks before revocation.
- Forward the selected permission context to every check/delegation. Declaration ownership, resource target, and delegator are separate concepts; do not infer one from another.
- Use `describePermission` for titles, descriptions, icons, parameter labels, and value labels. Resolve app names for context labels, with a neutral fallback when profile metadata is unavailable.
- Replace invented permission choices and legacy account-wide wildcard interpretations with declaration discovery. Existing system keys keep their meanings.
- Deduplicate outgoing shares by recipient, context, key, and relevant grant state. Identical keys from different apps must remain distinct.
- Keep metadata failure separate from access checks. Missing description data can fall back to an explicit raw key; it must not imply that an undeclared permission is usable.
- Preserve readable restricted, pending, paused, and unverified grant states, and the existing behavior that enrichment failure after successful delegation does not invite a duplicate retry.

Add all eight declaration errors to `src/lib/graphql-errors.ts` and permission-specific messages: `UNDECLARED_PERMISSION`, `INVALID_PERMISSION_BINDINGS`, `PERMISSION_INVARIANT_VIOLATED`, `PERMISSION_DYNAMIC_REJECTED`, `PERMISSION_VALIDATOR_UNAVAILABLE`, `INVALID_DECLARATION_TEMPLATE`, `DECLARATION_DUPLICATE`, and `INVALID_PARAM_DEF`. Distinguish invalid input, app rejection, and temporary validator unavailability. Preserve existing authorization, token, and rate-limit handling.

## 4. Build the declaration-driven sharing picker

Replace the flat dropdown in `src/app/account/permissions-section.tsx` with this flow:

1. Choose a context using friendly app names. Start with system context and contexts present in the account's grants; allow explicit app lookup by username without enumerating every AUID.
2. Load `permissionTree(contextAuid)` and browse groups/declarations. Discovery does not prove the account holds a permission.
3. Enter bindings using enum options and metadata. Add typed controls and constraint hints where the confirmed read API supports them. Offer `*` only when the declaration explicitly allows it.
4. Search dynamic values through `searchPermissionValues`, with bounded limits, debouncing, and stale-response protection. On `degraded: true`, provide raw input and the hint “Validated by app”. Search degradation does not relax grant validation.
5. Call `describePermission` for a live preview, then check the account's effective access in the same context.
6. Review the recipient, app context, permission, and chosen values; submit `delegatePermission` and refresh affected data.

Keep mutation validation authoritative in the engine even after a successful preview. Include loading, empty, failed, degraded, and access-changed states; keyboard operation; mobile layouts; and double-submit prevention. Render declaration metadata as data. Never execute `combinationInvariantJs` in the browser.

## 5. Add declaration publishing to the developer console

Add a Permission declarations card to `src/app/account/developer-section.tsx`, supported by authenticated server actions and a dedicated client component.

- List the signed-in app's declaration names, templates, versions, and display metadata.
- Publish a complete `PermissionDeclarationInput` from a JSON editor with validation and examples covering all six parameter types, constraints, metadata, invariant source, and validator URL.
- Derive `ownerAuid` from the active session. The engine must enforce `identity.<ownerAuid>.grants.delegate`.
- Explain that publishing the same name updates the existing declaration and increments its version. Show the complete proposed input before replacement.
- If full parameter definitions cannot be read back, require the owner to provide the complete original definition for republishing. Do not silently reconstruct an update from the returned summary fields.
- Support `notifyValidationChanged` for declarations owned by the active app, checking ownership server-side and refreshing relevant data after success.

## 6. Correct OAuth permission handling

Audit `src/lib/oauth/scopes.ts`, `src/lib/oauth/grants.ts`, authorization/consent pages and actions, and token issuance in `src/lib/oauth/adapter.ts`.

- Remove prefix wildcard implication from consent reuse. For example, `section.*.posts.create` must never imply `section.news.posts.delete` or arbitrary descendants. Use exact equality initially; broaden coverage only with declaration-aware semantics and tests.
- Preserve bare `*` as the engine's login/token scope meaning “everything the caller holds”. Do not store it as a permission grant or treat it as covering OIDC scopes.
- Replace guessed consent labels with declaration descriptions for contexts supported by the confirmed scope contract. Give the special token wildcard explicit, accurate consent copy.
- Handle undeclared/invalid requested permissions as authorization errors without clearing an otherwise valid session. Recheck at issuance rather than trusting display metadata.
- Preserve OIDC scope behavior, explicit session `SESSION_PERMISSIONS = ["*"]`, and the system rate-limit permission added to app tokens.

Until the backend supplies a context-aware token contract, keep ordinary OAuth permission scopes in system context and document app-context checks/delegations separately. Do not invent scope syntax or assume that `client_id` selects permission context. Complete app-context OAuth issuance only after that dependency is resolved.

## 7. Publish developer documentation

Add `/developers/permissions` for the permission model and delegation workflow, and `/developers/become-an-app` for publishing declarations and implementing a validator. Integrate both into `docs-index.ts`, developer landing-page links, and `src/app/sitemap.ts`. Update the API reference, troubleshooting page, README, integration examples, and relevant generated integration prompts.

Cover:

- Every user/AUID can own app permissions; context selects the owner app, and omitted context means system context.
- Templates; STRING, INTEGER, LONG, DOUBLE, BOOLEAN, and AUID bindings; enum/regex/length/number constraints; permitted parameter wildcards; combination invariants; and interpolated metadata.
- Valid `section.*.posts.create` examples with `allowWildcard: true`, rejected legacy stored grants such as `identity.1.*` and bare `*`, and the separate valid use of bare `*` in token scopes.
- All query/mutation signatures, context-aware examples, unchanged system keys, publishing authorization, template rules, and same-name version updates.
- Validator validation POST and response shapes; two-second timeout plus one retry; fail-closed grants; 60-second allow and 10-second deny caches.
- Validator search POST and value response shapes; degraded search with raw-input fallback; `notifyValidationChanged` after app data changes, requiring the owner's grants.delegate capability; and the fact that permission evaluation never calls the validator.
- Migration steps and the full new error-code reference with actionable troubleshooting.

The API explorer already renders the checked-in SDL. Verify that the refreshed snapshot displays every new operation and type, and add links to the new conceptual guides.

## 8. Validate and release

Update `tests/permissions.test.mjs` to replace obsolete wildcard fixtures and cover contract validation, context propagation, same-key cross-context isolation, recipient/granter authorization, declaration-driven display, duplicate sharing, revocation ownership, and new errors. Add focused picker, publisher, and OAuth coverage for wildcard restrictions, degraded search followed by rejected grants, stale previews, complete-definition updates, and consent reuse. Retain session/token regression checks.

Run codegen, TypeScript checking, lint, the relevant Node test suites, and a production build. Exercise the website against the updated engine with one system declaration and one app declaration containing typed, enum, wildcard, invariant, and dynamic parameters. Verify validator rejection, outage, search degradation, and cache invalidation using a controlled validator fixture. Inspect account, developer, consent, and documentation pages on desktop and mobile.

Coordinate engine schema/migration deployment with the website release. Verify the engine contract before enabling the new UI. Existing undeclared grants may be displayed as unavailable and remain removable where the engine allows; do not automatically broaden or rewrite them.

Acceptance criteria:

- Existing system account actions and login/token wildcard behavior still work.
- Different app contexts never share cache entries, checks, grants, or consent decisions by accident.
- Users can discover, preview, share, and remove declared permissions; validator failures cannot produce successful grants.
- App owners can publish complete declarations, republish by name, and invalidate validation caches.
- Developers can follow the documentation to publish a declaration and implement both validator actions.
- SDK, schema explorer, documentation, and behavior agree with the deployed engine contract.

Suggested implementation order: contract and SDK → context-aware actions/models → sharing picker → publisher → OAuth corrections → documentation → integrated verification and release. App-context OAuth and richer parameter controls remain explicitly gated on the contract answers in step 1.

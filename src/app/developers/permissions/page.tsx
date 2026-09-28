import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/ui/code-block";
import { getSystemPermissionContext } from "@/lib/permission-config";
import { permissionApiSignatures, permissionDiscoveryExample, permissionPreviewExample, permissionShareExample, permissionSearchExample } from "@/lib/permission-doc-examples";

export const metadata: Metadata = { title: "Declared permissions", description: "AXUS ID permission contexts, typed declarations, wildcard rules, discovery, previews and delegation." };
const errors = [
  ["UNDECLARED_PERMISSION", "The key matches no declaration in the selected context. Check the context and discover current declarations."],
  ["INVALID_PERMISSION_BINDINGS", "A value has the wrong type or violates a constraint, including wildcard eligibility."],
  ["PERMISSION_INVARIANT_VIOLATED", "The combination of values fails the app’s invariant. Choose a valid combination."],
  ["PERMISSION_DYNAMIC_REJECTED", "The app’s validator rejected the values. No grant was created."],
  ["PERMISSION_VALIDATOR_UNAVAILABLE", "The validator timed out or could not be reached. The grant is rejected; retry later."],
  ["INVALID_DECLARATION_TEMPLATE", "Check placeholder definitions and reserved or empty template literals."],
  ["DECLARATION_DUPLICATE", "Refresh declarations and check the publishing name."],
  ["INVALID_PARAM_DEF", "Check parameter names, types and constraints."],
];

export default function PermissionsDocsPage() {
  const systemContext = getSystemPermissionContext();
  return <>
    <p className="docs-eyebrow">Build & explore / Permissions</p>
    <h1>Describe access.<br /><span className="text-neutral-400">Share it precisely.</span></h1>
    <p className="docs-lead">Permissions are declared by the app that owns them. Each declaration defines a template, typed values, validation rules and the words people see when they share access.</p>
    <section id="contexts" className="docs-section">
      <h2>A context identifies the app that owns a permission.</h2>
      <p>Every AXUS ID user/AUID can be an app. A permission is identified by both its context and its key. The same key in two app contexts represents two different permissions. An app’s context is its owner AUID; it is separate from the account receiving or sharing access.</p>
      <p>AXUS ID system permissions live in the system context, currently <code>{systemContext}</code> on this website. Omitting <code>permissionContext</code> in checks or delegations selects the engine’s system context. Discovery and descriptions always require an explicit <code>contextAuid</code>.</p>
      <p>System keys keep their existing meanings: <code>identity.&lt;auid&gt;.username.write</code>, <code>.variation.write</code>, <code>.password.change</code>, <code>.token.issue</code>, <code>.grants.read</code>, <code>.grants.delegate</code>, <code>.mfa.read</code>, <code>.mfa.write</code>, <code>.parents.write</code>, <code>.parents.agree</code>, <code>.ratelimit.drain</code>, and <code>identity.&lt;context&gt;.create</code>.</p>
    </section>
    <section id="declarations" className="docs-section">
      <h2>A template defines which keys exist.</h2>
      <p>A declaration such as <code>section.&#123;section&#125;.posts.create</code> allows concrete keys such as <code>section.news.posts.create</code>. Each placeholder has a matching parameter definition. Types are STRING, INTEGER, LONG, DOUBLE, BOOLEAN and AUID.</p>
      <p>Parameters can restrict allowed values, regex, text length and numeric range. An optional JavaScript invariant checks combinations; a dynamic validator can check large or changing sets at grant time. Titles, descriptions and icons can include <code>&#123;param&#125;</code> interpolation. Parameter labels, descriptions, icons and hints explain individual choices; value search and descriptions can return value labels and icons.</p>
      <p>Bindings occupy individual dot-separated segments. Keep them as strings to preserve LONG values and nested AUIDs such as <code>1,2</code>. A value containing a dot adds a segment and will not match the template. DOUBLE values can use exponent notation without a dot, such as <code>125e-2</code> for 1.25. Boolean values are <code>true</code> or <code>false</code>.</p>
      <p>The current declaration summary and parameter-options APIs do not return parameter types, constraints or <code>allowWildcard</code>. Keep published source definitions in your app. A picker can use enums/search and text inputs, then let the engine validate its preview. Read the <Link href="/developers/become-an-app" className="docs-link">publishing guide</Link> to define permissions.</p>
    </section>
    <section id="wildcards" className="docs-section">
      <h2>Wildcards belong to parameters.</h2>
      <p><code>section.*.posts.create</code> is valid only if the declaration’s <code>section</code> parameter allows wildcards. It covers the same declared action across section values. It does not cover <code>posts.delete</code> or arbitrary descendants.</p>
      <p>Legacy stored grants such as <code>identity.1.*</code> and bare <code>*</code> cannot be created through delegation. Bare <code>*</code> remains valid in login/token permission scopes, where it means everything the caller holds in the token’s context. Internal account authority may still be exposed by the engine as <code>identity.&lt;auid&gt;.*</code> for display; share a concrete declared capability instead.</p>
    </section>
    <section id="picker" className="docs-section">
      <h2>Build a sharing picker from declarations.</h2>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-neutral-600">
        <li>Load <code>permissionTree</code> and declaration summaries for the selected app. Render groups, declarations and parameter options. Discovery alone does not prove the signed-in account holds access.</li>
        <li>Use <code>searchPermissionValues</code> for dynamic parameters. Debounce searches and discard stale responses. Honor <code>degraded: true</code> with raw input and a “Validated by app” hint.</li>
        <li>Build a key from the selected bindings. Call <code>describePermission</code> for a live preview and <code>checkPermission</code> for effective access, with the same context.</li>
        <li>Review the recipient and values, then call <code>delegatePermission</code>. Validation happens again at grant time; a preview is not a promise that a later grant will succeed.</li>
      </ol>
      <CodeBlock label="Discover declarations and groups" code={permissionDiscoveryExample} />
      <CodeBlock label="Search a dynamic parameter" code={permissionSearchExample} />
      <CodeBlock label="Describe and check the same permission context" code={permissionPreviewExample} />
      <CodeBlock label="Delegate access" code={permissionShareExample} />
      <p>Send the native AXUS token as <code>Authorization: Bearer …</code>. Sharing requires the granter’s system capability <code>identity.&lt;granter&gt;.grants.delegate</code> and the granter must hold the requested permission. Reading incoming and outgoing grants requires <code>identity.&lt;auid&gt;.grants.read</code>. Grant results include nullable <code>permissionContext</code>; null means system context. Use that context in later checks and displays.</p>
    </section>
    <section id="oauth" className="docs-section">
      <h2>OAuth scopes and app contexts.</h2>
      <p>The four OIDC scopes control identity claims and refresh tokens. Custom OAuth permission scopes currently use system-context declared keys, because native login/token mutations accept a string list without a permission-context argument. An OAuth client ID does not select a permission context. App-context checks and identity delegations use the explicit GraphQL context arguments shown above; app-context token issuance needs an engine API extension.</p>
      <p>The website reuses consent only for exactly matching scopes. A token wildcard does not include OIDC scopes. Undeclared keys or invalid bindings produce <code>invalid_scope</code>; validator outages produce <code>server_error</code>. Existing sessions are retained so the person can correct the request.</p>
    </section>
    <section id="api" className="docs-section">
      <h2>Permission API signatures.</h2>
      <CodeBlock label="Engine GraphQL contract" code={permissionApiSignatures} />
      <p>Inspect every input and return type in the <Link href="/developers/api" className="docs-link">schema explorer</Link>. <code>DescribedPermission.params</code> returns labels, descriptions, hints and value labels/icons; <code>ParamOption</code> returns values plus dynamic/degraded state.</p>
    </section>
    <section id="errors" className="docs-section">
      <h2>Validation errors reject grants.</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">extensions.code</th><th className="p-3">What to do</th></tr></thead><tbody>{errors.map(([code, explanation]) => <tr key={code} className="border-t border-neutral-200"><td className="p-3 align-top"><code>{code}</code></td><td className="p-3 text-neutral-600">{explanation}</td></tr>)}</tbody></table></div>
      <p>Existing <code>NOT_AUTHORIZED</code> and <code>TOKEN_*</code> meanings are unchanged. Metadata/search availability never grants access, and degraded search never bypasses a validator.</p>
    </section>
    <section id="migration" className="docs-section">
      <h2>Migrate free-form permissions.</h2>
      <p>Publish declarations for each app’s permissions, replace legacy wildcard delegation with declared actions and allowed parameter wildcards, and preserve context alongside every grant key. Regenerate client SDKs and replace label guessing with permission descriptions.</p>
      <p>The engine’s V32 migration removes old HierarchicalPermission grants. Coordinate engine rollout and permission reprovisioning before deployment; existing identities and app authorizations may need new authority grants and sign-in. The website does not recreate removed grants automatically. Account-root authority and newly published declarations are separate: publishing a declaration does not grant it to its owner or anyone else.</p>
    </section>
  </>;
}

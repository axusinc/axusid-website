import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/ui/code-block";
import { declarationExample } from "@/lib/permission-declaration-input";
import { permissionPublishExample, permissionInvalidateExample } from "@/lib/permission-doc-examples";

export const metadata: Metadata = { title: "Become an AXUS ID app", description: "Publish permission declarations, personalize permission descriptions, validate values and invalidate cached verdicts." };
const dynamicDeclaration = {
  name: "identity.videos.edit", template: "identity.{subject}.videos.edit",
  params: [{ name: "subject", type: "AUID", allowWildcard: false, label: "Video owner", description: "The account whose videos may be edited.", hint: "Search for an account in this app." }],
  validatorUrl: "https://app.example.com/axus/permission-validator",
  title: "Edit videos owned by {subject}", description: "Edit this account’s videos in our app.", icon: "layers",
};

export default function BecomeAnAppPage() {
  return <>
    <p className="docs-eyebrow">Build & explore / Become an app</p>
    <h1>Your AUID.<br /><span className="text-neutral-400">Your permission model.</span></h1>
    <p className="docs-lead">Every AXUS ID account can own an app context. Publish declarations under your AUID so AXUS ID can validate and describe the access your app supports.</p>
    <section id="publish" className="docs-section">
      <h2>Publish the complete definition.</h2>
      <p>Open <Link href="/account?section=developer" className="docs-link">Account → Developer → Permission declarations</Link> or call the mutation below. Use your own AUID as <code>ownerAuid</code>; it becomes the declaration context. Publishing requires your system capability <code>identity.&lt;owner&gt;.grants.delegate</code>.</p>
      <CodeBlock label="Publish with GraphQL variables" code={permissionPublishExample} />
      <CodeBlock label="Static declaration — pass as declaration" code={JSON.stringify(declarationExample, null, 2)} />
      <p>Every <code>&#123;param&#125;</code> template segment must have a matching entry in <code>params</code>. Empty literals and literal <code>*</code> or <code>?</code> are reserved. Parameter names must be unique. Publishing the same name updates the existing declaration in place and increments its version. Keep the full definition in your app’s source and submit it again when updating.</p>
      <p>Publishing defines valid keys; it does not create permission grants. Arrange initial app-context grants through the engine’s provisioning process, then use delegation for holders to share access.</p>
    </section>
    <section id="parameters" className="docs-section">
      <h2>Types, constraints and display metadata.</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Type</th><th className="p-3">Binding</th></tr></thead><tbody>{[
        ["STRING", "Text in one dot-separated segment"], ["INTEGER", "Signed 32-bit integer text"], ["LONG", "Signed 64-bit integer text; keep it as a string"], ["DOUBLE", "Numeric text; exponent notation avoids a dot within a segment"], ["BOOLEAN", "Exactly true or false"], ["AUID", "An AUID, including comma-separated nested IDs"],
      ].map(([type, detail]) => <tr key={type} className="border-t border-neutral-200"><td className="p-3"><code>{type}</code></td><td className="p-3 text-neutral-600">{detail}</td></tr>)}</tbody></table></div>
      <p><code>ParamDefInput</code> supports <code>name</code>, <code>type</code> (default STRING), <code>allowWildcard</code> (default false), <code>allowedValues: [String!]</code>, <code>regex</code>, <code>minLength</code>/<code>maxLength</code>, <code>minNumber</code>/<code>maxNumber</code>, and <code>label</code>, <code>description</code>, <code>icon</code>, <code>hint</code>. Numeric constraints use GraphQL Float. Allowed values remain strings for every type.</p>
      <p>The declaration supports <code>title</code>, <code>description</code>, <code>icon</code>, <code>validatorUrl</code>, <code>combinationInvariantJs</code> and <code>order</code>. Lower order numbers appear first in declaration lists and permission pickers; declarations without an order come last, with names breaking ties. Titles and descriptions can interpolate bindings using <code>&#123;param&#125;</code>. The app can also personalize permission and parameter text through the <Link href="#describe" className="docs-link">describe protocol</Link>. The current publishing input does not expose static per-value metadata maps. The website renders recognized icon names such as <code>key</code>, <code>shield</code>, <code>layers</code> and <code>file-plus</code>, with a default icon for others.</p>
      <p>For a range declaration with INTEGER parameters named <code>from</code> and <code>to</code>, a combination invariant can be <code>{'function(bindings) { return Number(bindings.from) <= Number(bindings.to); }'}</code>. AXUS ID evaluates it; frontend previews never execute the source. Avoid converting LONG values to JavaScript Number in your own invariants.</p>
    </section>
    <section id="validator" className="docs-section">
      <h2>Validate large or changing sets in your app.</h2>
      <p>Use <code>validatorUrl</code> when static allowed values cannot represent the set, such as millions of users. AXUS ID calls the endpoint when granting a permission. It does not call it during permission evaluation.</p>
      <CodeBlock label="Dynamic declaration" code={JSON.stringify(dynamicDeclaration, null, 2)} />
      <CodeBlock label="Validate: POST to validatorUrl" code={JSON.stringify({ action: "validate", declarationId: "DECLARATION_UUID", bindings: { subject: "100000000" } }, null, 2)} />
      <CodeBlock label="Validation responses" code={'{"allowed": true}\n\n{"allowed": false, "reason": "This account cannot edit these videos"}'} />
      <p>There is a two-second timeout and one retry. A timeout, unavailable endpoint or rejected verdict fails closed: no grant is created. Allowed verdicts are cached for 60 seconds and denied verdicts for 10 seconds. Make validation side-effect-free so retries are safe.</p>
    </section>
    <section id="search" className="docs-section">
      <h2>Return friendly values for the picker.</h2>
      <CodeBlock label="Search: POST to the same validatorUrl" code={JSON.stringify({ action: "search", declarationId: "DECLARATION_UUID", param: "subject", query: "alex", limit: 20 }, null, 2)} />
      <CodeBlock label="Search response" code={JSON.stringify({ values: [{ value: "100000000", label: "Alex", icon: "users", description: "Community video owner" }] }, null, 2)} />
      <p>Filter by the query and respect the limit. Search failure yields <code>degraded: true</code> to the picker instead of a search error. People can enter a raw value with the hint “Validated by app”; the subsequent grant still requires successful validation. Search suggestions and display labels are not authorization decisions.</p>
    </section>
    <section id="describe" className="docs-section">
      <h2>Personalize permission text for each binding.</h2>
      <p>When someone previews a concrete permission with <code>describePermission</code>, AXUS ID sends its bindings to the same <code>validatorUrl</code>. Return only the fields you want to personalize. For example, your app can resolve an AUID to <code>@likespro</code> for the permission title and the parameter label.</p>
      <CodeBlock label="Describe: POST to validatorUrl" code={JSON.stringify({ action: "describe", declarationId: "DECLARATION_UUID", bindings: { subject: "100000000" } }, null, 2)} />
      <CodeBlock label="Describe response" code={JSON.stringify({ title: "Edit videos owned by @likespro", description: "Edit @likespro’s videos in our app.", params: { subject: { label: "Video owner @likespro", description: "The account whose videos may be edited." } } }, null, 2)} />
      <p><code>title</code>, <code>description</code>, and each parameter’s <code>label</code> and <code>description</code> are optional. Missing fields use the declaration text, with <code>&#123;param&#125;</code> replaced by the binding. If the endpoint fails or times out, the preview uses that declaration text. This affects display only; grant validation still uses the separate <code>validate</code> action.</p>
    </section>
    <section id="invalidate" className="docs-section">
      <h2>Notify AXUS ID when validation data changes.</h2>
      <p>After changing data that affects verdicts, call <code>notifyValidationChanged(declarationId)</code> to drop cached allow and deny verdicts. This requires the declaration owner’s <code>grants.delegate</code> capability. The developer console also provides a manual Clear validation cache action.</p>
      <CodeBlock label="Invalidate cached verdicts" code={permissionInvalidateExample} />
      <p>Invalidation changes future grant validation. It is not grant revocation. Existing grants are evaluated without calling your endpoint; explicitly revoke access when your application needs to remove an existing grant.</p>
    </section>
    <section id="next" className="docs-section">
      <h2>Discover, describe and delegate.</h2>
      <p>Use the <Link href="/developers/permissions#picker" className="docs-link">permission picker workflow</Link> and the <Link href="/developers/api" className="docs-link">GraphQL schema explorer</Link> for exact signatures and return types. Your app context must be forwarded with every identity permission check and delegation. OAuth scopes for your app use <code>app:&lt;your AUID&gt;:&lt;permission key&gt;</code>; unprefixed scopes use the AXUS ID system context.</p>
      <p>Choose permission behavior when starting OAuth authorization: <code>scope</code> for access the app requires, <code>optional_scope</code> for features the user may decline, and <code>conditional_scope</code> for access required only when the account already holds it. Missing mandatory access stops sign-in with <code>access_denied</code>. Enable features from the approved scopes returned by the token endpoint. See the <Link href="/developers/quickstart#permission-modes" className="docs-link">request and consent walkthrough</Link>.</p>
    </section>
  </>;
}

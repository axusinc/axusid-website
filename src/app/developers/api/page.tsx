import type { Metadata } from "next";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildSchema,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLScalarType,
  type GraphQLNamedType,
} from "graphql";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyField } from "@/components/ui/copy-field";
import { ApiBrowser, type ApiOp, type ApiType } from "./api-browser";

export const metadata: Metadata = {
  title: "GraphQL API explorer",
  description:
    "Every query, mutation, and type in the AXUS engine GraphQL API, rendered from the production schema.",
};

const LIVE_ENDPOINT = "https://axusid.thewinelore.com/graphql";

function toOp(type: GraphQLObjectType, name: string): ApiOp {
  const field = type.getFields()[name];
  return {
    name,
    args: field.args.map((a) => ({ name: a.name, type: String(a.type) })),
    returns: String(field.type),
    description: field.description ?? null,
  };
}

function toType(t: GraphQLNamedType): ApiType | null {
  if (t.name.startsWith("__")) return null;
  if (t instanceof GraphQLObjectType || t instanceof GraphQLInputObjectType) {
    return {
      name: t.name,
      kind: t instanceof GraphQLInputObjectType ? "input" : "object",
      description: t.description ?? null,
      fields: Object.values(t.getFields()).map((f) => ({
        name: f.name,
        type: String(f.type),
      })),
      values: null,
    };
  }
  if (t instanceof GraphQLEnumType) {
    return {
      name: t.name,
      kind: "enum",
      description: t.description ?? null,
      fields: null,
      values: t.getValues().map((v) => v.name),
    };
  }
  if (t instanceof GraphQLScalarType) {
    if (["String", "Int", "Float", "Boolean", "ID"].includes(t.name)) return null;
    return { name: t.name, kind: "scalar", description: t.description ?? null, fields: null, values: null };
  }
  return null;
}

export default async function ApiPage() {
  const sdl = await readFile(path.join(process.cwd(), "schema_prod.graphql"), "utf-8");
  const schema = buildSchema(sdl);
  const queryType = schema.getQueryType()!;
  const mutationType = schema.getMutationType()!;
  const queries = Object.keys(queryType.getFields()).map((n) => toOp(queryType, n));
  const mutations = Object.keys(mutationType.getFields()).map((n) => toOp(mutationType, n));
  const types = Object.values(schema.getTypeMap())
    .map(toType)
    .filter((t): t is ApiType => t !== null)
    .filter((t) => t.name !== "Query" && t.name !== "Mutation")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <p className="docs-eyebrow">Reference / GraphQL API</p>
      <h1>
        The whole API,
        <br />
        <span className="text-neutral-400">on one page.</span>
      </h1>
      <p className="docs-lead">
        Every operation the engine speaks, rendered from the production schema —{" "}
        {queries.length} queries, {mutations.length} mutations. This is the
        functions half of AXUS ID; sign-in itself is standard OAuth2/OIDC,
        covered in the{" "}
        <Link href="/developers/reference" className="docs-link">
          OAuth reference
        </Link>
        . Filter, expand, copy the signature. Permission contexts and declarations
        are explained in the <Link href="/developers/permissions" className="docs-link">permission guide</Link>;
        use the <Link href="/developers/become-an-app" className="docs-link">app publishing guide</Link> for validators.
      </p>

      <section id="endpoint" className="docs-section">
        <h2>Talk to it</h2>
        <p>
          Send JSON GraphQL over HTTPS with your app’s{" "}
          <code>axus_access_token</code> as the bearer — the only credential the
          engine accepts. It arrives inside the OAuth token response; browser
          apps can also go through the <code>/oauth/graphql</code> proxy
          instead. Endpoint behavior is covered in the{" "}
          <Link href="/developers/reference#graphql" className="docs-link">
            OAuth reference
          </Link>
          .
        </p>
        <div className="mt-5 grid gap-4">
          <CopyField label="Live endpoint" value={LIVE_ENDPOINT} />
        </div>
        <div className="mt-4">
          <CodeBlock
            label="Example request"
            code={`curl --request POST '${LIVE_ENDPOINT}' \\\n  --header 'Authorization: Bearer AXUS_ACCESS_TOKEN' \\\n  --header 'Content-Type: application/json' \\\n  --data '{"query":"{ checkPermission(auid: \\"YOUR_AUID\\", permission: \\"identity.YOUR_AUID.grants.read\\") { allowed reason } }"}'`}
          />
        </div>
      </section>

      <section id="browse" className="docs-section">
        <h2>Browse the schema</h2>
        <div className="mt-5">
          <ApiBrowser queries={queries} mutations={mutations} types={types} />
        </div>
      </section>
    </>
  );
}

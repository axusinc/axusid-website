import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: process.env.USE_REMOTE_GRAPHQL_SCHEMA === "true" && process.env.AUTH_GRAPHQL_ENDPOINT
    ? process.env.AUTH_GRAPHQL_ENDPOINT
    : "./schema_prod.graphql",
  documents: "src/graphql/operations/**/*.graphql",
  generates: {
    "src/graphql/sdk.ts": {
      plugins: [
        {
          typescript: {
            typesPrefix: "Schema",
          },
        },
        "typescript-operations",
        "typescript-graphql-request",
      ],
      config: {
        rawRequest: false,
        useTypeImports: true,
      },
    },
  },
  ignoreNoDocuments: false,
};

export default config;

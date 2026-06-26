import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: process.env.AUTH_GRAPHQL_ENDPOINT ?? "http://localhost:8081/graphql",
  documents: "src/graphql/operations/**/*.graphql",
  generates: {
    "src/graphql/sdk.ts": {
      plugins: [
        "typescript",
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

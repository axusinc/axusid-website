import "server-only";

import { GraphQLClient } from "graphql-request";
import { getSdk } from "@/graphql/sdk";

function getEndpoint(): string {
  const endpoint = process.env.AUTH_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    throw new Error("AUTH_GRAPHQL_ENDPOINT is not configured");
  }
  return endpoint;
}

export function createAuthGraphqlClient(accessToken?: string): GraphQLClient {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return new GraphQLClient(getEndpoint(), { headers });
}

export function getAuthSdk(accessToken?: string) {
  return getSdk(createAuthGraphqlClient(accessToken));
}

export type AuthCredentials = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

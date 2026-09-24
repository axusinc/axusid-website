"use client";

import { createContext, useContext, useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";

const SettingsContext = createContext<{
  client: string;
  redirect: string;
  setClient: (value: string) => void;
  setRedirect: (value: string) => void;
} | null>(null);

export function IntegrationSettings({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState("");
  const [redirect, setRedirect] = useState(
    "http://localhost:3000/api/auth/axus/callback",
  );
  return (
    <SettingsContext.Provider
      value={{ client, redirect, setClient, setRedirect }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useIntegrationSettings() {
  const settings = useContext(SettingsContext);
  if (!settings)
    throw new Error("Integration settings require the docs layout");
  return settings;
}

export function integrationConfig(
  issuer: string,
  client: string,
  redirect: string,
) {
  return `AXUS_ISSUER=${JSON.stringify(issuer)}\nAXUS_CLIENT_ID=${JSON.stringify(client.trim() || "YOUR_AUID")}\nAXUS_REDIRECT_URI=${JSON.stringify(redirect)}`;
}

export function IntegrationConfig({ issuer }: { issuer: string }) {
  const { client, redirect } = useIntegrationSettings();
  return (
    <CodeBlock
      label=".env.local · in your app"
      code={integrationConfig(issuer, client, redirect)}
    />
  );
}

import { DocsShell } from "./docs-shell";
import "./docs.css";
import { IntegrationSettings } from "./integration-settings";

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IntegrationSettings>
      <DocsShell>{children}</DocsShell>
    </IntegrationSettings>
  );
}

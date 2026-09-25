import { DocsShell } from "./docs-shell";
import "./docs.css";

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsShell>{children}</DocsShell>;
}

import { notFound } from "next/navigation";
import { getClientForOwner } from "@/lib/oauth/client-store";
import { requireDeveloperSession } from "@/lib/oauth/developer";
import { EditClientForm } from "./edit-client-form";

type ClientDetailPageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const session = await requireDeveloperSession();
  const { clientId } = await params;
  const query = await searchParams;
  const client = await getClientForOwner(clientId, session.auid);

  if (!client) {
    notFound();
  }

  return (
    <EditClientForm
      client={client}
      created={query.created === "1"}
    />
  );
}

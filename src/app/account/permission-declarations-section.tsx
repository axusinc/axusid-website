"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { declarationAction } from "@/app/actions/permission-declarations";
import { declarationExample, parseDeclarationJson } from "@/lib/permission-declaration-input";
import type { DeclarationSummaryFragment } from "@/graphql/sdk";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Spinner } from "@/components/ui/spinner";

export function PermissionDeclarationsSection() {
  const [declarations, setDeclarations] = useState<DeclarationSummaryFragment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [json, setJson] = useState(JSON.stringify(declarationExample, null, 2));
  const [review, setReview] = useState<{ name: string; json: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  useEffect(() => {
    let cancelled = false;
    declarationAction({ kind: "list" }).then((result) => {
      if (cancelled) return;
      if (result.declarations) setDeclarations(result.declarations);
      setError(result.error ?? ""); setLoaded(true);
    }).catch(() => { if (!cancelled) { setError("Couldn’t load declarations. Please try again."); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [reload]);
  const existing = declarations.find((item) => item.name === review?.name);
  return <Card>
    <CardHeader icon={<KeyRound aria-hidden />} title="Permission declarations" description="Define the permissions your app owns, then let people share specific access." />
    <p className="mt-4 text-sm text-neutral-500">Every AXUS ID account can be an app. <Link href="/developers/become-an-app" className="underline underline-offset-4">Read the publishing guide</Link>.</p>
    {!loaded ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-neutral-500"><Spinner />Loading declarations…</p> : <div className="mt-5 space-y-3">
      {declarations.length ? <ul className="divide-y divide-black/[0.05]">{declarations.map((item) => <li key={item.id} className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{item.name} <span className="text-xs font-normal text-neutral-500">Version {item.version}</span></span>
          <Button size="sm" variant="secondary" disabled={pending || review !== null} onClick={async () => {
            if (submitting.current) return;
            submitting.current = true; setPending(true); setError(""); setMessage("");
            try { const result = await declarationAction({ kind: "invalidate", declarationId: item.id }); if (result.error) setError(result.error); if (result.invalidated) setMessage(`Cached validation cleared for ${item.name}.`); }
            catch { setError("Couldn’t clear cached validation. Please try again."); }
            finally { submitting.current = false; setPending(false); }
          }}>Clear validation cache</Button>
        </div>
        <code className="mt-1 block break-all text-xs text-neutral-500">{item.template}</code>
      </li>)}</ul> : <p className="text-sm text-neutral-500">You haven’t published any declarations yet.</p>}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setLoaded(false); setReload((value) => value + 1); }}>Refresh declarations</Button>
    </div>}
    <form className="mt-6 space-y-4 border-t border-black/[0.06] pt-5" onSubmit={async (event) => {
      event.preventDefault();
      if (submitting.current) return;
      setError(""); setMessage("");
      if (!review) {
        const parsed = parseDeclarationJson(json);
        if (parsed.error) { setError(parsed.error); return; }
        setReview({ name: parsed.declaration!.name, json: JSON.stringify(parsed.declaration, null, 2) });
        return;
      }
      submitting.current = true; setPending(true);
      try {
        const result = await declarationAction({ kind: "publish", json: review.json });
        if (result.error) setError(result.error);
        if (result.published) { const published = result.published; setDeclarations((items) => [...items.filter((item) => item.id !== published.id), published]); setMessage(`${published.name} published as version ${published.version}.`); setReview(null); }
      } catch { setError("Couldn’t publish this declaration. Please try again."); }
      finally { submitting.current = false; setPending(false); }
    }}>
      <Textarea id="permission-declaration-json" label={review ? "Review the complete declaration" : "Publish a declaration"} hint="Provide the full JSON definition, including every parameter and constraint. Keep your source definition when updating an existing declaration." value={review?.json ?? json} onChange={(event) => setJson(event.target.value)} readOnly={review !== null} disabled={pending} rows={14} spellCheck={false} className="font-mono text-xs" maxLength={65536} />
      {review ? <p className="text-sm text-neutral-600">{existing ? `This replaces ${existing.name} (currently version ${existing.version}) with the complete definition shown above.` : `This publishes ${review.name} under your account’s app context.`}</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      {message ? <FormSuccess>{message}</FormSuccess> : null}
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" loading={pending} disabled={!loaded}>{review ? "Confirm and publish" : "Review declaration"}</Button>{review ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => setReview(null)}>Back to editing</Button> : null}</div>
    </form>
  </Card>;
}

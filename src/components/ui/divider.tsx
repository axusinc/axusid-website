export function Divider({ label }: { label?: string }) {
  if (!label) {
    return <hr className="border-black/[0.07]" />;
  }

  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-black/[0.07]" aria-hidden />
      <span className="text-xs font-medium text-neutral-400" aria-hidden>
        {label}
      </span>
      <span className="h-px flex-1 bg-black/[0.07]" aria-hidden />
    </div>
  );
}

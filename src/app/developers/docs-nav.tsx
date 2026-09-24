import Link from "next/link";

const links = [
  { href: "/developers", label: "Overview" },
  { href: "/developers/quickstart", label: "Quickstart" },
  { href: "/developers/reference", label: "Reference" },
  { href: "/brand", label: "Button and brand" },
];

export function DocsNav({ current }: { current: string }) {
  return (
    <nav aria-label="Developer docs" className="flex flex-wrap gap-1.5">
      {links.map(({ href, label }) => {
        const active = current === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-lg bg-neutral-950 px-3 py-1.5 text-[13px] font-medium text-white"
                : "rounded-lg px-3 py-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-black/[0.05] hover:text-neutral-950"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

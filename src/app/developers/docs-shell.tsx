"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Menu, Search, X } from "lucide-react";
import { BrandMark, SiteFooter } from "@/components/brand-mark";
import { docsIndex } from "./docs-index";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const results = query.trim()
    ? docsIndex.filter((item) =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : [];
  const current = docsIndex.find((item) => item.href === pathname);
  const sections = docsIndex.filter((item) =>
    item.href.startsWith(`${pathname}#`),
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        search.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function navigate() {
    setQuery("");
    setMobileOpen(false);
  }
  return (
    <div className="docs-root min-h-screen bg-white">
      <a
        href="#docs-content"
        className="fixed left-4 top-2 z-50 -translate-y-20 rounded-lg bg-neutral-950 px-4 py-3 text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1536px] items-center gap-4 px-5 lg:px-8">
          <BrandMark size={28} className="shrink-0 whitespace-nowrap" />
          <span className="hidden border-l border-neutral-200 pl-4 text-sm text-neutral-500 sm:block">
            Developers
          </span>
          <div className="relative ml-auto min-w-0 w-full max-w-sm">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400"
            />
            <input
              ref={search}
              aria-label="Search documentation"
              aria-controls={query.trim() ? "docs-search-results" : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              className="h-10 w-full rounded-xl border border-black/10 bg-white pl-9 pr-12 text-sm outline-offset-2"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear documentation search"
                onClick={() => {
                  setQuery("");
                  search.current?.focus();
                }}
                className="absolute right-2 top-2 rounded p-1 text-neutral-500"
              >
                <X size={16} aria-hidden />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-3 hidden text-[10px] text-neutral-400 sm:block">
                ⌘ / Ctrl K
              </kbd>
            )}
            {query.trim() && (
              <div
                id="docs-search-results"
                className="fixed inset-x-5 top-20 max-h-[65vh] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[420px] overflow-y-auto rounded-2xl border border-black/[0.07] bg-white p-2 shadow-xl"
              >
                <p role="status" className="px-3 py-2 text-xs text-neutral-500">
                  {results.length
                    ? `${results.length} results`
                    : "No results. Try “token”, “callback” or “email”."}
                </p>
                {results.map((item) => (
                  <Link
                    onClick={navigate}
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg p-3 hover:bg-neutral-50 focus:bg-neutral-50"
                  >
                    <span className="block text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
                      {item.description}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/account?section=developer"
            className="hidden shrink-0 items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 sm:inline-flex"
          >
            Developer console{" "}
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            className="p-2 lg:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="docs-sidebar"
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setQuery("");
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1536px] lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_200px]">
        <aside
          id="docs-sidebar"
          className={`${mobileOpen ? "block" : "hidden"} fixed inset-x-0 top-[72px] z-20 max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-black/[0.06] bg-[#fafafa] p-6 lg:inset-x-auto lg:sticky lg:top-[72px] lg:block lg:h-[calc(100dvh-72px)] lg:overflow-y-auto lg:border-b-0 lg:border-r`}
        >
          <nav aria-label="Developer documentation" className="space-y-7">
            {["Start here", "Build & explore", "Resources"].map((group) => (
              <div key={group}>
                <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {group}
                </p>
                <div className="space-y-1">
                  {docsIndex
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <Link
                        key={item.href}
                        onClick={navigate}
                        href={item.href}
                        aria-current={
                          item.href === pathname ? "page" : undefined
                        }
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors ${item.href === pathname ? "bg-black/[0.05] font-semibold text-neutral-950" : "text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-950"}`}
                      >
                        {item.href === pathname && (
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        )}
                        {item.title}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-10 border-t border-black/[0.06] px-3 pt-5 text-xs leading-relaxed text-neutral-500">
            <BookOpen aria-hidden className="mb-3 h-4 w-4" />
            Built on OAuth 2.0
            <br />
            Authorization Code + PKCE
            <br />
            <Link
              onClick={navigate}
              href="/account?section=developer"
              className="mt-4 inline-block font-medium text-neutral-900 underline underline-offset-4"
            >
              Open developer console ↗
            </Link>
          </div>
        </aside>
        <main
          id="docs-content"
          tabIndex={-1}
          className="relative min-w-0 px-5 pb-16 pt-8 outline-none sm:px-10 lg:px-12 lg:pt-10"
        >
          <div aria-hidden className="docs-glow" />
          <div className="mb-8 flex items-center gap-2 text-xs text-neutral-400">
            <span>Docs</span>
            <span>/</span>
            <span className="text-neutral-600">
              {current?.title ?? "Developers"}
            </span>
          </div>
          {sections.length > 0 && (
            <details className="mb-7 rounded-lg border border-neutral-200 px-4 py-3 xl:hidden">
              <summary className="cursor-pointer text-xs font-medium text-neutral-600">
                On this page
              </summary>
              <nav
                aria-label="Jump to section"
                className="mt-3 grid gap-3 sm:grid-cols-2"
              >
                {sections.map((section) => (
                  <a
                    key={section.href}
                    href={section.href}
                    className="text-xs text-neutral-600 hover:text-brand"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </details>
          )}
          {children}
          <div className="mt-16 border-t border-black/[0.06] pt-8">
            <SiteFooter />
          </div>
        </main>
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] overflow-y-auto px-4 py-11 xl:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            On this page
          </p>
          <nav aria-label="On this page" className="mt-4 space-y-3">
            {(sections.length
              ? sections
              : [
                  { href: "#start", title: "Get started" },
                  { href: "#next", title: "Keep building" },
                ]
            ).map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="block text-xs leading-relaxed text-neutral-500 hover:text-brand"
              >
                {section.title}
              </a>
            ))}
          </nav>
          <Link
            href="/developers/troubleshooting"
            className="mt-8 block border-t border-black/[0.06] pt-5 text-xs text-neutral-500 hover:text-brand"
          >
            Something not working? ↗
          </Link>
        </aside>
      </div>
    </div>
  );
}

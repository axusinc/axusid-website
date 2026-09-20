/** Soft ambient background shared by every full-page layout. */
export function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#fafafa]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(182,28,28,0.07),transparent_42%),radial-gradient(ellipse_at_88%_100%,rgba(0,0,0,0.045),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
    </div>
  );
}

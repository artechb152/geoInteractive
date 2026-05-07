export function TopoBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 topo-bg opacity-40"
    >
      <div className="absolute inset-0 bg-topo-fade" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/60 to-bg" />
    </div>
  );
}

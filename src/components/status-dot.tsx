export function StatusDot({ status }: { status: "up" | "down" | "unknown" | null | undefined }) {
  if (status === "down") return <span className="size-[7px] rounded-full bg-danger" title="Hors ligne" />;
  if (status === "up") return <span className="live-dot" title="En ligne" />;
  return <span className="size-[7px] rounded-full bg-subtle/60" />;
}

"use client";

type Props = {
  source: string;
  label?: string | null;
  ageMinutes?: number | null;
  compact?: boolean;
};

function formatAge(ageMinutes?: number | null) {
  if (ageMinutes == null) return "just now";
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  return `${Math.round(ageMinutes / 60)}h ago`;
}

export default function DataSourceBadge({ source, label, ageMinutes, compact = false }: Props) {
  const content = (() => {
    switch (source) {
      case "worker_reported":
        return { icon: "👷", text: label || "Worker", className: "badge-worker" };
      case "driver_reported":
        return { icon: "🚛", text: label || "Driver", className: "badge-driver" };
      default:
        return { icon: "🤖", text: label || "ML estimate", className: "badge-ml" };
    }
  })();

  return (
    <span className={`badge ${content.className} ${compact ? "text-[10px] px-2 py-1" : ""}`}>
      {content.icon} {content.text} {ageMinutes != null ? `· ${formatAge(ageMinutes)}` : ""}
    </span>
  );
}

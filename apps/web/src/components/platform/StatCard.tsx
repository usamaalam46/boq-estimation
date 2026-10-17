import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  detail: string;
  note: string;
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  detail,
  note,
}: StatCardProps) {
  return (
    <article className="app-stat-card">
      <div className="app-stat-top">
        <span>{label}</span>
        <div className="app-stat-icon"><Icon size={19} /></div>
      </div>
      <div className="app-stat-value">{value}</div>
      <div className="app-stat-footer">
        <strong>{detail}</strong>
        <span>{note}</span>
      </div>
    </article>
  );
}

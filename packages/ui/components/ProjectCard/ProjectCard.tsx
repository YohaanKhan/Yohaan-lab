import { Badge } from "../../primitives/Badge";
import type { ProjectCardProps } from "./ProjectCard.types";

const statusConfig = {
  "live":        { label: "Live",         className: "text-green-400" },
  "in-progress": { label: "In Progress",  className: "text-yellow-400" },
  "coming-soon": { label: "Coming Soon",  className: "text-muted" },
} as const;

export function ProjectCard({ icon: Icon, title, description, tags, status, href }: ProjectCardProps) {
  const s = statusConfig[status];

  return (
    <a
      href={href}
      className="block p-5 rounded-lg border border-border bg-surface hover:border-accent transition-colors duration-200 group"
    >
      <div className="mb-3 text-muted">
        <Icon size={24} />
      </div>

      <div className="flex items-center justify-between mb-1">
        <h3 className="font-sans font-medium text-primary text-sm">{title}</h3>
        <span className={`font-mono text-xs ${s.className}`}>{s.label}</span>
      </div>

      <p className="font-sans text-sm text-muted mb-4 leading-relaxed">{description}</p>

      <div className="flex gap-2 flex-wrap">
        {tags.map(tag => (
          <Badge key={tag} label={tag} />
        ))}
      </div>
    </a>
  );
}
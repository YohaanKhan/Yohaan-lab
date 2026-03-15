import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

export type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

export type ProjectStatus = "live" | "in-progress" | "coming-soon";

export type ProjectCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  tags: string[];
  status: ProjectStatus;
  href: string;
};
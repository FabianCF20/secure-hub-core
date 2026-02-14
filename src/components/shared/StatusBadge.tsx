import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusBadge({ active, activeLabel = "Activo", inactiveLabel = "Inactivo" }: StatusBadgeProps) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className={active ? "bg-success" : ""}
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

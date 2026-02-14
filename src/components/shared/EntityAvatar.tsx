import { LucideIcon } from "lucide-react";

interface EntityAvatarProps {
  icon: LucideIcon;
  shape?: "circle" | "rounded";
}

export function EntityAvatar({ icon: Icon, shape = "circle" }: EntityAvatarProps) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 ${shape === "circle" ? "rounded-full" : "rounded-lg"}`}>
      <Icon className="h-5 w-5 text-primary" />
    </div>
  );
}

import { cn } from "@/lib/utils";

type IconProps = {
  name: string;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, filled = false, className }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined", className)}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

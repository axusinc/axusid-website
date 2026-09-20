import { cardSurface } from "@/lib/design";
import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div">;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn(cardSurface, "rounded-2xl p-5 sm:p-6", className)} {...props} />;
}

type CardHeaderProps = {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Status badge shown next to the title. */
  badge?: React.ReactNode;
  /** Primary action on the right. */
  action?: React.ReactNode;
  className?: string;
};

/** Standard header for settings cards: icon, title, description, badge and action. */
export function CardHeader({ icon, title, description, badge, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-neutral-50 text-neutral-700 [&_svg]:h-[18px] [&_svg]:w-[18px]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-[15px] font-semibold tracking-tight text-neutral-950">{title}</h3>
            {badge}
          </div>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">{action}</div> : null}
    </div>
  );
}

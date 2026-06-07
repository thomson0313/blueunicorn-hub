import { Avatar } from "@/components/Avatar";
import { scoreRingColor } from "@/lib/daily-score";

export function ScoreAvatar({
  name,
  src,
  size = 44,
  score,
  showLabel = true,
}: {
  name: string;
  src?: string | null;
  size?: number;
  score: number;
  showLabel?: boolean;
}) {
  const ring = 3;
  const outer = size + ring * 2 + 4;
  const r = (outer - ring) / 2;
  const cx = outer / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * (score / 100);
  const color = scoreRingColor(score);

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative" style={{ width: outer, height: outer }}>
        <svg
          className="absolute inset-0 -rotate-90"
          width={outer}
          height={outer}
          aria-hidden
        >
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={ring}
          />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={ring}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            left: (outer - size) / 2,
            top: (outer - size) / 2,
          }}
        >
          <Avatar name={name} src={src} size={size} />
        </div>
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>
          {score}%
        </span>
      )}
    </div>
  );
}

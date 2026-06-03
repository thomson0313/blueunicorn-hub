function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const BORDER_CLASS = "ring-2 ring-white/90 border-2 border-white/60 shadow-sm";

export function Avatar({
  name,
  src,
  size = 40,
  bordered = false,
}: {
  name: string;
  src?: string | null;
  size?: number;
  /** White ring for header / sidebar profile photos */
  bordered?: boolean;
}) {
  const wrap = bordered ? `inline-flex rounded-full shrink-0 ${BORDER_CLASS}` : "inline-flex rounded-full shrink-0";

  if (src) {
    // Plain img keeps things simple for user-uploaded files of varying dimensions.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <span className={wrap}>
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="rounded-full object-cover bg-slate-100"
        />
      </span>
    );
  }
  return (
    <span className={wrap}>
      <div
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        className="rounded-full bg-brand-500 text-white font-semibold flex items-center justify-center"
      >
        {initials(name) || "?"}
      </div>
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    // Plain img keeps things simple for user-uploaded files of varying dimensions.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-full object-cover bg-slate-100 shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full bg-brand-500 text-white font-semibold flex items-center justify-center shrink-0"
    >
      {initials(name) || "?"}
    </div>
  );
}

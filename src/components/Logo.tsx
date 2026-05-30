import Image from "next/image";

export function Logo({ size = 32, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/blunicorn-logo.png"
        alt="Blunicorn"
        width={size}
        height={size}
        priority
        style={{ height: "auto" }}
        className="object-contain"
      />
      {withWordmark && (
        <span className="font-bold tracking-tight text-brand-600 text-lg select-none">Blunicorn</span>
      )}
    </div>
  );
}

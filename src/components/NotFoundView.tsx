import Link from "next/link";
import Image from "next/image";

type NotFoundViewProps = {
  /** When true, show a compact in-app layout (no full-screen auth background). */
  embedded?: boolean;
  homeHref?: string;
  homeLabel?: string;
  showSignIn?: boolean;
};

export function NotFoundView({
  embedded = false,
  homeHref = "/dashboard",
  homeLabel = "Go to dashboard",
  showSignIn = true,
}: NotFoundViewProps) {
  const content = (
    <div className={embedded ? "py-16 text-center" : "w-full max-w-md text-center"}>
      {!embedded && (
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/blunicorn-logo.png"
            alt="Blunicorn"
            width={72}
            height={72}
            priority
            style={{ height: "auto" }}
          />
          <h1 className="text-white text-2xl font-bold mt-4">Blunicorn</h1>
        </div>
      )}

      <div
        className={
          embedded
            ? "max-w-lg mx-auto"
            : "bg-white rounded-2xl shadow-2xl p-8"
        }
      >
        <p className={embedded ? "text-6xl font-bold text-slate-200" : "text-5xl font-bold text-brand-500"}>
          404
        </p>
        <h2 className={`font-bold text-slate-900 ${embedded ? "text-xl mt-2" : "text-xl mt-4"}`}>
          Page not found
        </h2>
        <p className="text-slate-500 text-sm mt-2">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 transition shadow-sm"
          >
            {homeLabel}
          </Link>
          {!embedded && showSignIn && (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-5 py-2.5 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen tg-auth-bg flex items-center justify-center px-4">
      {content}
    </div>
  );
}

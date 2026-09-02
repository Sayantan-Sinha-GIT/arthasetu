export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-2xl">
          🔍
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
            Page not found / पेज नहीं मिला
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            The page you&apos;re looking for doesn&apos;t exist.
            <br />
            आप जिस पेज को खोज रहे हैं वह मौजूद नहीं है।
          </p>
        </div>
        <a
          href="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
        >
          Go Home / होम पर जाएं
        </a>
      </div>
    </div>
  );
}

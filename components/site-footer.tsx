export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-8 text-sm text-slate sm:px-6">
      <span>© {new Date().getFullYear()} Loopgrain</span>
      <span>Short-form video editing for small businesses</span>
    </footer>
  );
}

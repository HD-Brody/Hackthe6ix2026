export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <header className="relative z-10 h-16 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] shadow-[0_4px_10px_var(--shadow-color)]">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="h-7 w-48 animate-pulse rounded bg-[var(--skeleton)] sm:h-8" />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="size-16 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Loading...</p>
        </div>
      </main>
    </div>
  );
}

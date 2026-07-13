export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-2xl border border-gold/20 bg-surface px-8 py-6 shadow-glow">
        <div className="flex items-center gap-3 text-gold-light">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm font-medium uppercase tracking-[0.24em]">Loading Infocracy</span>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gold/20 bg-surface p-6 md:p-8 shadow-glow">
            <div className="flex items-center gap-3 text-gold-light">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm font-medium uppercase tracking-[0.24em]">Loading Infocracy</span>
            </div>
            <div className="mt-6 h-3 w-48 animate-pulse rounded-full bg-[#232323]" />
            <div className="mt-3 h-3 w-64 animate-pulse rounded-full bg-[#1d1d1d]" />
          </div>

          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-border bg-[#141414]" />
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-[#141414]" />
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-[#141414]" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-2xl border border-border bg-[#141414]" />
          <div className="h-20 animate-pulse rounded-2xl border border-border bg-[#141414]" />
          <div className="h-20 animate-pulse rounded-2xl border border-border bg-[#141414]" />
        </div>
      </div>
    </div>
  );
}

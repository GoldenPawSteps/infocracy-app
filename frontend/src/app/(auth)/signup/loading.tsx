import { Card } from '@/components/ui/Card';

export default function SignUpLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 py-12">
      <Card className="grid w-full max-w-5xl overflow-hidden lg:grid-cols-[0.85fr_1.15fr]" glow>
        <div className="p-8 md:p-12">
          <div className="max-w-md animate-pulse space-y-5">
            <div className="h-3 w-36 rounded bg-[#1b1b1b]" />
            <div className="h-8 w-2/3 rounded bg-[#1d1d1d]" />
            <div className="h-4 w-full rounded bg-[#171717]" />
            <div className="space-y-4 pt-4">
              <div className="h-12 rounded-xl bg-[#151515]" />
              <div className="h-12 rounded-xl bg-[#151515]" />
              <div className="h-12 rounded-xl bg-[#151515]" />
              <div className="h-12 rounded-xl bg-[#1b1b1b]" />
            </div>
            <div className="h-4 w-3/5 rounded bg-[#171717]" />
            <div className="h-4 w-2/5 rounded bg-[#171717]" />
          </div>
        </div>

        <div className="bg-gold-radial p-8 md:p-12">
          <div className="animate-pulse space-y-6">
            <div className="h-3 w-32 rounded bg-[#2a2418]" />
            <div className="space-y-4">
              <div className="h-20 rounded-2xl border border-gold/20 bg-[#1d180f]/70" />
              <div className="h-20 rounded-2xl border border-gold/20 bg-[#1d180f]/70" />
              <div className="h-20 rounded-2xl border border-gold/20 bg-[#1d180f]/70" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
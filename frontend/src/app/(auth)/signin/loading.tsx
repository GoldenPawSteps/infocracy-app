import { Card } from '@/components/ui/Card';

export default function SignInLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 py-12">
      <Card className="grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.2fr_0.8fr]" glow>
        <div className="bg-gold-radial p-8 md:p-12">
          <div className="animate-pulse space-y-5">
            <div className="h-3 w-32 rounded bg-[#2a2418]" />
            <div className="h-10 w-4/5 rounded bg-[#201b12]" />
            <div className="h-4 w-full rounded bg-[#221c12]" />
            <div className="h-4 w-5/6 rounded bg-[#221c12]" />
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="max-w-md animate-pulse space-y-5">
            <div className="h-7 w-28 rounded bg-[#1b1b1b]" />
            <div className="h-4 w-3/4 rounded bg-[#171717]" />
            <div className="space-y-4 pt-4">
              <div className="h-12 rounded-xl bg-[#151515]" />
              <div className="h-12 rounded-xl bg-[#151515]" />
              <div className="h-12 rounded-xl bg-[#1b1b1b]" />
            </div>
            <div className="h-4 w-3/5 rounded bg-[#171717]" />
            <div className="h-4 w-2/5 rounded bg-[#171717]" />
          </div>
        </div>
      </Card>
    </div>
  );
}
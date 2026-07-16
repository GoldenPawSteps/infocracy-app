import { Card } from '@/components/ui/Card';

export default function MarketLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="overflow-hidden p-6 md:p-8" glow>
          <div className="h-2 w-full bg-gradient-to-r from-gold/30 via-gold-light/60 to-gold/30" />
          <div className="mt-6 animate-pulse space-y-4">
            <div className="h-7 w-2/3 rounded-lg bg-[#1c1c1c]" />
            <div className="h-4 w-full rounded-lg bg-[#171717]" />
            <div className="h-4 w-3/4 rounded-lg bg-[#171717]" />
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="h-28 animate-pulse bg-[#141414]" />
          <Card className="h-28 animate-pulse bg-[#141414]" />
          <Card className="h-28 animate-pulse bg-[#141414]" />
          <Card className="h-28 animate-pulse bg-[#141414]" />
        </div>

        <Card className="p-6 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-40 rounded-lg bg-[#1b1b1b]" />
            <div className="h-16 rounded-xl bg-[#151515]" />
            <div className="h-16 rounded-xl bg-[#151515]" />
            <div className="h-16 rounded-xl bg-[#151515]" />
          </div>
        </Card>
      </div>

      <Card className="h-96 animate-pulse bg-[#141414]" />
    </div>
  );
}

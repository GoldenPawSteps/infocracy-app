import { Card } from '@/components/ui/Card';

export default function NewMarketLoading() {
  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-36 rounded bg-[#1b1b1b]" />
          <div className="h-8 w-3/5 rounded bg-[#1d1d1d]" />
          <div className="h-4 w-full rounded bg-[#171717]" />
          <div className="h-4 w-5/6 rounded bg-[#171717]" />
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="animate-pulse space-y-5">
          <div className="h-5 w-48 rounded bg-[#1b1b1b]" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-12 rounded-xl bg-[#151515]" />
            <div className="h-12 rounded-xl bg-[#151515]" />
            <div className="h-12 rounded-xl bg-[#151515] md:col-span-2" />
            <div className="h-12 rounded-xl bg-[#151515] md:col-span-2" />
          </div>
          <div className="h-12 rounded-xl bg-[#151515]" />
          <div className="h-28 rounded-2xl bg-[#131313]" />
          <div className="h-12 w-40 rounded-xl bg-[#1b1b1b]" />
        </div>
      </Card>
    </div>
  );
}
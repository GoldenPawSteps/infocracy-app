import { Card } from '@/components/ui/Card';

export default function DashboardLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-6 md:p-8" glow>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 rounded bg-[#1a1a1a]" />
            <div className="h-8 w-3/5 rounded bg-[#1d1d1d]" />
            <div className="h-4 w-full rounded bg-[#171717]" />
            <div className="h-4 w-4/5 rounded bg-[#171717]" />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="h-52 animate-pulse bg-[#141414]" />
          <Card className="h-52 animate-pulse bg-[#141414]" />
          <Card className="h-52 animate-pulse bg-[#141414]" />
        </div>
      </div>

      <div>
        <Card className="p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-1/2 rounded bg-[#1b1b1b]" />
            <div className="h-10 rounded-xl bg-[#151515]" />
            <div className="h-10 rounded-xl bg-[#151515]" />
            <div className="h-10 rounded-xl bg-[#151515]" />
            <div className="h-10 rounded-xl bg-[#151515]" />
          </div>
        </Card>
      </div>
    </div>
  );
}

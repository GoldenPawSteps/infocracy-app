import { Card } from '@/components/ui/Card';

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8" glow>
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-28 rounded bg-[#1b1b1b]" />
          <div className="h-8 w-1/2 rounded bg-[#1d1d1d]" />
          <div className="h-4 w-4/5 rounded bg-[#171717]" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-24 rounded-2xl bg-[#141414]" />
            <div className="h-24 rounded-2xl bg-[#141414]" />
            <div className="h-24 rounded-2xl bg-[#141414]" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6 md:p-8">
          <div className="animate-pulse space-y-5">
            <div className="h-5 w-40 rounded bg-[#1b1b1b]" />
            <div className="h-11 rounded-xl bg-[#151515]" />
            <div className="h-64 rounded-2xl bg-[#131313]" />
            <div className="h-64 rounded-2xl bg-[#131313]" />
          </div>
        </Card>

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
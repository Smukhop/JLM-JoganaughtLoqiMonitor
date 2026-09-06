import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-sweep rounded bg-[length:200%_100%]','bg-gradient-to-r from-plate via-seam to-plate',className)} />;
}
export function SkeletonText({ lines=3,className }:{lines?:number;className?:string}){return <div className={cn('space-y-2',className)}>{Array.from({length:lines}).map((_,i)=><Skeleton key={i} className={cn('h-3',i===lines-1?'w-2/3':'w-full')}/>)}</div>}

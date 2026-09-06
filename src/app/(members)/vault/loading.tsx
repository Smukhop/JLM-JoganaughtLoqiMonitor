import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-8 h-6 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="panel px-5 py-4">
            <SkeletonText lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}

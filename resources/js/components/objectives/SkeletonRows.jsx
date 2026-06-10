// resources/js/components/objectives/SkeletonRows.jsx

/** Loading placeholder shown during Inertia navigation (3 animated grey rows). */
export default function SkeletonRows({ count = 3 }) {
  return (
    <div className="divide-y divide-neutral-100">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-7 h-7 rounded-md bg-neutral-200 animate-pulse" />
          <div className="h-3 w-[90px] rounded bg-neutral-200 animate-pulse" />
          <div className="h-3 w-[70px] rounded bg-neutral-200 animate-pulse ml-auto" />
          <div className="h-3 w-[70px] rounded bg-neutral-200 animate-pulse" />
          <div className="h-2 w-[120px] rounded-full bg-neutral-200 animate-pulse" />
          <div className="h-6 w-[80px] rounded-full bg-neutral-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

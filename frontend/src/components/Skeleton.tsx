export function Skeleton({ width = "100%", height }: { width?: number | string; height?: number }) {
  return <span className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 8, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c}>
              <Skeleton width={c === 0 ? "70%" : "55%"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonPanel({ lines = 4 }: { lines?: number }) {
  return (
    <div className="panel" aria-busy="true" aria-label="Loading">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Skeleton width="40%" height={18} />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={`${85 - i * 10}%`} />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="form" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="field">
          <Skeleton width={90} />
          <Skeleton height={38} />
        </div>
      ))}
    </div>
  );
}

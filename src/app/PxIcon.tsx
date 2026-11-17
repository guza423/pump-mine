// V14 · Pixel ikonlar: 12×12 ızgarada kare piksellerden çizilir, keskin kenarlı (crispEdges).
const PATHS: Record<string, string> = {
  home: 'M5 1h2v1H5zM4 2h4v1H4zM3 3h1v1H3zM8 3h1v1H8zM2 4h1v1H2zM9 4h1v1H9zM1 5h2v1H1zM9 5h2v1H9zM2 6h1v5H2zM9 6h1v5H9zM3 10h6v1H3zM5 7h2v3H5z',
  bolt: 'M0 5h1v2H0zM1 3h2v6H1zM3 5h6v2H3zM9 3h2v6H9zM11 5h1v2h-1z',
  calendar: 'M3 0h1v2H3zM8 0h1v2H8zM1 2h10v1H1zM1 3h1v8H1zM10 3h1v8h-1zM1 4h10v1H1zM1 10h10v1H1zM3 6h2v2H3zM7 6h2v2H7z',
  flask: 'M4 0h4v1H4zM5 1h2v3H5zM4 4h1v1H4zM7 4h1v1H7zM3 5h1v1H3zM8 5h1v1H8zM2 6h1v2H2zM9 6h1v2H9zM1 8h1v3H1zM10 8h1v3h-1zM1 11h10v1H1zM3 8h6v1H3z',
  cloud: 'M4 3h3v1H4zM3 4h1v1H3zM7 4h2v1H7zM9 5h1v1H9zM2 5h1v1H2zM1 6h1v3H1zM10 6h1v3h-1zM2 9h8v1H2z',
  user: 'M5 1h2v1H5zM4 2h1v3H4zM7 2h1v3H7zM5 5h2v1H5zM3 7h6v1H3zM2 8h1v3H2zM9 8h1v3H9zM2 11h8v1H2z',
  plus: 'M5 1h2v10H5zM1 5h10v2H1z',
  left: 'M7 1h2v1H7zM6 2h2v1H6zM5 3h2v1H5zM4 4h2v1H4zM3 5h2v2H3zM4 7h2v1H4zM5 8h2v1H5zM6 9h2v1H6zM7 10h2v1H7z',
  more: 'M5 1h2v2H5zM5 5h2v2H5zM5 9h2v2H5z',
  right: 'M3 1h2v1H3zM4 2h2v1H4zM5 3h2v1H5zM6 4h2v1H6zM7 5h2v2H7zM6 7h2v1H6zM5 8h2v1H5zM4 9h2v1H4zM3 10h2v1H3z',
  play: 'M3 1h1v10H3zM4 2h1v8H4zM5 3h1v6H5zM6 4h1v4H6zM7 5h1v2H7z',
};

export function PxIcon({ name, size = 18 }: { name: string; size?: number }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg className="px-icon" width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

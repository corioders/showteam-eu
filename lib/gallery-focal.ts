export type FocalPoint = { x: number; y: number };

const center: FocalPoint = { x: 50, y: 50 };

export function parseFocalPoints(value: FormDataEntryValue | null, count: number): FocalPoint[] {
  if (typeof value !== "string") return Array.from({ length: count }, () => ({ ...center }));

  try {
    const points = JSON.parse(value) as unknown;
    if (!Array.isArray(points)) throw new Error("invalid focal points");
    return Array.from({ length: count }, (_, index) => {
      const point = points[index];
      if (!point || typeof point !== "object") return { ...center };
      const { x, y } = point as Partial<FocalPoint>;
      return {
        x: typeof x === "number" && Number.isFinite(x) ? Math.round(Math.min(100, Math.max(0, x))) : 50,
        y: typeof y === "number" && Number.isFinite(y) ? Math.round(Math.min(100, Math.max(0, y))) : 50,
      };
    });
  } catch {
    return Array.from({ length: count }, () => ({ ...center }));
  }
}

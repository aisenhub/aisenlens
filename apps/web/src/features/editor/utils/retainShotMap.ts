export default function retainShotMap<T>(
  source: Record<string, T>,
  shotIds: ReadonlySet<string>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(source).filter(([shotId]) => shotIds.has(shotId)),
  ) as Record<string, T>
}

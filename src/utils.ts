export async function arrayFromAsync<T>(it: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = []
  for await (const a of it) {
    result.push(a)
  }
  return result
}

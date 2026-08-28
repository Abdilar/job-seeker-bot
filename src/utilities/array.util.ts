export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("Chunk size must be greater than zero");
  }

  const chunks: T[][] = []
  const chunkLength = Math.ceil(items.length / size)
  for (let index = 0; index < chunkLength; index++) {
    const chunk = items.slice(index * size, size * (index + 1))
    chunks.push(chunk)
  }
  return chunks
}
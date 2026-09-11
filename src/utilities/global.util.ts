export const randomDelay = async (min: number, max: number): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min

  await new Promise((resolve) => setTimeout(resolve, delay))
}

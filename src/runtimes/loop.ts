export interface LoopRunnerOptions {
  loopSeconds?: number
  runOnce: () => Promise<void>
  schedule?: (callback: () => void, delayMs: number) => unknown
}

export async function runWithOptionalLoop(options: LoopRunnerOptions): Promise<void> {
  await options.runOnce()
  if (!options.loopSeconds) {
    return
  }

  const schedule = options.schedule ?? setTimeout
  schedule(() => {
    runWithOptionalLoop(options).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
    })
  }, options.loopSeconds * 1000)
}

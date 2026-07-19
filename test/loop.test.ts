import { describe, expect, it, vi } from 'vitest'
import { runWithOptionalLoop } from '../src/runtimes/loop.js'

describe('runWithOptionalLoop', () => {
  it('runs once when no loop seconds are configured', async () => {
    const runOnce = vi.fn().mockResolvedValue(undefined)
    const schedule = vi.fn()

    await runWithOptionalLoop({ loopSeconds: undefined, runOnce, schedule })

    expect(runOnce).toHaveBeenCalledTimes(1)
    expect(schedule).not.toHaveBeenCalled()
  })

  it('runs immediately and schedules the next run in loop mode', async () => {
    const runOnce = vi.fn().mockResolvedValue(undefined)
    const schedule = vi.fn()

    await runWithOptionalLoop({ loopSeconds: 86400, runOnce, schedule })

    expect(runOnce).toHaveBeenCalledTimes(1)
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 86400 * 1000)
  })
})

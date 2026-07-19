import { afterEach, describe, expect, it, vi } from 'vitest'
import { handler, main_handler } from '../src/runtimes/cloud-function.js'

describe('cloud function runtime', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requires Upstash REST credentials', async () => {
    vi.stubEnv('TAYGEDO_UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('TAYGEDO_UPSTASH_REDIS_REST_TOKEN', '')

    await expect(main_handler({}, {})).rejects.toThrow('云函数部署必须配置 TAYGEDO_UPSTASH_REDIS_REST_URL 和 TAYGEDO_UPSTASH_REDIS_REST_TOKEN')
  })

  it('seeds accounts into Upstash and runs attendance from a Tencent timer event', async () => {
    const redis = new Map<string, string>()
    const fetchMock = createUpstashFetch(redis)
    vi.stubGlobal('fetch', fetchMock)
    stubCloudFunctionEnv({
      TAYGEDO_ACCOUNTS: JSON.stringify([
        { id: 'main', name: '主账号', uid: '1', deviceId: 'device-1', refreshToken: 'refresh-old' },
      ]),
    })

    const result = await main_handler({ Type: 'Timer', TriggerName: 'daily' }, { TAYGEDO_TEST_API: createApi() })

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      successCount: 1,
      failedCount: 0,
      skippedCount: 0,
      summary: expect.stringContaining('塔吉多每日签到结果'),
    }))
    expect(JSON.parse(redis.get('TAYGEDO_ACCOUNTS') ?? '[]')[0]).toEqual(expect.objectContaining({
      accessToken: 'access-main',
      refreshToken: 'refresh-new',
    }))
    expect(redis.has('taygedo:last-summary')).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://redis.example.com/set/TAYGEDO_ACCOUNTS',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer redis-token' }),
      }),
    )
  })

  it('uses the handler alias for Aliyun timer events', async () => {
    const redis = new Map<string, string>()
    redis.set('TAYGEDO_ACCOUNTS', JSON.stringify([
      { id: 'main', name: '主账号', uid: '1', deviceId: 'device-1', refreshToken: 'refresh-old' },
    ]))
    vi.stubGlobal('fetch', createUpstashFetch(redis))
    stubCloudFunctionEnv()

    const result = await handler(Buffer.from(JSON.stringify({ triggerName: 'daily' })), { TAYGEDO_TEST_API: createApi() })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('主账号')
  })

  it('fails when Upstash has no account key and no seed accounts are configured', async () => {
    vi.stubGlobal('fetch', createUpstashFetch(new Map()))
    stubCloudFunctionEnv()

    await expect(main_handler({}, {})).rejects.toThrow('Upstash 中缺少账号配置')
  })
})

function createApi() {
  return {
    refreshToken: vi.fn().mockResolvedValue({ accessToken: 'access-main', refreshToken: 'refresh-new', uid: '1' }),
    getGameRoles: vi.fn()
      .mockResolvedValueOnce({ roles: [{ roleId: 'role-1', roleName: '角色一' }] })
      .mockResolvedValue({ roles: [] }),
    appSignin: vi.fn().mockResolvedValue({ exp: 10, goldCoin: 20 }),
    getSigninState: vi.fn().mockResolvedValue({ days: 1 }),
    getSigninRewards: vi.fn().mockResolvedValue([{ name: '奖励一', num: 1 }]),
    gameSignin: vi.fn().mockResolvedValue(undefined),
  }
}

function stubCloudFunctionEnv(overrides: Record<string, string> = {}) {
  const values = {
    TAYGEDO_UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
    TAYGEDO_UPSTASH_REDIS_REST_TOKEN: 'redis-token',
    TAYGEDO_CREDENTIAL_KEY: 'credential-key',
    TAYGEDO_ACCOUNTS: '',
    TAYGEDO_NOTIFICATION_URLS: '',
    TAYGEDO_SERVERCHAN_SENDKEY: '',
    TAYGEDO_COIN_TASKS: 'false',
    ...overrides,
  }
  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value)
  }
}

function createUpstashFetch(redis: Map<string, string>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const parsed = new URL(url)
    const [, command, rawKey] = parsed.pathname.split('/')
    const key = decodeURIComponent(rawKey ?? '')
    if (command === 'get') {
      return Response.json({ result: redis.get(key) ?? null })
    }
    if (command === 'set') {
      redis.set(key, String(init?.body ?? ''))
      return Response.json({ result: 'OK' })
    }
    return Response.json({ error: 'unsupported command' }, { status: 400 })
  })
}

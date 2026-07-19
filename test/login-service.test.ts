import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { LoginService } from '../src/services/login-service.js'

describe('LoginService', () => {
  it('loads existing accounts from the target accounts file before upserting', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taygedo-login-service-'))
    const accountsFile = join(dir, 'accounts.json')
    await writeFile(accountsFile, JSON.stringify([
      { id: 'alt', name: '小号', uid: '2', deviceId: 'old-device', refreshToken: 'old-refresh' },
    ]), 'utf8')
    const api = {
      sendCaptcha: vi.fn(),
      checkCaptcha: vi.fn(),
      loginWithCaptcha: vi.fn(),
      loginWithPassword: vi.fn().mockResolvedValue({ token: 'laohu-token', userId: 'laohu-user' }),
      userCenterLogin: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', uid: '1' }),
      getBindRole: vi.fn().mockResolvedValue({}),
    }

    try {
      await new LoginService({ api, generateDeviceId: () => 'device-1' }).runLogin({
        mode: 'password',
        phone: '13800138000',
        password: 'secret-password',
        accountId: 'main',
        accountName: '主账号',
        accountsFile,
      })

      const accounts = JSON.parse(await readFile(accountsFile, 'utf8'))
      expect(accounts).toEqual([
        { id: 'alt', name: '小号', uid: '2', deviceId: 'old-device', refreshToken: 'old-refresh' },
        expect.objectContaining({ id: 'main', phone: '13800138000' }),
      ])
      expect(JSON.stringify(accounts)).not.toContain('secret-password')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

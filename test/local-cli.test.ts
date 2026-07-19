import { describe, expect, it, vi } from 'vitest'
import { runLocalCli } from '../src/runtimes/local-cli.js'

describe('runLocalCli', () => {
  it('runs attendance from a local accounts file', async () => {
    const service = {
      runAttendance: vi.fn().mockResolvedValue({ summary: 'ok' }),
      runLogin: vi.fn(),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn(),
    }

    await runLocalCli(['attendance', '--accounts-file', 'accounts.json'], { service })

    expect(service.runAttendance).toHaveBeenCalledWith(expect.objectContaining({
      accountsFile: 'accounts.json',
    }))
  })

  it('passes the force flag to local attendance', async () => {
    const service = {
      runAttendance: vi.fn().mockResolvedValue({ summary: 'ok' }),
      runLogin: vi.fn(),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn(),
    }

    await runLocalCli(['attendance', '--accounts-file', 'accounts.json', '--force'], { service })

    expect(service.runAttendance).toHaveBeenCalledWith(expect.objectContaining({
      accountsFile: 'accounts.json',
      forceRun: true,
    }))
  })

  it('runs password login from CLI arguments', async () => {
    const service = {
      runAttendance: vi.fn(),
      runLogin: vi.fn().mockResolvedValue(undefined),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn(),
    }

    await runLocalCli([
      'login',
      '--mode',
      'password',
      '--phone',
      '13800138000',
      '--password',
      'secret-password',
      '--account-id',
      'main',
      '--accounts-file',
      'accounts.json',
    ], { service })

    expect(service.runLogin).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'password',
      phone: '13800138000',
      password: 'secret-password',
      accountId: 'main',
      accountsFile: 'accounts.json',
    }))
  })

  it('uses the login password from env when CLI password is omitted', async () => {
    const originalPassword = process.env.TAYGEDO_LOGIN_PASSWORD
    process.env.TAYGEDO_LOGIN_PASSWORD = 'env-password'
    const service = {
      runAttendance: vi.fn(),
      runLogin: vi.fn().mockResolvedValue(undefined),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn(),
    }

    try {
      await runLocalCli([
        'login',
        '--mode',
        'password',
        '--phone',
        '13800138000',
        '--account-id',
        'main',
        '--accounts-file',
        'accounts.json',
      ], { service })
    }
    finally {
      if (originalPassword === undefined) {
        delete process.env.TAYGEDO_LOGIN_PASSWORD
      }
      else {
        process.env.TAYGEDO_LOGIN_PASSWORD = originalPassword
      }
    }

    expect(service.runLogin).toHaveBeenCalledWith(expect.objectContaining({
      password: 'env-password',
    }))
  })

  it('falls back to the legacy password env when login password env is blank', async () => {
    const originalLoginPassword = process.env.TAYGEDO_LOGIN_PASSWORD
    const originalPassword = process.env.TAYGEDO_PASSWORD
    process.env.TAYGEDO_LOGIN_PASSWORD = ''
    process.env.TAYGEDO_PASSWORD = 'legacy-env-password'
    const service = {
      runAttendance: vi.fn(),
      runLogin: vi.fn().mockResolvedValue(undefined),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn(),
    }

    try {
      await runLocalCli([
        'login',
        '--mode',
        'password',
        '--phone',
        '13800138000',
        '--account-id',
        'main',
        '--accounts-file',
        'accounts.json',
      ], { service })
    }
    finally {
      if (originalLoginPassword === undefined) {
        delete process.env.TAYGEDO_LOGIN_PASSWORD
      }
      else {
        process.env.TAYGEDO_LOGIN_PASSWORD = originalLoginPassword
      }
      if (originalPassword === undefined) {
        delete process.env.TAYGEDO_PASSWORD
      }
      else {
        process.env.TAYGEDO_PASSWORD = originalPassword
      }
    }

    expect(service.runLogin).toHaveBeenCalledWith(expect.objectContaining({
      password: 'legacy-env-password',
    }))
  })

  it('passes a credential key file option to password login', async () => {
    const service = {
      runAttendance: vi.fn(),
      runLogin: vi.fn().mockResolvedValue(undefined),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn(),
    }

    await runLocalCli([
      'login',
      '--mode',
      'password',
      '--phone',
      '13800138000',
      '--password',
      'secret-password',
      '--account-id',
      'main',
      '--accounts-file',
      'accounts.json',
      '--credential-key-file',
      'data/credential-key',
    ], { service })

    expect(service.runLogin).toHaveBeenCalledWith(expect.objectContaining({
      credentialKeyPath: 'data/credential-key',
    }))
  })

  it('passes the new-device flag to login', async () => {
    const service = {
      runAttendance: vi.fn(),
      runLogin: vi.fn().mockResolvedValue(undefined),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn(),
    }

    await runLocalCli([
      'login',
      '--mode',
      'password',
      '--phone',
      '13800138000',
      '--password',
      'secret-password',
      '--account-id',
      'main',
      '--accounts-file',
      'accounts.json',
      '--new-device',
    ], { service })

    expect(service.runLogin).toHaveBeenCalledWith(expect.objectContaining({
      newDevice: true,
    }))
  })

  it('runs the device command for selected accounts', async () => {
    const service = {
      runAttendance: vi.fn(),
      runLogin: vi.fn(),
      sendLoginCode: vi.fn(),
      updateDevices: vi.fn().mockResolvedValue(undefined),
    }

    await runLocalCli([
      'device',
      '--accounts-file',
      'accounts.json',
      '--account-id',
      'main',
      '--force',
      '--print',
    ], { service })

    expect(service.updateDevices).toHaveBeenCalledWith({
      accountsFile: 'accounts.json',
      accountId: 'main',
      force: true,
      print: true,
    })
  })
})

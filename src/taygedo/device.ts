import { randomBytes, randomUUID } from 'node:crypto'
import type { TaygedoAccount } from '../config/accounts.js'

export interface DeviceIdentity {
  deviceId: string
  openudid: string
  vendorid: string
}

export interface EnsureAccountDeviceOptions {
  force?: boolean
  generate?: () => DeviceIdentity
}

export function generateDeviceIdentity(): DeviceIdentity {
  return {
    deviceId: randomBytes(16).toString('hex'),
    openudid: randomUUID().toUpperCase(),
    vendorid: randomUUID().toUpperCase(),
  }
}

export function ensureAccountDevice(account: TaygedoAccount, options: EnsureAccountDeviceOptions = {}): TaygedoAccount {
  const generated = options.force || !account.deviceId || !account.openudid || !account.vendorid
    ? (options.generate ?? generateDeviceIdentity)()
    : undefined

  if (!generated) {
    return { ...account }
  }

  return {
    ...account,
    deviceId: options.force || !account.deviceId ? generated.deviceId : account.deviceId,
    openudid: options.force || !account.openudid ? generated.openudid : account.openudid,
    vendorid: options.force || !account.vendorid ? generated.vendorid : account.vendorid,
  }
}

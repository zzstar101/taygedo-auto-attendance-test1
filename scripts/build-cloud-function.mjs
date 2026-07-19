import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outdir = resolve(root, 'dist/cloud-function')
const outfile = resolve(outdir, 'index.js')
const zipfile = resolve(root, 'dist/cloud-function.zip')

await rm(outdir, { recursive: true, force: true })
await mkdir(outdir, { recursive: true })

await build({
  entryPoints: [resolve(root, 'src/runtimes/cloud-function.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'info',
})

await writeFile(resolve(outdir, 'package.json'), '{"type":"commonjs"}\n', 'utf8')

if (process.argv.includes('--pack')) {
  await rm(zipfile, { force: true })
  const result = spawnSync('zip', ['-qr', zipfile, '.'], {
    cwd: outdir,
    stdio: 'inherit',
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`zip 命令失败，退出码：${result.status ?? 'unknown'}`)
  }
  console.log(`云函数部署包已生成：${zipfile}`)
}
else {
  console.log(`云函数构建产物已生成：${dirname(outfile)}`)
}

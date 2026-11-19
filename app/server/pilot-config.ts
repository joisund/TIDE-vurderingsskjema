import { lstatSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export const pilotStaticRoot = fileURLToPath(new URL('../dist/', import.meta.url))
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url))

function resolvedPath(path: string): string {
  try { return realpathSync.native(path) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || dirname(path) === path || lstatSync(path, { throwIfNoEntry: false })) {
      throw error
    }
    return join(resolvedPath(dirname(path)), basename(path))
  }
}

function within(root: string, filename: string) {
  const fromRoot = relative(root, filename)
  return !isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`)
}

export function pilotDatabaseFile(value = process.env.PILOT_DB ?? fileURLToPath(new URL('../../.cache/test-drive-pilot/data.sqlite', import.meta.url))) {
  const filename = resolve(value)
  if (!/\.(sqlite|db)$/.test(filename)) throw new Error('Bruk filendelsen .sqlite eller .db for pilotdatabasen.')
  const resolved = resolvedPath(filename)
  for (const root of [publicRoot, pilotStaticRoot]) {
    if (within(root, filename) || within(resolvedPath(resolve(root)), resolved)) {
      throw new Error('Pilotdatabasen må ligge utenfor public og dist.')
    }
  }
  return resolved
}

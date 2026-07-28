import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const projectRoot = process.cwd()
const builtImage = join(
  projectRoot,
  'dist',
  'cases',
  'RIB 785',
  'source.png',
)
const bytes = readFileSync(builtImage)

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
if (!bytes.subarray(0, 8).equals(pngSignature)) {
  throw new Error('Built RIB 785 source image is not a PNG.')
}

const width = bytes.readUInt32BE(16)
const height = bytes.readUInt32BE(20)
if (width !== 832 || height !== 1084) {
  throw new Error(
    `Built RIB 785 image is ${width} × ${height}; expected 832 × 1084.`,
  )
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const builtFiles = walk(join(projectRoot, 'dist')).map((path) =>
  relative(join(projectRoot, 'dist'), path).replaceAll('\\', '/'),
)
const forbidden = builtFiles.filter(
  (path) =>
    path.toLowerCase().endsWith('.docx') ||
    path.toLowerCase().includes('intake-report'),
)

if (forbidden.length > 0) {
  throw new Error(
    `Private intake documents were included in dist: ${forbidden.join(', ')}`,
  )
}

console.log(
  'Verified RIB 785 build asset: PNG 832 × 1084; no intake DOCX or report in dist.',
)

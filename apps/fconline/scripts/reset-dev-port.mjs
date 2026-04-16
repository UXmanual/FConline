import { execFileSync } from 'node:child_process'

const PORT = '4000'

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const stdout = error.stdout?.toString().trim()
    if (stdout) return stdout
    return ''
  }
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function getRunningProcesses() {
  const output = run('tasklist', ['/FO', 'CSV', '/NH'])
  if (!output) return []

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseCsvLine)
    .map(([imageName, pid]) => ({ imageName, pid }))
}

function getPortListenerPid(port) {
  const output = run('netstat', ['-ano', '-p', 'tcp'])
  if (!output) return null

  const line = output
    .split(/\r?\n/)
    .find((entry) => /\sLISTENING\s/.test(entry) && new RegExp(`:${port}\\s`).test(entry))

  if (!line) return null

  const parts = line.trim().split(/\s+/)
  return parts.at(-1) ?? null
}

if (process.platform !== 'win32') {
  process.exit(0)
}

const processes = getRunningProcesses()
const pid = getPortListenerPid(PORT)

if (!pid) {
  console.log(`[dev reset] Port ${PORT} is already clear.`)
  process.exit(0)
}

const owner = processes.find((processInfo) => processInfo.pid === pid)
const ownerLabel = owner?.imageName ?? 'Unknown'

console.log(`[dev reset] Reclaiming port ${PORT} from ${ownerLabel} (PID ${pid}).`)
execFileSync('taskkill', ['/PID', pid, '/T', '/F'], {
  stdio: 'inherit',
})
console.log(`[dev reset] Port ${PORT} was cleared. Starting dev server...`)

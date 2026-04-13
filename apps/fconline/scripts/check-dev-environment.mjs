import { execFileSync } from 'node:child_process'

const CONFLICTING_PROCESSES = [
  'NexonLauncher64.exe',
  'AnySign4PC.exe',
  'AnySign4PCLauncher.exe',
]

const CONFLICTING_SERVICES = [
  'Nexon Launcher',
  'AnySign4PC Launcher',
]

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

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
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
    .map(([imageName, pid]) => ({
      imageName,
      pid,
    }))
}

function getRunningConflicts(processes) {
  return processes.filter((processInfo) =>
    CONFLICTING_PROCESSES.includes(processInfo.imageName),
  )
}

function isServiceRunning(serviceName) {
  const output = run('sc.exe', ['query', serviceName])
  return /STATE\s*:\s*\d+\s+RUNNING/i.test(output)
}

function getPort4000Listener(processes) {
  const output = run('netstat', ['-ano', '-p', 'tcp'])
  if (!output) return null

  const line = output
    .split(/\r?\n/)
    .find((entry) => /\sLISTENING\s/.test(entry) && /:4000\s/.test(entry))

  if (!line) return null

  const parts = line.trim().split(/\s+/)
  const pid = parts.at(-1)
  const owner = processes.find((processInfo) => processInfo.pid === pid)

  return {
    pid,
    imageName: owner?.imageName ?? 'Unknown',
  }
}

function printConflictMessage(conflicts, runningServices, portListener) {
  console.error('')
  console.error('[dev preflight] Blocked dev startup on Windows.')
  console.error(
    '[dev preflight] Windows background software can freeze or destabilize Next.js dev startup.',
  )
  console.error(
    '[dev preflight] NEXON Launcher or AnySign4PC related software is currently active.',
  )
  console.error('')

  if (conflicts.length > 0) {
    console.error('Detected processes:')
    for (const conflict of conflicts) {
      console.error(`- ${conflict.imageName} (PID ${conflict.pid})`)
    }
    console.error('')
  }

  if (runningServices.length > 0) {
    console.error('Detected running services:')
    for (const serviceName of runningServices) {
      console.error(`- ${serviceName}`)
    }
    console.error('')
  }

  if (portListener) {
    console.error('Port 4000 is already in use:')
    console.error(`- ${portListener.imageName} (PID ${portListener.pid})`)
    console.error('')
  }

  console.error('Recommended steps:')
  console.error('- Close NEXON Launcher and AnySign4PC related apps before `npm run dev`.')
  console.error('- Disable NEXON Launcher auto-start, then reboot Windows if the processes return automatically.')
  console.error(
    "- Retry with PowerShell from repo root: `npm.cmd run dev --workspace apps/fconline`",
  )
  console.error('')
  console.error('Quick PowerShell checks:')
  console.error("- `Get-Process NexonLauncher64,AnySign4PC,AnySign4PCLauncher -ErrorAction SilentlyContinue`")
  console.error("- `netstat -ano | findstr :4000`")
  console.error('')
}

function printPortMessage(portListener) {
  console.error('')
  console.error('[dev preflight] Blocked dev startup because port 4000 is already in use.')
  console.error(`- ${portListener.imageName} (PID ${portListener.pid})`)
  console.error('')
  console.error('Stop the stale process, then retry `npm run dev`.')
  console.error("Quick PowerShell checks:")
  console.error("- `netstat -ano | findstr :4000`")
  console.error("- `Get-Process -Id <PID>`")
  console.error('')
}

if (process.platform === 'win32') {
  const processes = getRunningProcesses()
  const conflicts = getRunningConflicts(processes)
  const runningServices = CONFLICTING_SERVICES.filter(isServiceRunning)
  const portListener = getPort4000Listener(processes)

  if (conflicts.length > 0 || runningServices.length > 0) {
    printConflictMessage(conflicts, runningServices, portListener)
    process.exit(1)
  }

  if (portListener) {
    printPortMessage(portListener)
    process.exit(1)
  }
}

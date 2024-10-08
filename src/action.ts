import { getInput, setOutput, summary } from '@actions/core'
import { Level, PrereleaseLevel, VersionFormat } from './common'

export interface Input {
  baseVersion: string
  format: VersionFormat
  level: Level
  releaseTagPattern: RegExp
  githubToken: string
  build?: string
}

export function getActionInput(): Input {
  const result: Input = {
    baseVersion: getInput('version', { required: true }),
    format: getInput('versionFormat', { required: true }) as VersionFormat,
    level: getInput('level', { required: true }) as Level,
    releaseTagPattern: new RegExp(
      getInput('releaseTagPattern', { required: true })
    ),
    githubToken: getInput('token', { required: true })
  }

  const build = getInput('build')
  if (build) result.build = build

  if (
    ![
      Level.NONE,
      Level.MAJOR,
      Level.MINOR,
      Level.PATCH,
      Level.RELEASE_CANDIDATE,
      Level.BETA,
      Level.ALPHA,
      Level.DEVELOPMENT
    ].includes(result.level)
  )
    throw new Error(`Invalid level ${result.level}`)
  return result
}

export interface Output {
  version: string
  baseRelease: string
  baseReleaseMinor: string
  versionNoBuild: string
  major: number
  minor: number
  patch: number
  isPrerelease: boolean
  prereleaseType?: PrereleaseLevel
  prereleaseNumber?: number
  build?: string
}

export async function setActionOutput(value: Output): Promise<void> {
  Object.entries(value)
    .filter(([, v]) => typeof v !== 'boolean' || v)
    .forEach(([k, v]) => setOutput(k, v))
  summary.addHeading(`Next version ${value.version}`)
  summary.addTable([
    [
      { data: 'Output field', header: true },
      { data: 'Value', header: true }
    ],
    ...Object.entries(value).map(([k, v]) => [
      { data: `${k}`, header: true },
      `${v}`
    ])
  ])
  await summary.write()
}

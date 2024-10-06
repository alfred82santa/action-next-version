import { compare, parse, SemVer } from 'semver'

import { GitHub } from '@actions/github/lib/utils'
import { Level, mapPrereleaseStrToLevel, VersionInfo } from './common'
import { Config } from './config'

/* eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const { t, src } = require('semver/internal/re')

const BUILDPART = '(\\+([\\d\\w]([+._-]?[\\d\\w]+)*))?'

export function getPatternByBaseAndLevel(
  level: Level,
  baseVersion: SemVer
): RegExp {
  switch (level) {
    case Level.MAJOR:
      return new RegExp(`^${src[t.MAINVERSION]}$`)
    case Level.MINOR:
      return new RegExp(
        `^${baseVersion.major}\\.` +
          `(${src[t.NUMERICIDENTIFIER]})\\.` +
          `(${src[t.NUMERICIDENTIFIER]})$`
      )
    case Level.PATCH:
      return new RegExp(
        `^${baseVersion.major}\\.` +
          `${baseVersion.minor}\\.` +
          `(${src[t.NUMERICIDENTIFIER]})$`
      )
    default:
      return new RegExp(
        `^${baseVersion.major}\\.` +
          `${baseVersion.minor}\\.` +
          `${baseVersion.patch}-` +
          `${level as string}\\.` +
          `(${src[t.NUMERICIDENTIFIER]})` +
          BUILDPART +
          '$'
      )
  }
}

export async function nextRelease(
  config: Config,
  octokit: InstanceType<typeof GitHub>
): Promise<SemVer> {
  const baseVersion: SemVer | null = parse(config.baseVersion)

  if (!baseVersion) throw Error(`Invalid base version ${config.baseVersion}`)

  switch (config.level) {
    case Level.MAJOR:
      return baseVersion.inc('major')
    case Level.MINOR:
      return baseVersion.inc('minor')
    case Level.PATCH:
      return baseVersion.inc('patch')
    default: {
      const releaseSiblingPattern: RegExp = getPatternByBaseAndLevel(
        config.level,
        baseVersion
      )
      const lastRelease = (await octokit.rest.repos.listReleases()).data
        .filter(release => release.name && release.name.length > 0)
        .map(release => {
          const match = config.releaseTagPattern.exec(release.name!)
          if (match == null) return null
          return match[1]
        })
        .filter(v => v != null)
        .filter(v => releaseSiblingPattern.test(v))
        .map(v => parse(v))
        .filter(v => v != null)
        .sort((a, b) => compare(a, b))
        .pop()

      if (!lastRelease) {
        baseVersion.prerelease = [config.level as string, 0]
        baseVersion.format()
        baseVersion.raw = baseVersion.version
        return baseVersion
      }
      return lastRelease.inc('prerelease')
    }
  }
}

export function toVersionInfo(version: SemVer, build?: string): VersionInfo {
  const result: VersionInfo = {
    version: version.version,
    versionNoBuild: version.version,
    major: version.major,
    minor: version.minor,
    patch: version.patch
  }
  if (version.prerelease) {
    result.prereleaseType = mapPrereleaseStrToLevel(
      version.prerelease[0] as string
    )
    result.prereleaseNumber = version.prerelease[0] as number
  }
  if (build) {
    result.build = build
    result.version = [result.versionNoBuild, build].join('+')
  }

  return result
}

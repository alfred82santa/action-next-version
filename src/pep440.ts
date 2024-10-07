import { GitHub } from '@actions/github/lib/utils'
import {
  Level,
  mapPrereleaseStrToLevel,
  PrereleaseLevelNoDev,
  VersionInfo
} from './common'
import { Config } from './config'
import { compare, inc, Pep440Version } from '@renovatebot/pep440'
import { parse, stringify } from '@renovatebot/pep440/lib/version'
import { debug } from '@actions/core'

const NUMPART = '(?:0|[1-9][0-9]*)'
const PEP440_VERSION_PATTERNS = [
  '(?:(?<epoch>[0-9]+)!)?', // epoch
  `(?:${NUMPART}(?:\\.${NUMPART})*)`, // release segment
  [
    '(?:', // pre-release
    '[-_.]?',
    '(?:(a|b|c|rc|alpha|beta|pre|preview))',
    '[-_.]?',
    NUMPART,
    ')'
  ].join(''),
  [
    '(?:', // post release
    `(?:-${NUMPART})`,
    '|',
    '(?:',
    '[-_.]?',
    '(?:post|rev|r)',
    '[-_.]?',
    NUMPART,
    ')'
  ].join(''),
  [
    '(?:', // dev release
    '[-_.]?',
    'dev',
    '[-_.]?',
    NUMPART,
    ')?'
  ].join('')
]

function _normalizeLevelLetter(level: Level): string {
  switch (level) {
    case Level.BETA:
      return 'b'
    case Level.ALPHA:
      return 'a'
    default:
      return level as string
  }
}
function _buildPrereleasePrefixes(level: PrereleaseLevelNoDev): string[] {
  switch (level) {
    case Level.RELEASE_CANDIDATE:
      return ['rc']
    case Level.BETA:
      return ['beta', 'b']
    case Level.ALPHA:
      return ['alpha', 'a']
  }
}

const BUILDPART = '(?:\\+(?:[\\d\\w](?:[+._-]?[\\d\\w]+)*))?'

export function getPatternByBaseAndLevel(
  level: Level,
  baseVersion: Pep440Version
): RegExp {
  switch (level) {
    case Level.MAJOR:
      return new RegExp('^' + PEP440_VERSION_PATTERNS[1] + '$')
    case Level.MINOR:
      return new RegExp(
        `^${baseVersion.release[0]}\\.` + `${NUMPART}\\.` + `${NUMPART}$`
      )
    case Level.PATCH:
      return new RegExp(
        `^${baseVersion.release[0]}\\.` +
          `${baseVersion.release[1]}\\.` +
          `${NUMPART}$`
      )
    case Level.DEVELOPMENT:
      return new RegExp(
        `^${baseVersion.release[0]}\\.` +
          `${baseVersion.release[1]}\\.` +
          `${baseVersion.release[2]}` +
          PEP440_VERSION_PATTERNS[4] +
          BUILDPART +
          '$'
      )
    default: {
      const prefixes = _buildPrereleasePrefixes(level)
      const pattern = [
        '(?:', // pre-release
        '[-_.]?',
        '(?:' + prefixes.join('|') + ')',
        '[-_.]?',
        NUMPART,
        ')'
      ].join('')
      return new RegExp(
        `^${baseVersion.release[0]}\\.` +
          `${baseVersion.release[1]}\\.` +
          baseVersion.release[2] +
          `${pattern}` +
          BUILDPART +
          '$'
      )
    }
  }
}

export async function nextRelease(
  config: Config,
  octokit: InstanceType<typeof GitHub>
): Promise<Pep440Version> {
  const baseVersion: Pep440Version | null = parse(config.baseVersion)

  if (!baseVersion) throw Error(`Invalid base version ${config.baseVersion}`)

  switch (config.level) {
    case Level.MAJOR:
      return parse(inc(config.baseVersion, 'major'))!
    case Level.MINOR:
      return parse(inc(config.baseVersion, 'minor'))!
    case Level.PATCH:
      return parse(inc(config.baseVersion, 'patch'))!
    default: {
      const releaseSiblingPattern: RegExp = getPatternByBaseAndLevel(
        config.level,
        baseVersion
      )
      let lastRelease: Pep440Version | undefined = undefined
      try {
        lastRelease = (
          await Array.fromAsync(
            octokit.paginate.iterator(octokit.rest.repos.listReleases, {
              owner: config.owner,
              repo: config.repo
            })
          )
        )
          .map(resp => resp.data)
          .flat()
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
          .sort((a, b) => compare(stringify(a)!, stringify(b)!))
          .pop()
      } catch (err) {
        debug(`${err}`)
      }

      if (!lastRelease) {
        if (config.level == Level.DEVELOPMENT) {
          baseVersion.dev = [_normalizeLevelLetter(config.level), 0]
        } else {
          baseVersion.pre = [_normalizeLevelLetter(config.level), 0]
        }
        return baseVersion
      }
      if (config.level == Level.DEVELOPMENT) {
        lastRelease.dev[1] = (lastRelease.dev[1] as number) + 1
        return lastRelease
      } else {
        return parse(
          inc(
            stringify(lastRelease)!,
            'prerelease',
            _normalizeLevelLetter(config.level)
          )
        )!
      }
    }
  }
}

export function toVersionInfo(
  version: Pep440Version,
  build?: string
): VersionInfo {
  const result: VersionInfo = {
    version: version.public,
    versionNoBuild: version.public,
    major: version.release[0] ?? 0,
    minor: version.release[1] ?? 0,
    patch: version.release[2] ?? 0
  }
  if (version.pre) {
    result.prereleaseType = mapPrereleaseStrToLevel(version.pre[0] as string)
    result.prereleaseNumber = version.pre[0] as number
  }
  if (build) {
    result.build = build
    result.version = [result.versionNoBuild, build].join('+')
  }

  return result
}

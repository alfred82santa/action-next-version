import { Output } from './action'

export enum VersionFormat {
  SEMVER = 'semver',
  PEP440 = 'pep440'
}

export enum Level {
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch',
  RELEASE_CANDIDATE = 'rc',
  BETA = 'beta',
  ALPHA = 'alpha',
  DEVELOPMENT = 'dev'
}

export type PrereleaseLevelNoDev =
  | Level.RELEASE_CANDIDATE
  | Level.BETA
  | Level.ALPHA

export type PrereleaseLevel = PrereleaseLevelNoDev | Level.DEVELOPMENT

export interface VersionInfo {
  version: string
  versionNoBuild: string
  major: number
  minor: number
  patch: number
  prereleaseType?: PrereleaseLevel
  prereleaseNumber?: number
  build?: string
}

export function mapPrereleaseStrToLevel(value: string): PrereleaseLevel {
  switch (value) {
    case 'rc':
      return Level.RELEASE_CANDIDATE
    case 'beta':
    case 'b':
      return Level.BETA
    case 'alpha':
    case 'a':
      return Level.ALPHA
    case 'dev':
    default:
      return Level.DEVELOPMENT
  }
}

export function mapVersionInfoToOutput(version: VersionInfo): Output {
  return {
    ...version,
    baseRelease: [version.major, version.minor, version.patch].join('.'),
    baseReleaseMinor: [version.major, version.minor].join('.'),
    isPrerelease: !!version.prereleaseType
  }
}

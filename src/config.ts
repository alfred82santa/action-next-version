import { context } from '@actions/github'
import { Level } from './common'

export class Config {
  protected _releaseTagPattern: RegExp
  protected _level: Level
  protected _baseVersion: string
  protected _owner: string
  protected _repo: string

  constructor({
    releaseTagPattern,
    level,
    baseVersion,
    owner,
    repo
  }: {
    releaseTagPattern?: string | RegExp
    level: Level
    baseVersion: string
    owner?: string
    repo?: string
  }) {
    this._releaseTagPattern = !releaseTagPattern
      ? /v?(\d([.\-_+]?[\d\w]+)*)/
      : releaseTagPattern instanceof RegExp
        ? releaseTagPattern
        : new RegExp(releaseTagPattern)
    this._level = level
    this._baseVersion = baseVersion
    this._owner = owner ?? context.repo.owner
    this._repo = repo ?? context.repo.repo
  }

  get releaseTagPattern(): RegExp {
    return this._releaseTagPattern
  }

  get level(): Level {
    return this._level
  }

  get baseVersion(): string {
    return this._baseVersion
  }
  get owner(): string {
    return this._owner
  }
  get repo(): string {
    return this._repo
  }
}

import { Level } from './common'

export class Config {
  protected _releaseTagPattern: RegExp
  protected _level: Level
  protected _baseVersion: string

  constructor({
    releaseTagPattern,
    level,
    baseVersion
  }: {
    releaseTagPattern?: string | RegExp
    level: Level
    baseVersion: string
  }) {
    this._releaseTagPattern = !releaseTagPattern
      ? /v?(\d([.\-_+]?[\d\w]+)*)/
      : releaseTagPattern instanceof RegExp
        ? releaseTagPattern
        : new RegExp(releaseTagPattern)
    this._level = level
    this._baseVersion = baseVersion
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
}

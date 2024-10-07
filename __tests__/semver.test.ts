/**
 * Unit tests for src/semver.ts
 */

import { getPatternByBaseAndLevel, nextRelease } from '../src/semver'
import { Level } from '../src/common'
import { expect } from '@jest/globals'
import { SemVer } from 'semver'
import { GitHub } from '@actions/github/lib/utils'
import { Config } from '../src/config'
import { getOctokit } from '@actions/github'
import { _buildRelease } from './_utils'
import * as github from '../src/github'
import { context } from '@actions/github'

describe('Semver: getPatternByBaseAndLevel', () => {
  it('Major pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.MAJOR, new SemVer('2.6.4'))).toEqual(
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
    )
  })

  it('Minor pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.MINOR, new SemVer('2.6.4'))).toEqual(
      /^2\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
    )
  })

  it('Patch pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.PATCH, new SemVer('2.6.4'))).toEqual(
      /^2\.6\.(0|[1-9]\d*)$/
    )
  })

  it('Release candidate pattern', async () => {
    expect(
      getPatternByBaseAndLevel(Level.RELEASE_CANDIDATE, new SemVer('2.6.4'))
    ).toEqual(/^2\.6\.4-rc\.(0|[1-9]\d*)(\+([\d\w]([+._-]?[\d\w]+)*))?$/)
  })

  it('Beta pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.BETA, new SemVer('2.6.4'))).toEqual(
      /^2\.6\.4-beta\.(0|[1-9]\d*)(\+([\d\w]([+._-]?[\d\w]+)*))?$/
    )
  })

  it('Alpha pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.ALPHA, new SemVer('2.6.4'))).toEqual(
      /^2\.6\.4-alpha\.(0|[1-9]\d*)(\+([\d\w]([+._-]?[\d\w]+)*))?$/
    )
  })

  it('Development pattern', async () => {
    expect(
      getPatternByBaseAndLevel(Level.DEVELOPMENT, new SemVer('2.6.4'))
    ).toEqual(/^2\.6\.4-dev\.(0|[1-9]\d*)(\+([\d\w]([+._-]?[\d\w]+)*))?$/)
  })
})

describe('Semver: nextRelease', () => {
  let octokit: InstanceType<typeof GitHub>
  beforeEach(() => {
    octokit = jest.mocked(getOctokit('test'))
    jest
      .spyOn(context, 'repo', 'get')
      .mockReturnValue({ repo: 'testrepo', owner: 'testowner' })
  })

  it('Invalid base version', async () => {
    await expect(
      nextRelease(
        new Config({ baseVersion: 'invalidVersion', level: Level.MAJOR }),
        octokit
      )
    ).rejects.toThrow('Invalid base version invalidVersion')
  })

  it('Next major', async () => {
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.MAJOR }),
        octokit
      )
    ).resolves.toEqual(new SemVer('4.0.0'))
  })

  it('Next minor', async () => {
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.MINOR }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.8.0'))
  })
  it('Next patch', async () => {
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.PATCH }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.44'))
  })

  it('Next release candidate', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        'invalidVersion',
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-beta.12',
        '3.7.43-alpha.22',
        '3.7.43-dev.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.RELEASE_CANDIDATE }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.43-rc.5'))
  })

  it('Next release candidate: no previous', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-beta.12',
        '3.7.43-alpha.22',
        '3.7.43-dev.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.RELEASE_CANDIDATE }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.48-rc.0'))
  })

  it('Beta pattern', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-beta.14',
        '3.7.43-beta.12',
        '3.7.43-beta.13',
        '3.7.43-beta.116',
        '3.7.43-beta.15',
        '3.7.43-alpha.22',
        '3.7.43-dev.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.BETA }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.43-beta.117'))
  })

  it('Beta pattern: no previous', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-beta.14',
        '3.7.43-beta.12',
        '3.7.43-beta.13',
        '3.7.43-beta.116',
        '3.7.43-beta.15',
        '3.7.43-alpha.22',
        '3.7.43-dev.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.BETA }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.48-beta.0'))
  })

  it('Next alpha', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-alpha.14',
        '3.7.43-alpha.12',
        '3.7.43-alpha.13',
        '3.7.43-alpha.116',
        '3.7.43-alpha.15',
        '3.7.43-beta.22',
        '3.7.43-dev.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.ALPHA }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.43-alpha.117'))
  })

  it('Next alpha: no previous', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-alpha.14',
        '3.7.43-alpha.12',
        '3.7.43-alpha.13',
        '3.7.43-alpha.116',
        '3.7.43-alpha.15',
        '3.7.43-beta.22',
        '3.7.43-dev.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.ALPHA }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.48-alpha.0'))
  })

  it('Next development', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-dev.14',
        '3.7.43-dev.12',
        '3.7.43-dev.13',
        '3.7.43-dev.116',
        '3.7.43-dev.15',
        '3.7.43-beta.22',
        '3.7.43-alpha.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.DEVELOPMENT }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.43-dev.117'))
  })

  it('Next development: no previous', async () => {
    jest
      .spyOn(github, 'getReleases')
      .mockResolvedValue([
        '3.7.43-rc.3',
        '3.7.44-rc.9',
        '3.7.43-rc.4',
        '3.7.43-rc.2',
        '3.7.43-dev.14',
        '3.7.43-dev.12',
        '3.7.43-dev.13',
        '3.7.43-dev.116',
        '3.7.43-dev.15',
        '3.7.43-beta.22',
        '3.7.43-alpha.32'
      ])
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.DEVELOPMENT }),
        octokit
      )
    ).resolves.toEqual(new SemVer('3.7.48-dev.0'))
  })
})

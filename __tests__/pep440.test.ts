/**
 * Unit tests for src/pep440.ts
 */

import { getPatternByBaseAndLevel, nextRelease } from '../src/pep440'
import { Level } from '../src/common'
import { expect } from '@jest/globals'
import { GitHub } from '@actions/github/lib/utils'
import { Config } from '../src/config'
import { getOctokit } from '@actions/github'
import { parse } from '@renovatebot/pep440/lib/version'
import { _buildRelease } from './_utils'

describe('PEP440: getPatternByBaseAndLevel', () => {
  it('Major pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.MAJOR, parse('2.6.4')!!)).toEqual(
      /^(?:(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*))*)$/
    )
  })

  it('Minor pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.MINOR, parse('2.6.4')!!)).toEqual(
      /^2\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/
    )
  })

  it('Patch pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.PATCH, parse('2.6.4')!)).toEqual(
      /^2\.6\.(?:0|[1-9][0-9]*)$/
    )
  })

  it('Release candidate pattern', async () => {
    expect(
      getPatternByBaseAndLevel(Level.RELEASE_CANDIDATE, parse('2.6.4')!!)
    ).toEqual(
      /^2\.6\.4(?:[-_\.]?(?:rc)[-_\.]?(?:0|[1-9][0-9]*))(?:\+(?:[\d\w](?:[+._\-]?[\d\w]+)*))?$/
    )
  })

  it('Beta pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.BETA, parse('2.6.4')!!)).toEqual(
      /^2\.6\.4(?:[-_\.]?(?:beta|b)[-_\.]?(?:0|[1-9][0-9]*))(?:\+(?:[\d\w](?:[+._\-]?[\d\w]+)*))?$/
    )
  })

  it('Alpha pattern', async () => {
    expect(getPatternByBaseAndLevel(Level.ALPHA, parse('2.6.4')!!)).toEqual(
      /^2\.6\.4(?:[-_\.]?(?:alpha|a)[-_\.]?(?:0|[1-9][0-9]*))(?:\+(?:[\d\w](?:[+._\-]?[\d\w]+)*))?$/
    )
  })

  it('Development pattern', async () => {
    expect(
      getPatternByBaseAndLevel(Level.DEVELOPMENT, parse('2.6.4')!!)
    ).toEqual(
      /^2\.6\.4(?:[-_\.]?dev[-_\.]?(?:0|[1-9][0-9]*))?(?:\+(?:[\d\w](?:[+._\-]?[\d\w]+)*))?$/
    )
  })
})

describe('PEP440: nextRelease', () => {
  let octokit: InstanceType<typeof GitHub>
  beforeEach(() => {
    octokit = jest.mocked(getOctokit('test'))
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
    ).resolves.toEqual(parse('4.0.0'))
  })

  it('Next minor', async () => {
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.MINOR }),
        octokit
      )
    ).resolves.toEqual(parse('3.8.0'))
  })
  it('Next patch', async () => {
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.PATCH }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.44'))
  })

  it('Next release candidate', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('invalidVersion'),
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43rc4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-beta.12'),
        _buildRelease('v3.7.43-alpha.22'),
        _buildRelease('v3.7.43-dev.32'),
        _buildRelease(null)
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.RELEASE_CANDIDATE }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.43-rc.5'))
  })

  it('Next release candidate: no previous', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-beta.12'),
        _buildRelease('v3.7.43-alpha.22'),
        _buildRelease('v3.7.43-dev.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.RELEASE_CANDIDATE }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.48-rc.0'))
  })

  it('Beta pattern', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-beta.14'),
        _buildRelease('v3.7.43-beta.12'),
        _buildRelease('v3.7.43-beta.13'),
        _buildRelease('v3.7.43b116'),
        _buildRelease('v3.7.43-beta.15'),
        _buildRelease('v3.7.43-alpha.22'),
        _buildRelease('v3.7.43-dev.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.BETA }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.43-beta.117'))
  })

  it('Beta pattern: no previous', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-beta.14'),
        _buildRelease('v3.7.43-beta.12'),
        _buildRelease('v3.7.43-beta.13'),
        _buildRelease('v3.7.43-beta.116'),
        _buildRelease('v3.7.43-beta.15'),
        _buildRelease('v3.7.43-alpha.22'),
        _buildRelease('v3.7.43-dev.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.BETA }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.48-beta.0'))
  })

  it('Next alpha', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-alpha.14'),
        _buildRelease('v3.7.43-alpha.12'),
        _buildRelease('v3.7.43-alpha.13'),
        _buildRelease('v3.7.43-alpha.116'),
        _buildRelease('v3.7.43-alpha.15'),
        _buildRelease('v3.7.43-beta.22'),
        _buildRelease('v3.7.43-dev.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.ALPHA }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.43-alpha.117'))
  })

  it('Next alpha: no previous', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-alpha.14'),
        _buildRelease('v3.7.43-alpha.12'),
        _buildRelease('v3.7.43-alpha.13'),
        _buildRelease('v3.7.43-alpha.116'),
        _buildRelease('v3.7.43-alpha.15'),
        _buildRelease('v3.7.43-beta.22'),
        _buildRelease('v3.7.43-dev.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.ALPHA }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.48-alpha.0'))
  })

  it('Next development', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-dev.14'),
        _buildRelease('v3.7.43-dev.12'),
        _buildRelease('v3.7.43-dev.13'),
        _buildRelease('v3.7.43-dev.116'),
        _buildRelease('v3.7.43-dev.15'),
        _buildRelease('v3.7.43-beta.22'),
        _buildRelease('v3.7.43-alpha.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.DEVELOPMENT }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.43-dev.117'))
  })

  it('Next development: no number', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-dev'),
        _buildRelease('v3.7.43-beta.22'),
        _buildRelease('v3.7.43-alpha.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.43', level: Level.DEVELOPMENT }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.43-dev.0'))
  })

  it('Next development: no previous', async () => {
    jest.spyOn(octokit.rest.repos, 'listReleases').mockResolvedValue({
      headers: {},
      status: 200,
      url: '',
      data: [
        _buildRelease('v3.7.43-rc.3'),
        _buildRelease('v3.7.44-rc.9'),
        _buildRelease('v3.7.43-rc.4'),
        _buildRelease('v3.7.43-rc.2'),
        _buildRelease('v3.7.43-dev.14'),
        _buildRelease('v3.7.43-dev.12'),
        _buildRelease('v3.7.43-dev.13'),
        _buildRelease('v3.7.43-dev.116'),
        _buildRelease('v3.7.43-dev.15'),
        _buildRelease('v3.7.43-beta.22'),
        _buildRelease('v3.7.43-alpha.32')
      ]
    })
    await expect(
      nextRelease(
        new Config({ baseVersion: '3.7.48', level: Level.DEVELOPMENT }),
        octokit
      )
    ).resolves.toEqual(parse('3.7.48-dev.0'))
  })
})

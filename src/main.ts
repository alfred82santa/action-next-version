import * as core from '@actions/core'
import { getActionInput, setActionOutput } from './action'
import { getOctokit } from '@actions/github'
import { Config } from './config'
import { mapVersionInfoToOutput, VersionFormat, VersionInfo } from './common'
import * as semver from './semver'
import * as pep440 from './pep440'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const inputData = getActionInput()
    const octokit = getOctokit(inputData.githubToken, {
      log: {
        debug: (msg: string): void => { core.debug(msg) },
        info: (msg: string): void => { core.debug(msg) },
        warn: (msg: string): void => { core.debug(msg) },
        error: (msg: string): void => { core.debug(msg) },
      }
    })
    const config = new Config(inputData)

    let versionInfo: VersionInfo
    switch (inputData.format) {
      case VersionFormat.SEMVER:
        versionInfo = semver.toVersionInfo(
          await semver.nextRelease(config, octokit),
          inputData.build
        )
        break
      case VersionFormat.PEP440:
        versionInfo = pep440.toVersionInfo(
          await pep440.nextRelease(config, octokit),
          inputData.build
        )
        break
    }

    setActionOutput(mapVersionInfoToOutput(versionInfo))
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

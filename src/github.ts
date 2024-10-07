import { GitHub } from '@actions/github/lib/utils'
import { Config } from './config'
import { arrayFromAsync } from './utils'

export async function getReleases(
  config: Config,
  octokit: InstanceType<typeof GitHub>
): Promise<string[]> {
  return (
    await arrayFromAsync(
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
}

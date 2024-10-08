import { GitHub } from '@actions/github/lib/utils'
import { Config } from './config'
import { arrayFromAsync } from './utils'
import { debug } from '@actions/core'

export async function getReleases(
  config: Config,
  octokit: InstanceType<typeof GitHub>
): Promise<string[]> {
  debug(`Listing releases for repo ${config.owner}/${config.repo}`)
  debug(`Filtering by ${config.releaseTagPattern})`)
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
    .map(item => {
      debug(`Release found: ${item.name} (${item.tag_name})`)
      return item
    })
    .filter(release => release.tag_name && release.tag_name.length > 0)
    .map(release => {
      const match = config.releaseTagPattern.exec(release.tag_name)
      if (match == null) return null
      return match[1]
    })
    .filter(v => v != null)
    .map(item => {
      debug(`Valid release found: ${item}`)
      return item
    })
}

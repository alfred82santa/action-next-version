/**
 * Unit tests utilities
 */
import type { components } from '@octokit/openapi-types/types'

export function _buildRelease(
  name: string | null
): components['schemas']['release'] {
  return {
    name: name,
    url: '',
    html_url: '',
    assets_url: '',
    upload_url: '',
    tarball_url: null,
    zipball_url: null,
    id: 0,
    node_id: '',
    tag_name: '',
    target_commitish: '',
    draft: false,
    prerelease: false,
    created_at: '',
    published_at: null,
    author: {
      name: undefined,
      email: undefined,
      login: '',
      id: 0,
      node_id: '',
      avatar_url: '',
      gravatar_id: null,
      url: '',
      html_url: '',
      followers_url: '',
      following_url: '',
      gists_url: '',
      starred_url: '',
      subscriptions_url: '',
      organizations_url: '',
      repos_url: '',
      events_url: '',
      received_events_url: '',
      type: '',
      site_admin: false,
      starred_at: undefined
    },
    assets: []
  }
}

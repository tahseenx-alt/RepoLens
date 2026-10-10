import { describe, expect, it } from 'vitest'
import { isValidOwner, isValidRepoName, parseRepoInput } from '../utils/parseRepo.js'

describe('parseRepoInput', () => {
  it.each([
    ['facebook/react', 'facebook', 'react'],
    ['  facebook/react  ', 'facebook', 'react'],
    ['facebook/react/', 'facebook', 'react'],
    ['facebook/react.git', 'facebook', 'react'],
    ['https://github.com/facebook/react', 'facebook', 'react'],
    ['http://github.com/facebook/react', 'facebook', 'react'],
    ['https://www.github.com/facebook/react', 'facebook', 'react'],
    ['github.com/facebook/react', 'facebook', 'react'],
    ['https://github.com/facebook/react.git', 'facebook', 'react'],
    ['https://github.com/facebook/react/tree/main/packages', 'facebook', 'react'],
    ['https://github.com/facebook/react?tab=readme', 'facebook', 'react'],
    ['https://github.com/facebook/react#readme', 'facebook', 'react'],
    ['git@github.com:facebook/react.git', 'facebook', 'react'],
    ['tahseenx-alt/RepoLens', 'tahseenx-alt', 'RepoLens'],
    ['vercel/next.js', 'vercel', 'next.js'],
    ['some_org/my_repo-2', null, null],
  ])('reads %s', (input, owner, repo) => {
    const result = parseRepoInput(input)
    if (owner === null) {
      // Underscores aren't allowed in GitHub usernames.
      expect(result.ok).toBe(false)
    } else {
      expect(result).toEqual({ ok: true, owner, repo })
    }
  })

  it.each([
    ['', /enter a repository/i],
    ['   ', /enter a repository/i],
    ['react', /owner\/repo/i],
    ['facebook/react/extra', /owner\/repo/i],
    ['facebook react', /spaces/i],
    ['https://gitlab.com/facebook/react', /only analyzes repositories on github\.com/i],
    ['https://github.com.evil.com/facebook/react', /only analyzes repositories on github\.com/i],
    ['https://notgithub.com/facebook/react', /only analyzes repositories on github\.com/i],
    ['ftp://github.com/facebook/react', /http and https/i],
    ['javascript:alert(1)', /owner\/repo|valid link|http/i],
    ['https://github.com/facebook', /doesn't point to a repository/i],
    ['https://github.com/', /doesn't point to a repository/i],
    ['https://user:pass@github.com/facebook/react', /normal github link/i],
    ['https://github.com/settings/profile', /not a valid github user/i],
    ['-bad/react', /not a valid github user/i],
    ['facebook/..', /not a valid repository name/i],
    ['https://', /valid link|github\.com/i],
  ])('rejects %j', (input, message) => {
    const result = parseRepoInput(input)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(message)
  })
})

describe('route parameter validation', () => {
  it('accepts real owner and repository names', () => {
    expect(isValidOwner('facebook')).toBe(true)
    expect(isValidOwner('tahseenx-alt')).toBe(true)
    expect(isValidRepoName('next.js')).toBe(true)
  })

  it('rejects names GitHub would not allow', () => {
    expect(isValidOwner('a--b')).toBe(false)
    expect(isValidOwner('x'.repeat(40))).toBe(false)
    expect(isValidOwner('orgs')).toBe(false)
    expect(isValidOwner(undefined)).toBe(false)
    expect(isValidRepoName('.')).toBe(false)
    expect(isValidRepoName('bad name')).toBe(false)
  })
})

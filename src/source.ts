import * as core from '@actions/core'
import * as github from '@actions/github'
import {CommitResponse, SourceContext} from './types'

export async function getSourceContext(
  githubToken: string,
  owner: string,
  repo: string,
  sha: string,
  branchName?: string
): Promise<SourceContext> {
  const query = `
{
  repository(owner: "${owner}", name: "${repo}") {
    object(expression: "${sha}") {
      ... on Commit {
          additions
          deletions
          message
          committedDate
          authoredByCommitter
          author {
              name
          }
          committer {
              name
          }
          url
          associatedPullRequests(first: 1) {
              nodes {
                  headRefName
                  baseRefName
                  title
                  bodyText
                  url
                  merged
              }
          }
      }
    }
  }
}`
  const octokit = github.getOctokit(githubToken)
  const result: CommitResponse = await octokit.graphql(query)
  if (!result?.repository?.object) {
    core.setFailed(`Error fetching sha: ${sha}`)
  }

  const object = result.repository.object
  const prs = object.associatedPullRequests?.nodes ?? []
  let pr = null
  if (prs.length > 0) {
    pr = prs[0]
  }

  const branch = pr
    ? pr.merged
      ? pr.baseRefName
      : pr.headRefName
    : branchName ?? ''
  const commitBy = object.authoredByCommitter
    ? object.author?.name
    : `${object.committer?.name}/${object.author?.name}`

  const sourceContext: SourceContext = {
    owner,
    repo,
    sha,
    branch,
    author: object.author?.name,
    committer: object.committer?.name,
    commitBy,
    date: object.committedDate,
    message: object.message,
    url: object.url
  }

  if (pr) {
    sourceContext.pr = {
      title: pr.title,
      body: pr.bodyText,
      url: pr.url
    }
  }
  return sourceContext
}

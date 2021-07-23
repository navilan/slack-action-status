import * as core from '@actions/core'
import * as github from '@actions/github'
import {Indicators, KVP, SlackActionStatusInput, SourceContext} from './types'

import {
  actionError,
  ActionError,
  isMultiVars,
  parseMultiLineKVP
} from './parsers'

type SlackActionStatusInputs = `${string & keyof SlackActionStatusInput}`

type Context = typeof github.context
type WebhookPayload = Context['payload']
type PullRequest = Exclude<WebhookPayload['pull_request'], undefined>

type HasPullRequest = {
  pull_request: PullRequest
}

function hasPR(payload: WebhookPayload): payload is HasPullRequest {
  return payload.pull_request !== undefined && payload.pull_request !== null
}

function getInput(
  name: SlackActionStatusInputs,
  opts?: core.InputOptions,
  defaultValue?: string
): string {
  const input = core.getInput(name, opts)
  if (
    defaultValue !== undefined &&
    (input === null || input === undefined || input.trim() === '')
  ) {
    return defaultValue
  }
  return input
}

const defaultIndicators: Indicators = {
  unclear: ':hash:',
  queued: ':double_vertical_bar:',
  running: ':hourglass:',
  completed: ':white_check_mark:',
  failed: ':x:',
  cancelled: ':octagonal_sign:',
  skipped: ':white_medium_square:'
}

interface AssembledInput {
  githubToken: string
  botToken: string
  channelId: string
  templateFile?: string
  messageId?: string
  status: string
  params: KVP
  indicators: Indicators
  inclusionSuffix?: string
  forceFailure: boolean
  forceSuccess: boolean
}

export function processInput(): AssembledInput | ActionError {
  const githubToken = getInput('githubToken', {required: true})
  const botToken = getInput('botToken', {required: true})
  const channelId = getInput('channelId', {required: true})
  const status = getInput('status', {required: true})

  const messageId = getInput('messageId', {required: false})
  const inclusionSuffix = getInput('inclusionSuffix', {required: false})
  const templateFile = getInput('templateFile', {required: false})
  const rawParams = parseMultiLineKVP(getInput('params', {required: false}))
  const forceFailure = getInput('forceFailure', {required: false}) === 'true'
  const forceSuccess = getInput('forceSuccess', {required: false}) === 'true'
  let params
  if (isMultiVars(rawParams)) {
    params = rawParams
  } else {
    return actionError(
      rawParams.reduce((msg, err) => `${msg}\n${err.message}`, '')
    )
  }

  const rawIndicators = parseMultiLineKVP(
    getInput('indicators', {required: false})
  )
  let indicators
  if (isMultiVars(rawIndicators)) {
    indicators = {...defaultIndicators, ...rawIndicators.variables}
  } else {
    return actionError(
      rawIndicators.reduce((msg, err) => `${msg}\n${err.message}`, '')
    )
  }

  return {
    githubToken,
    botToken,
    channelId,
    templateFile,
    messageId,
    status,
    params: params.variables,
    indicators,
    inclusionSuffix,
    forceFailure,
    forceSuccess
  }
}

export function processGithubContext(): SourceContext {
  const {repo: repoFull, payload, ref, workflow, eventName} = github.context
  const {owner, repo} = repoFull
  const branch = hasPR(payload)
    ? payload.pull_request.head.ref
    : ref.replace('refs/heads/', '')
  const sha = hasPR(payload)
    ? payload.pull_request.head.sha
    : github.context.sha
  const diff = hasPR(payload)
    ? `${payload.pull_request._links.html.href}/files`
    : payload.compare
  const source = hasPR(payload) ? payload.pull_request.title : branch
  const url = hasPR(payload)
    ? payload.pull_request.html_url
    : payload.head_commit.url
  const description = hasPR(payload)
    ? payload.pull_request.body
    : payload.head_commit.message
  const user = payload.sender?.login ?? owner
  const runId = github.context.runId
  const workflowUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}`
  const currentJobId = github.context.job
  return {
    runId,
    currentJobId,
    links: {
      diff,
      eventSource: url,
      workflow: workflowUrl
    },
    workflow,
    owner,
    repo,
    sha,
    branch,
    eventSource: source,
    eventName,
    description,
    user
  }
}

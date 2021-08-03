import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  Indicators,
  KVP,
  SlackActionStatusInput,
  SourceContext,
  WorkflowContext
} from './types'

import {
  actionError,
  ActionError,
  isMultiVars,
  parseMultiLineKVP
} from './parsers'
import {getSourceContext} from './source'

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
  sourceSHA?: string
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
  const sourceSHA = getInput('sourceSHA', {required: false})
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
    sourceSHA,
    indicators,
    inclusionSuffix,
    forceFailure,
    forceSuccess
  }
}

export function processWorkflowContext(): WorkflowContext {
  core.info(JSON.stringify(github.context))
  const {repo: repoFull, workflow} = github.context
  const {owner, repo} = repoFull
  const runId = github.context.runId
  const workflowUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}`
  const currentJobId = github.context.job
  return {
    runId,
    currentJobId,
    name: workflow,
    url: workflowUrl
  }
}

export async function processSourceContext(
  inputContext: AssembledInput
): Promise<SourceContext> {
  const {owner, repo} = github.context.repo
  const {payload, ref} = github.context
  const branch = hasPR(payload)
    ? payload.pull_request.head.ref
    : ref.replace('refs/heads/', '')
  const sha = hasPR(payload)
    ? payload.pull_request.head.sha
    : github.context.sha
  const shaInput = (inputContext.sourceSHA ?? '').trim()
  const sourceContext = await getSourceContext(
    inputContext.githubToken,
    owner,
    repo,
    shaInput === '' ? sha : shaInput,
    branch
  )
  return sourceContext
}

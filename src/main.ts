import * as core from '@actions/core'
import * as github from '@actions/github'
import {renderTemplate} from './template'
import type {KVP} from './template'
import {WebClient} from '@slack/web-api'

interface SlackActionStatusInput {
  botToken: string
  channelId: string
  messageId?: string
  templateFile: string
  status: string
  completedPhases?: string[]
  currentPhase?: string
  pendingPhases?: string[]
  completedPhaseIndicator: string
  currentPhaseIndicator: string
  pendingPhaseIndicator: string
  params: KVP
}

type SlackActionStatusInputs = `${string & keyof SlackActionStatusInput}`

interface ActionError {
  __error: true
  message: string
}

interface MultiVars {
  __error: false
  variables: KVP
}

function multiVars(key: string, value: string): MultiVars {
  return {
    __error: false,
    variables: {[key]: value}
  }
}

function multiVarMerge(left: MultiVars, right: MultiVars): MultiVars {
  return {
    __error: false,
    variables: {...left.variables, ...right.variables}
  }
}

function actionError(message: string): ActionError {
  return {__error: true, message}
}

const empty: MultiVars = {__error: false, variables: {}}

const kvpRegEx = RegExp(/\s*-\s*([^:]*):\s*(.*)/).compile()
function parseLine(line: string): MultiVars | ActionError {
  const matches = line.match(kvpRegEx) ?? []
  if (matches.length !== 2) {
    return actionError(`Invalid input: ${line}. Expecting - <key>: <value>.`)
  }
  return multiVars(matches[0], matches[1])
}

function parseMultiLineKVP(input: string | null): MultiVars | ActionError[] {
  const multilineInput = input?.trim() ?? ''
  if (multilineInput === '') {
    return empty
  }
  const lines = multilineInput.split('\n')
  const vars = lines.map(parseLine)
  const errors = vars.filter(v => v.__error === true) as ActionError[]
  const mVars: MultiVars[] = vars.filter(
    v => v.__error === false
  ) as MultiVars[]
  return errors.length > 0 ? errors : mVars.reduce(multiVarMerge, empty)
}

function parseList(listInput: string | null): string[] {
  const string = listInput?.trim()
  if (string === null || string === undefined || string === '') {
    return []
  } else {
    return string.split(',')
  }
}

function isMultiVars(val: unknown): val is MultiVars {
  return (
    (val as MultiVars).__error === false &&
    (val as MultiVars).variables !== undefined
  )
}

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
  opts?: core.InputOptions
): string {
  return core.getInput(name, opts)
}

async function run(): Promise<void> {
  try {
    const botToken = getInput('botToken', {required: true})
    const channelId = getInput('channelId', {required: true})
    const messageId = getInput('messageId', {required: false})
    const status = getInput('status', {required: false})
    const isUpdate =
      messageId !== null && messageId !== undefined && messageId !== ''
    const templateFile = getInput('templateFile', {required: true})
    const completedPhases = parseList(
      core.getInput('completedPhases', {required: false})
    )
    const pendingPhases = parseList(
      core.getInput('completedPhases', {required: false})
    )
    const currentPhase = getInput('currentPhase', {required: false})
    const currentPhaseIndicator =
      getInput('currentPhaseIndicator', {
        required: false
      }) ?? ':hourglass:'
    const pendingPhaseIndicator =
      getInput('pendingPhaseIndicator', {
        required: false
      }) ?? ':double_vertical_bar:'
    const completedPhaseIndicator =
      getInput('completedPhaseIndicator', {
        required: false
      }) ?? ':white_check_mark:'
    const rawParams = parseMultiLineKVP(getInput('params', {required: false}))
    let params
    if (isMultiVars(rawParams)) {
      params = rawParams
    } else {
      core.setFailed(
        rawParams.reduce((msg, err) => `${msg}\n${err.message}`, '')
      )
      return
    }
    const {repo: repoFull, payload, ref, workflow, eventName} = github.context
    const {owner, repo} = repoFull
    const branch = hasPR(payload)
      ? payload.pull_request.head.ref
      : ref.replace('refs/heads/', '')
    const sha = hasPR(payload)
      ? payload.pull_request.head.sha
      : github.context.sha
    const url = hasPR(payload)
      ? payload.pull_request.html_url
      : payload.head_commit.url
    const diff = hasPR(payload) ? payload.pull_request.compare : payload.compare
    const source = hasPR(payload) ? payload.pull_request.title : branch
    const commitMessage = payload.head_commit.message
    const user = payload.head_commit.author.username
    const thisPhase =
      currentPhase.trim() === ''
        ? []
        : [{name: currentPhase, indicator: currentPhaseIndicator}]
    const phases = [
      ...completedPhases.map(ph => ({
        name: ph,
        indicator: completedPhaseIndicator
      })),
      ...thisPhase,
      ...pendingPhases.map(ph => ({
        name: ph,
        indicator: pendingPhaseIndicator
      }))
    ]
    const gh = {
      diff,
      owner,
      repo,
      sha,
      branch,
      event: eventName,
      source,
      url,
      commitMessage,
      user
    }
    const contextVars = {
      workflow,
      gh,
      phases,
      status
    }
    // Load template file
    const vars = {params: params.variables, ...contextVars}
    const message = await renderTemplate(templateFile, vars)
    if (!message) {
      core.setFailed(`Cannot render template {templateFile}`)
      return
    }
    const blocks = JSON.parse(message).blocks
    const postArgs = {
      channel: channelId,
      blocks,
      text: status
    }
    const updateArgs = {...postArgs, ts: messageId ?? ''}

    const slack = new WebClient(botToken)
    const response = isUpdate
      ? await slack.chat.update(updateArgs)
      : await slack.chat.postMessage(postArgs)
    core.setOutput('message_id', response.ts)
  } catch (error) {
    core.setFailed(error)
  }
}

run()

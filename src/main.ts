import * as core from '@actions/core'
import * as github from '@actions/github'
import {renderTemplate} from './template'
import {KVP} from './types'
import {WebClient} from '@slack/web-api'

import {isMultiVars, parseList, parseMultiLineKVP} from './parsers'

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
      core.getInput('pendingPhases', {required: false})
    )
    const currentPhase = getInput('currentPhase', {required: false})
    const currentPhaseIndicator = getInput(
      'currentPhaseIndicator',
      {
        required: false
      },
      ':hourglass:'
    )
    const pendingPhaseIndicator = getInput(
      'pendingPhaseIndicator',
      {
        required: false
      },
      ':double_vertical_bar:'
    )
    const completedPhaseIndicator = getInput(
      'completedPhaseIndicator',
      {
        required: false
      },
      ':white_check_mark:'
    )
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
    const diff = hasPR(payload) ? payload.pull_request.compare : payload.compare
    const source = hasPR(payload) ? payload.pull_request.title : branch
    const url = hasPR(payload)
      ? payload.pull_request.html_url
      : payload.head_commit.url
    const commitMessage = hasPR(payload)
      ? payload.pull_request.body
      : payload.head_commit.message
    const user = payload.sender?.login ?? owner
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
      text: status,
      unfurl_links: false,
      unfurl_media: false
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

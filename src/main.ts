import * as core from '@actions/core'
import {renderTemplate} from './template'
import {
  Block,
  ChatPostMessageArguments,
  KnownBlock,
  WebClient
} from '@slack/web-api'

import {
  processInput,
  processSourceContext,
  processWorkflowContext
} from './assembler'
import {getJobs} from './jobs'
import {ActionError} from './parsers'
import {PhaseStatus} from './types'

function isActionError(obj: unknown): obj is ActionError {
  return (
    (obj as ActionError).__error === true &&
    typeof (obj as ActionError).message === 'string'
  )
}

async function run(): Promise<void> {
  try {
    const inputContext = processInput()
    if (isActionError(inputContext)) {
      core.setFailed(inputContext.message)
      return
    }
    const postArgs: ChatPostMessageArguments = {
      channel: inputContext.channelId,
      text: inputContext.status,
      unfurl_links: false,
      unfurl_media: false
    }
    if (inputContext.templateFile) {
      const workflowContext = processWorkflowContext()
      const githubContext = await processSourceContext(inputContext)
      const jobs = await getJobs(
        inputContext.githubToken,
        githubContext.owner,
        githubContext.repo,
        workflowContext.runId,
        (status: PhaseStatus) => inputContext.indicators[status] ?? '',
        inputContext.inclusionSuffix
      )
      if (inputContext.forceFailure || inputContext.forceSuccess) {
        const jobStatus: PhaseStatus = inputContext.forceFailure
          ? 'failed'
          : 'completed'
        const jobIndicator = inputContext.indicators[jobStatus]
        const currentJob = jobs.find(
          j => j.name === workflowContext.currentJobId
        )
        if (currentJob) {
          currentJob.indicator = jobIndicator
          currentJob.status = jobStatus
        }
      }
      const vars = {
        params: inputContext.params,
        workflow: workflowContext,
        source: githubContext,
        status: inputContext.status,
        jobs
      }
      const message = await renderTemplate(inputContext.templateFile, vars)
      if (!message) {
        core.setFailed(`Cannot render template ${inputContext.templateFile}`)
        return
      }
      const blocks: (Block | KnownBlock)[] = JSON.parse(message).blocks
      postArgs.blocks = blocks.slice(0, 49)
    }
    const updateArgs = {...postArgs, ts: inputContext.messageId ?? ''}
    const slack = new WebClient(inputContext.botToken)
    const messageId = inputContext.messageId
    const isUpdate =
      messageId !== null && messageId !== undefined && messageId !== ''
    const response = isUpdate
      ? await slack.chat.update(updateArgs)
      : await slack.chat.postMessage(postArgs)
    core.setOutput('message_id', response.ts)
  } catch (error) {
    core.setFailed(error)
  }
}

run()

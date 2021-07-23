import * as core from '@actions/core'
import {renderTemplate} from './template'
import {ChatPostMessageArguments, WebClient} from '@slack/web-api'

import {processGithubContext, processInput} from './assembler'
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
      const githubContext = processGithubContext()
      const jobs = await getJobs(
        inputContext.githubToken,
        githubContext.owner,
        githubContext.repo,
        githubContext.runId,
        (status: PhaseStatus) => inputContext.indicators[status] ?? '',
        inputContext.exclusionSuffix
      )
      core.info(JSON.stringify(jobs))
      const contextVars = {
        gh: githubContext,
        status: inputContext.status,
        jobs
      }
      // Load template file
      const vars = {params: inputContext.params, ...contextVars}
      const message = await renderTemplate(inputContext.templateFile, vars)
      if (!message) {
        core.setFailed(`Cannot render template ${inputContext.templateFile}`)
        return
      }
      postArgs.blocks = JSON.parse(message).blocks
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

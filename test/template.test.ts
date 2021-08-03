import {expect, describe, it} from '@jest/globals'
import {renderTemplate} from '../src/template'
import {TemplateVars} from '../src/types'

import expected from './expected.json'

const vars: TemplateVars = {
  status: 'Testing',
  workflow: {
    runId: 55796,
    currentJobId: '7789',
    name: 'build-test',
    url: 'https://github.com/navilan/slack-action-status'
  },
  source: {
    owner: 'navilan',
    repo: 'slack-action-status',
    sha: 'c5c7b0a3cf6b51d18ec7032eef5b8788fd483123',
    author: 'navilan',
    committer: 'navilan',
    commitBy: 'navilan',
    date: new Date(),
    branch: 'main',
    message:
      '- Use the octokit API to get the job and step statuses(#11)\r\n- Add example for passing slack message id between jobs(#8)\n- Refactor code for better modularity(#10)\r\n - Improve Readme a bit.\r\n',
    url: 'https://github.com/commits',
    pr: {
      title: 'New PR',
      body: 'Awesome changes',
      url: 'https://github.com/pulls'
    }
  },
  jobs: [
    {
      name: 'Slack',
      status: 'completed',
      indicator: ':white_check_mark:'
    },
    {
      name: 'PROnly',
      status: 'skipped',
      indicator: ':white_medium_square:'
    },
    {
      name: 'Setup',
      status: 'completed',
      indicator: ':white_check_mark:'
    },
    {
      name: 'Prepare',
      status: 'completed',
      indicator: ':white_check_mark:'
    },
    {
      name: 'Test',
      status: 'running',
      indicator: ':hourglass:',
      steps: [
        {
          name: 'lint',
          status: 'completed',
          indicator: ':white_check_mark:'
        },
        {
          name: 'unit tests',
          status: 'running',
          indicator: ':hourglass:'
        },
        {
          name: 'integration tests',
          status: 'queued',
          indicator: ':double_vertical_bar:'
        },
        {
          name: 'e2e',
          status: 'unclear',
          indicator: ':hash:'
        }
      ]
    },
    {
      name: 'Build Images',
      status: 'queued',
      indicator: ':double_vertical_bar:'
    },
    {
      name: 'Publish',
      status: 'unclear',
      indicator: ':hash:'
    }
  ],
  params: {
    name1: 'Github',
    link1: 'https://github.com'
  }
}
describe('Sample Template', () => {
  it('Succeeds', async () => {
    const message = await renderTemplate(
      '.github/workflows/slack-blocks.json.eta',
      vars
    )
    const object = JSON.parse(message || '{}')
    expect(object).toEqual(expected)
  })
})

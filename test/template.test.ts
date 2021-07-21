import {expect, describe, it} from '@jest/globals'
import {renderTemplate} from '../src/template'

import expected from './expected.json'

const vars = {
  params: {},
  workflow: 'build-test',
  status: 'Testing',
  gh: {
    owner: 'navilan',
    repo: 'slack-action-status',
    sha: 'c5c7b0a3cf6b51d18ec7032eef5b8788fd483123',
    branch: 'main',
    event: 'push',
    source: 'main',
    url: 'https://github.com',
    commitMessage: 'Add simple block templating',
    user: 'navilan',
    diff:
      'https://github.com/navilan/slack-action-status/compare/aa6be6db2eef...80c99e0fbb1f'
  },
  phases: [
    {name: 'Setup', indicator: ':white_check_mark:'},
    {name: ' Build', indicator: ':white_check_mark:'},
    {name: 'Test', indicator: ':hourglass:'},
    {name: 'Setup', indicator: ':double_vertical_bar:'},
    {name: ' Build', indicator: ':double_vertical_bar:'}
  ]
}
describe('Sample Template', () => {
  it('Succeeds', async () => {
    const message = await renderTemplate(
      '.github/workflows/slack-blocks.json',
      vars
    )
    const object = JSON.parse(message || '{}')
    expect(object).toEqual(expected)
  })
})

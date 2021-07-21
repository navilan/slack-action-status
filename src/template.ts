import * as Eta from 'eta'
import * as Path from 'path'
import type {KVP} from './types'

export interface TemplateVars {
  params: KVP
  workflow: string
  gh: {
    diff: string
    owner: string
    repo: string
    sha: string
    branch: string
    event: string
    source: string
    url: string
    commitMessage: string
    user: string
  }
  phases: {
    name: string
    indicator: string
  }[]
}

export async function renderTemplate(
  file: string,
  vars: TemplateVars
): Promise<string | void> {
  const config = Eta.getConfig({})
  const message = await Eta.renderFileAsync(Path.resolve(file), vars, config)
  return message
}

import * as Eta from 'eta'
import * as Path from 'path'

import {TemplateVars} from './types'

export async function renderTemplate(
  file: string,
  vars: TemplateVars
): Promise<string | void> {
  const config = Eta.getConfig({})
  const message = await Eta.renderFileAsync(Path.resolve(file), vars, config)
  return message
}

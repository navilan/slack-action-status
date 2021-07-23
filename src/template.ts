import * as Eta from 'eta'
import * as Path from 'path'

import {TemplateVars} from './types'

type ReadonlyObj = {[k in PropertyKey]: unknown}

export function escapeLineBreaks<T>(obj: T): T {
  const escape = (val: string): string => val.replace(/\r*\n/g, '\\n')
  const isString = (val: unknown): val is string => typeof val === 'string'
  const isArray = (val: unknown): val is unknown[] =>
    typeof val === 'object' && Array.isArray(val)
  const isObject = (val: unknown): val is ReadonlyObj =>
    typeof val === 'object' && !Array.isArray(val)

  const escapeVal = <X>(value: X): X => {
    let escaped
    if (isString(value)) {
      escaped = escape(value)
    } else if (isArray(value)) {
      escaped = value.map(escapeVal)
    } else if (isObject(value)) {
      escaped = escapeValues(value)
    } else {
      escaped = value
    }
    return escaped as X
  }
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const escapeValues = (val: unknown) =>
    !isObject(val)
      ? val
      : Object.fromEntries(
          Object.entries(val).reduce((result, [key, value]) => {
            result.push([key, escapeVal(value)])
            return result
          }, [] as [key: string, value: unknown][])
        )
  return escapeValues(obj) as T
}

export async function renderTemplate(
  file: string,
  vars: TemplateVars
): Promise<string | void> {
  const config = Eta.getConfig({autoEscape: false, autoTrim: false})
  const message = await Eta.renderFileAsync(
    Path.resolve(file),
    escapeLineBreaks(vars),
    config
  )
  return message
}

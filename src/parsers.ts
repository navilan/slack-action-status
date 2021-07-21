import type {KVP} from './types'

export interface ActionError {
  __error: true
  message: string
}

export interface MultiVars {
  __error: false
  variables: KVP
}

export function multiVars(key: string, value: string): MultiVars {
  return {
    __error: false,
    variables: {[key]: value}
  }
}

export function multiVarMerge(left: MultiVars, right: MultiVars): MultiVars {
  return {
    __error: false,
    variables: {...left.variables, ...right.variables}
  }
}

export function actionError(message: string): ActionError {
  return {__error: true, message}
}

export const empty: MultiVars = {__error: false, variables: {}}

const kvpRegEx = /\s*-\s*(?<key>[^:]+):\s*(?<value>.+)/

export function parseLine(line: string): MultiVars | ActionError {
  const matches = kvpRegEx.exec(line) ?? []
  if (matches?.length < 3) {
    return actionError(`Invalid input: ${line}. Expecting - <key>: <value>.`)
  }
  return multiVars(matches[1], matches[2])
}

export function parseMultiLineKVP(
  input: string | null
): MultiVars | ActionError[] {
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

export function parseList(listInput: string | null): string[] {
  const string = listInput?.trim()
  if (string === null || string === undefined || string === '') {
    return []
  } else {
    return string.split(',')
  }
}

export function isMultiVars(val: unknown): val is MultiVars {
  return (
    (val as MultiVars).__error === false &&
    (val as MultiVars).variables !== undefined
  )
}

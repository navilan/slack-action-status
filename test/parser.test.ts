import {isMultiVars, parseLine, parseMultiLineKVP} from '../src/parsers'
import {expect, describe, it} from '@jest/globals'

describe('MultiVar Parser', () => {
  it('Parses A Line', () => {
    const expected = {
      GHL: 'Github'
    }
    const input = '- GHL: Github'
    const result = parseLine(input)
    expect(isMultiVars(result)).toBe(true)
    if (isMultiVars(result)) {
      expect(result.variables).toEqual(expected)
    }
  })
  it('Parses KVP', () => {
    const expected = {
      GHL: 'Github',
      MSL: 'Microsoft',
      GGL: 'Google',
      APL: 'Apple'
    }
    const input = '- GHL: Github\n- MSL: Microsoft\n- APL: Apple\n- GGL: Google'
    const result = parseMultiLineKVP(input)
    expect(isMultiVars(result)).toBe(true)
    if (isMultiVars(result)) {
      expect(result.variables).toEqual(expected)
    }
  })
})

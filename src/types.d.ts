export type KVP = {
  readonly [k in PropertyKey]: string
}

export type PhaseStatus =
  | 'unclear'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped'

export type Indicators = {readonly [k in PhaseStatus]: string}

export interface Phase {
  name: string
  status: PhaseStatus
  indicator: string
}

export interface HasSteps {
  steps?: Phase[]
}

export type Job = Phase & HasSteps

interface SlackActionStatusInput {
  githubToken: string
  botToken: string
  channelId: string
  status: string
  params: KVP
  indicators: KVP
  messageId?: string
  templateFile?: string
  exclusionSuffix?: string
}

export interface SourceContext {
  runId: number
  links: {
    diff: string
    eventSource: string
    workflow: string
  }
  workflow: string
  owner: string
  repo: string
  sha: string
  branch: string
  eventSource: string
  eventName: string
  description: string
  user: string
}

export interface TemplateVars {
  status: string
  params: KVP
  gh: SourceContext
  jobs: Job[]
}

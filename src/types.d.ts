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
  inclusionSuffix?: string
  sourceSHA?: string
  forceFailure?: boolean
  forceSuccess?: boolean
}

export interface WorkflowContext {
  runId: number
  currentJobId: string
  url: string
  name: string
}

export interface PullRequest {
  title: string
  body: string
  url: string
}

export interface SourceContext {
  owner: string
  repo: string
  sha: string
  branch: string
  author: string
  committer: string
  commitBy: string
  date: Date
  message: string
  url: string
  pr?: PullRequest
}

export interface CommitResponse {
  repository: {
    object: {
      additions: number
      deletions: number
      message: string
      committedDate: Date
      authoredByCommitter: boolean
      author: {
        name: string
      }
      committer: {
        name: string
      }
      url: string
      associatedPullRequests: {
        nodes: {
          headRefName: string
          baseRefName: string
          title: string
          bodyText: string
          url: string
          merged: boolean
        }[]
      }
    }
  }
}

export interface TemplateVars {
  status: string
  params: KVP
  workflow: WorkflowContext
  source: SourceContext
  jobs: Job[]
}

import * as github from '@actions/github'
import {Job, Phase, PhaseStatus} from './types'
import {components} from '@octokit/openapi-types'

type OJob = components['schemas']['job']
type OSteps = Exclude<OJob['steps'], undefined>
type OStep = OSteps[number]

interface Runnable {
  name: string
  status: OStep['status']
  conclusion: OStep['conclusion']
}

type Conclusions =
  | 'neutral'
  | 'skipped'
  | 'success'
  | 'cancelled'
  | 'timed_out'
  | 'action_required'
  | 'failure'

function getPhaseStatus(obj: Runnable): PhaseStatus {
  switch (obj.status) {
    case 'queued':
      return 'queued'
    case 'in_progress':
      return 'running'
    case 'completed':
      switch (obj.conclusion as Conclusions) {
        case 'cancelled':
          return 'cancelled'
        case 'failure':
          return 'failed'
        case 'success':
          return 'completed'
        case 'skipped':
          return 'skipped'
        default:
          return 'unclear'
      }
  }
}

type IndicatorLookup = (status: PhaseStatus) => string

function makePhase(obj: Runnable, indicatorLookup: IndicatorLookup): Phase {
  const status = getPhaseStatus(obj)
  const indicator = indicatorLookup(status)
  return {
    name: obj.name,
    status,
    indicator
  }
}

function makeJob(
  job: OJob,
  indicatorLookup: IndicatorLookup,
  inclusionSuffix?: string
): Job {
  return {
    ...makePhase(job, indicatorLookup),
    steps: (job.steps ?? [])
      .filter(s => !inclusionSuffix || s.name.endsWith(inclusionSuffix))
      .map(s =>
        inclusionSuffix ? {...s, name: s.name.replace(inclusionSuffix, '')} : s
      )
      .map(s => makePhase(s, indicatorLookup))
  }
}

export async function getJobs(
  githubToken: string,
  owner: string,
  repo: string,
  runId: number,
  indicatorLookup: IndicatorLookup,
  inclusionSuffix?: string
): Promise<Job[]> {
  const octokit = github.getOctokit(githubToken)
  const {
    data: {jobs: oJobs}
  } = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId
  })
  return oJobs.map(j => makeJob(j, indicatorLookup, inclusionSuffix))
}

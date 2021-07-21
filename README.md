# Why?

Aren't there enough slack notifiers already?

Yes. But none of them seem to:

a) use the new slack blocks spec
b) provide a way to customize the notification message

# How?

```
uses: navilan\slack-action-status@v1
with:
  botToken: "testBotToken"
  channelId: "testChannelId"
  templateFile: .github/workflows/slack-blocks.json
  status: "Testing Action"
  completedPhases: "Setup, Build"
  currentPhase: "Test"
  pendingPhases: "Deploy, Finalize, Finish"
  completedPhaseIndicator: ":white_check_mark:"
  currentPhaseIndicator: ":hourglass:"
  pendingPhaseIndicator: ":double_vertical_bar:"

```

## Parameters

* botToken (Required)
  [Read Slack documentation](https://api.slack.com/authentication/token-types#bot)

* channelId (Required)

  You can get the channel id by clicking the chevron on the channel header.

* templateFile (Required)

  A template using the [slack block kit](https://api.slack.com/block-kit). [These variables](#vars) are available in the template. The template is rendered using the [eta](https://eta.js.org/) engine in its default configuration.

* status (Required)

  Current status.

* completedPhases (Optional)

  A comma separated list of phases that have been completed
  
* currentPhase (Optional)

  The current build phase

* pendingPhases (Optional)

  List of pending phases

* completedPhaseIndicator (Optional)

  Text or slack emoji as an indicator for a completed phase

* currentPhaseIndicator (Optional)

  Text or slack emoji as an indicator for the current phase

* pendingPhaseIndicator (Optional)

  Text or slack emoji as an indicator for a pending phase

* params (Optional)

  A list of key, value pairs to feed the template.

  ```
  params:
    - key1: value1
    - key2: value2
  ```

* messageId (Optional)

  A slack message that needs to be updated. If this is not provided, a new message is created.

## vars

```
export interface TemplateVars {
  params: KVP // Key value pairs of the `params` in the build file
  workflow: string // The workflow thats running this action
  gh: {
    diff: string // URL to get the diff of this commit with the previous one
    owner: string // Repo owner
    repo: string // Repo name
    sha: string 
    branch: string 
    event: string // pull_request or push?
    source: string // branch or PR name based on the event
    url: string // URL for the current event (commit url or PR url)
    commitMessage: string // The message from the commit that triggered this run
    user: string // Commit author
  }
  phases: { // Phases provided in the build in a template-convenient structure
    name: string
    indicator: string
  }[]
}
```

# Thank You

[voxmedia](https://github.com/voxmedia/github-action-slack-notify-build)
#!/bin/sh
gh api repos/navilan/slack-action-status/actions/runs \
| jq -r '.workflow_runs[] | "\(.id)"' \
| xargs -n1 -I % gh api repos/navilan/slack-action-status/actions/runs/% -X DELETE
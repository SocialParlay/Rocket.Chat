# Social Parlay Linear Feed

## Overview

A public channel that shows Linear work moving: issues created, started, finished and cancelled, with how
long each took, plus cycles starting and completing. It exists for velocity visibility, not for working
Linear from chat, so it is one-way and posts nothing for comments, edits, labels, priority or assignee changes.

Nothing in the image changes for this. It is two pieces of configuration, both stored in the database:

- a Rocket.Chat **incoming webhook** integration whose transform script is `development/integrations/linear-velocity-feed.js`;
- a Linear **webhook** that delivers Issue and Cycle events to that integration's URL.

## Setup

### 1. Rocket.Chat

1. Create the channel if it does not exist, for example `#linear`, public.
2. Administration > Integrations > New > Incoming WebHook:
   - Enabled: on
   - Name: `Linear velocity feed`
   - Post to channel: `#linear`
   - Post as: `rocket.cat` (any user with the `message-impersonate` permission works)
   - Alias: `Linear`
   - Avatar URL: optional, a Linear logo
   - Script Enabled: on
   - Script: paste the whole of `development/integrations/linear-velocity-feed.js`
3. Save. Copy the **Webhook URL** shown on the integration page. It embeds the integration id and token, so
   treat it as a secret.

### 2. Linear

1. Settings > API > Webhooks > New webhook.
2. URL: the Webhook URL from step 1.
3. Resource types: **Issues** and **Cycles** only. Leave the rest unchecked; the script ignores them anyway,
   but there is no point sending them.
4. Team: the team or teams whose work should appear, or all public teams.
5. Enable it.

Linear signs every delivery in the `Linear-Signature` header. The script does not verify it; the webhook URL's
token is what gates posting. Keep the URL out of shared documents.

## What gets posted

| Event                                 | Line in the channel                                                                                   | Colour |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| Issue created                         | `:new: Created SP-12 Title by Name · SP`                                                              | grey   |
| Moved to a started state              | `:arrow_forward: Started SP-12 …`                                                                     | teal   |
| Moved to a completed state            | `:white_check_mark: Done SP-12 …` with a _Took_ field (started to completed, or created to completed) | green  |
| Moved to a cancelled state            | `:no_entry: Cancelled SP-12 …`                                                                        | red    |
| Moved to backlog, unstarted or triage | `:leftwards_arrow_with_hook: State: SP-12 …`                                                          | navy   |
| Added to or removed from a cycle      | `:calendar: Added to Cycle 7: SP-12 …`                                                                | gold   |
| Cycle created                         | `:rocket: Cycle 7 created (dates)`                                                                    | gold   |
| Cycle completed                       | `:checkered_flag: Cycle 7 completed: 9 of 12 issues done`                                             | gold   |

Each issue line carries State, Assignee, Estimate and Cycle fields when Linear supplies them. The actor is
taken from the payload's `actor` when Linear includes it.

## Changing the script

Edit the file in the repo, then paste the new content into the integration in Administration. There is no
automatic sync; the file is the source of truth and the integration is where it runs.

To try a change without touching production, run the local server, create the same integration there and post
Linear-shaped JSON to its URL with `curl`. Sample payloads for every handled event are in
`development/integrations/linear-velocity-feed.samples.json`.

## Limitations

- One message per event. An issue's history is not threaded.
- Numbers such as throughput or cycle time are not computed here; the feed makes movement visible, and
  Linear's Insights views remain the place for metrics.

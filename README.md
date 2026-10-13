Marks notifications about bot PRs and issues as done once they're closed or merged, so the inbox only holds bot PRs that still need you: failing CI, held for review, or stuck.

It covers Dependabot, Renovate, and stale by default. A closed issue whose latest comment came from one of those bots counts too, which catches issues stale closed. Open threads are never touched.

## Usage

[`.github/workflows/silence.yml`](.github/workflows/silence.yml) runs it hourly from this repo. It needs a `NOTIFICATIONS_TOKEN` secret: a [classic personal access token with only the `notifications` scope](https://github.com/settings/tokens/new?scopes=notifications&description=bot-notification-silencer) (fine-grained tokens can't read notifications).

To see what it would do, run the workflow by hand; manual runs default to a dry run. Locally, after `npm ci && npm run build && npm run package`:

```sh
env INPUT_TOKEN="$(gh auth token)" 'INPUT_DRY-RUN=true' node dist/index.js
```

Inputs: `token` (required), `bots` (extra comma-separated bot logins), and `dry-run`.

## Releasing

`dist/` isn't committed to `main`. It's built only when cutting a release, so dependency updates never need a rebuilt bundle.

To release, from an up-to-date, clean `main`, run `script/release v1.2.3`. It runs `npm ci`, builds and packages `dist/`, commits it on a detached commit on top of `main`, creates the `v1.2.3` tag, moves the floating `v1` tag to it, and prints the push commands. It doesn't push anything or change `main`.

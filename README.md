Marks notifications from bots as read.

Originally intended to be run via a scheduled Heroku job, but could probably be run via GitHub Actions or elsewhere. 

## Releasing

`dist/` isn't committed to `main`. It's built only when cutting a release, so dependency updates never need a rebuilt bundle.

To release, from an up-to-date, clean `main`, run `script/release v1.2.3`. It runs `npm ci`, builds and packages `dist/`, commits it on a detached commit on top of `main`, creates the `v1.2.3` tag, moves the floating `v1` tag to it, and prints the push commands. It doesn't push anything or change `main`.

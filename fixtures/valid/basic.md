# Project Rules

## Security

- NEVER commit `.env` files
- NEVER commit `*.pem`
- DO NOT commit `credentials.json`

## Filesystem

- NEVER edit files in `/vendor`
- DO NOT edit `*.lock`

## Commands

- NEVER run `rm -rf`
- DO NOT use `git push --force`

## Workflow

- ALWAYS run `npm test` before `git commit`
- ALWAYS save tests to `/tests`

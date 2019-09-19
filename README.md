# Stale PR Tracker
Repo for tracking stale items across GitHub and Azure Pipelines

## Motivation

Right now, I'm involved in several repos across Azure Pipelines and GitHub. This repo is meant to track items that have slipped between the cracks and give me a quick sense of what needs to be addressed.

## Getting Started

### Local usage

- Clone this repository: `git clone https://github.com/damccorm/stale-tracker && cd stale-tracker`
- Define the repositories/contributors you'd like to watch in `config.yml`
- Set the environment variable `AZP_TOKEN` to an Azure Pipelines PAT to access Azure Pipelines repos.

> Note: This is only necessary if you want to use Azure Pipelines repos.

- Run `npm bootstrap`

### Send Email updates

- Clone this repository: `git clone https://github.com/damccorm/stale-tracker && cd stale-tracker`
- Define the repositories/contributors you'd like to watch in `config.yml`
- Set the environment variable `AZP_TOKEN` to an Azure Pipelines PAT to access Azure Pipelines repos.
- Set your email credentials as environment variables `username` and `password`. `username` should be the email you're sending the messages from, `password` should be that account's password.

> Note: Some email providers won't allow you to programatically send emails like this without altering some settings to allow less trusted applications. I used a dedicated email for this purpose, so I wasn't too worried about giving up those permissions, you may want to think twice about that though.

- Set the email recipient as an environment variable `recipient`. This should be the email address you would like to receive updates at.
- Run `npm install && npm run build`
- Run `node lib/emailer.js`

### Integrate with Azure Pipelines

If you want automatic, scheduled updates, consider using Azure Pipelines [scheduled builds](https://docs.microsoft.com/en-us/azure/devops/pipelines/build/triggers?view=azure-devops&tabs=yaml#scheduled-triggers) (see this repo for an example).

## Current limitations/Future work

Lots of this is low hanging fruit that I didn't implement since it didn't fit my use case.

- Private GitHub repos
- Public AZP repos without a AZP PAT
- Other Source Control providers (e.g. GitLab, BitBucket, etc...)
- Multiple Email recipients
- Better Error Handling
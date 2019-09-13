export enum RepoType {
    GitHub,
    AZP
}

export interface Group {
    githubHandles?: string[],
    azpEmails?: string[],
    prTimeout?: number,
    isDefaultGroup: boolean
}

export interface PullRequest {
    author: string,
    timeSinceUpdate: number,
    link: string
}

export interface Repo {
    url: string,
    type: RepoType,
    groups: Group[],
    stalePrs: PullRequest[]
}
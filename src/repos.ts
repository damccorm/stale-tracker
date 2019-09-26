import * as im from './interfaces';
const Octokit = require('@octokit/rest');
import * as nodeApi from "azure-devops-node-api";

import * as GitApi from "azure-devops-node-api/GitApi";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";

// Returns repos with stale PRs correctly classified
export async function processGitHubRepo(repo: im.Repo): Promise<im.Repo> {
    const repoUrl = repo.url;
    const repoParts = repoUrl.slice(repoUrl.indexOf('github.com') + 'github.com/'.length).split('/')
    const orgName = repoParts[0];
    const repoName = repoParts[1];

    const octokit = Octokit();
    // TODO - right now this doesn't respect paging (I think octokit may have a bug, wasn't important to figure out for our use case)
    let { data: pullRequests } = await octokit.pulls.list({
        owner: orgName,
        repo: repoName,
        state: 'open',
        per_page: 100
      });

    pullRequests = <any[]>pullRequests;

    pullRequests.forEach(pull => {
        let duration: number = Date.now() - <any>(new Date(pull.updated_at)); //Duration in ms
        duration = duration / 1000 / 60 / 60; //Duration in h.'

        const link = `${repo.url}/pull/${pull.number}`;
        const curPr: im.PullRequest = {author: pull.user.login, timeSinceUpdate: duration, link: link, title: pull.title};
        let isStale = false;
        repo.groups.forEach(group => {
            if (!isStale && group.githubHandles && (group.githubHandles.indexOf(curPr.author.toLowerCase()) > -1 || group.isDefaultGroup)) {
                let ignorePull = false;
                // Check labels
                pull.labels.forEach(label => {
                    if (!ignorePull && group.ignoreLabels.indexOf(label.name) > -1) {
                        ignorePull = true;
                    }
                })
                if (!ignorePull) {
                    isStale = isPrStale(group, curPr);
                }
            }
        });

        if (isStale) {
            repo.stalePrs.push(curPr);
        }
    });

    return repo;
}

export async function processAzpRepo(repo: im.Repo): Promise<im.Repo> {
    let gitApiObject: GitApi.IGitApi | null = null;
    const project: string = getProject(repo.url);
    let webApi: nodeApi.WebApi = await getApi(getProjectUrl(repo.url));
    gitApiObject = await webApi.getGitApi();
    const repos: GitInterfaces.GitRepository[] = await gitApiObject.getRepositories(project) || [];

    let curRepo: any = null;

    repos.forEach(azpRepo => {
        if ((azpRepo.name || '').toLowerCase() == getRepo(repo.url).toLowerCase()) {
            curRepo = azpRepo;
        }
    })

    if (curRepo) {
        repo.stalePrs = await getAzpPullRequests(curRepo.id, gitApiObject, repo.groups, repo.url);
    }
    

    return repo;
}

async function getAzpPullRequests(id, gitApiObject, groups: im.Group[], repoUrl: string, page = 0): Promise<im.PullRequest[]> {
    const pullRequests: GitInterfaces.GitPullRequest[] = await gitApiObject.getPullRequests(id, {status: GitInterfaces.PullRequestStatus.Active}, null, null, page*100, 100);
    if (pullRequests.length == 0) {
        return [];
    }
    let stalePulls: im.PullRequest[] = [];
    for (let i = 0; i < pullRequests.length; i++) {
        const pull = pullRequests[i];
        if (!pull.isDraft) {
            const reviewers: GitInterfaces.IdentityRefWithVote[] = pull.reviewers || [];
            for (let j = 0; j < reviewers.length; j++) {
                const reviewer = reviewers[j];
                let isStale = false;
                for (let k = 0; k < groups.length; k++) {
                    const group = groups[k];
                    // Check ignoreLabels
                    let ignorePull = false;
                    (pull.labels || []).forEach(label => {
                        // console.log('label', JSON.stringify(label));
                        if (!ignorePull && label.name && label.active && group.ignoreLabels.indexOf(label.name) > -1) {
                            ignorePull = true;
                        }
                    })

                    // Check reviewers
                    if (!ignorePull && !isStale) {
                        for (let l = 0; l < (group.azpReviewers || []).length; l++) {
                            const azpReviewer = group.azpReviewers![l]
                            if (!isStale) {
                                if ((reviewer.displayName || '').toLowerCase().indexOf(azpReviewer.toLowerCase()) > -1) {
                                    let author = 'unknown';
                                    if (pull.createdBy && pull.createdBy.displayName) {
                                        author = pull.createdBy.displayName
                                    }

                                    let mostRecentUpdate: any = await getAzpMostRecentComment(id, gitApiObject, pull);
                                    if (pull.commits) {
                                        pull.commits.forEach(commit => {
                                            if(commit.committer && commit.committer.date && commit.committer.date > mostRecentUpdate) {
                                                mostRecentUpdate = commit.committer.date;
                                            }
                                        })
                                    }

                                    let duration: number = Date.now() - mostRecentUpdate; //Duration in ms
                                    duration = duration / 1000 / 60 / 60; //Duration in h.

                                    const link = getPullRequestUrl(repoUrl, pull.pullRequestId);

                                    const formattedPull: im.PullRequest = {author: author, timeSinceUpdate: duration, link: link, title: pull.title || link};
                                    if (isPrStale(group, formattedPull)) {
                                        stalePulls.push(formattedPull);
                                        isStale = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    stalePulls = stalePulls.concat(await getAzpPullRequests(id, gitApiObject, groups, repoUrl, page + 1));

    return stalePulls;
}

async function getAzpMostRecentComment(id, gitApiObject, pull: GitInterfaces.GitPullRequest): Promise<Date> {
    let mostRecentUpdate = pull.creationDate || new Date();

    const commentThreads: GitInterfaces.GitPullRequestCommentThread[] = await gitApiObject.getThreads(id, pull.pullRequestId);
    commentThreads.forEach(thread => {
        if (thread.lastUpdatedDate && thread.lastUpdatedDate > mostRecentUpdate) {
            mostRecentUpdate = thread.lastUpdatedDate;
        }
    })

    return mostRecentUpdate;
}

function isPrStale(group: im.Group, pr: im.PullRequest): boolean {
    const today: Date = new Date();
    if (today.getDate() == 1) {
        // If today is monday, ignore weekend time.
        pr.timeSinceUpdate -= 48;
    }
    return !!group.prTimeout && group.prTimeout < pr.timeSinceUpdate;
}

function getEnv(name: string): string {
    let val = process.env[name] || '';
    if (!val) {
        console.error(`${name} env var not set`);
        process.exit(1);
    }
    return val;
}

async function getApi(serverUrl: string): Promise<nodeApi.WebApi> {
    return new Promise<nodeApi.WebApi>(async (resolve, reject) => {
        try {
            let token = getEnv("azp_token");
            let authHandler = nodeApi.getPersonalAccessTokenHandler(token);
            let option = undefined;

            let azp: nodeApi.WebApi = new nodeApi.WebApi(serverUrl, authHandler, option);
            resolve(azp);
        }
        catch (err) {
            reject(err);
        }
    });
}

function getProject(projectUrl: string): string {
    const parts = projectUrl.slice(projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length).split('/');
    return parts[1];
}

function getRepo(projectUrl: string): string {
    const parts = projectUrl.slice(projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length).split('/');
    return parts[parts.length-1];
}

function getProjectUrl(projectUrl: string): string {
    return projectUrl.slice(0, projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length + projectUrl.slice(projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length).split('/')[0].length);
}

function getPullRequestUrl(projectUrl: string, prNumber: number | undefined) {
    return `${getProjectUrl(projectUrl)}/_git/${getRepo(projectUrl)}/pullRequest/${prNumber}`;
}
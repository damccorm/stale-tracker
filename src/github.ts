import * as im from './interfaces';
const Octokit = require('@octokit/rest');

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
        duration = duration / 1000 / 60 / 60; //Duration in h.
        const curPr: im.PullRequest = {author: pull.user.login, timeSinceUpdate: duration, link: pull.url};
        let isStale = false;
        repo.groups.forEach(group => {
            if (!isStale) {
                isStale = isPrStale(group, curPr);
            }
        });

        if (isStale) {
            repo.stalePrs.push(curPr);
        }
    });

    return repo;
}

function isPrStale(group: im.Group, pr: im.PullRequest): boolean {
    if (group.githubHandles && (group.githubHandles.indexOf(pr.author.toLowerCase()) > 0 || group.isDefaultGroup)) {
        if (group.prTimeout && group.prTimeout < pr.timeSinceUpdate) {
            return true;
        }
    }
    return false;
}
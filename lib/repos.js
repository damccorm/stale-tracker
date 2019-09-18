"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Octokit = require('@octokit/rest');
const nodeApi = __importStar(require("azure-devops-node-api"));
const GitInterfaces = __importStar(require("azure-devops-node-api/interfaces/GitInterfaces"));
// Returns repos with stale PRs correctly classified
function processGitHubRepo(repo) {
    return __awaiter(this, void 0, void 0, function* () {
        const repoUrl = repo.url;
        const repoParts = repoUrl.slice(repoUrl.indexOf('github.com') + 'github.com/'.length).split('/');
        const orgName = repoParts[0];
        const repoName = repoParts[1];
        const octokit = Octokit();
        // TODO - right now this doesn't respect paging (I think octokit may have a bug, wasn't important to figure out for our use case)
        let { data: pullRequests } = yield octokit.pulls.list({
            owner: orgName,
            repo: repoName,
            state: 'open',
            per_page: 100
        });
        pullRequests = pullRequests;
        pullRequests.forEach(pull => {
            let duration = Date.now() - (new Date(pull.updated_at)); //Duration in ms
            duration = duration / 1000 / 60 / 60; //Duration in h.'
            const link = `${repo.url}/pull/${pull.number}`;
            const curPr = { author: pull.user.login, timeSinceUpdate: duration, link: link, title: pull.title };
            let isStale = false;
            repo.groups.forEach(group => {
                if (!isStale && group.githubHandles && (group.githubHandles.indexOf(curPr.author.toLowerCase()) > 0 || group.isDefaultGroup)) {
                    isStale = isPrStale(group, curPr);
                }
            });
            if (isStale) {
                repo.stalePrs.push(curPr);
            }
        });
        return repo;
    });
}
exports.processGitHubRepo = processGitHubRepo;
function processAzpRepo(repo) {
    return __awaiter(this, void 0, void 0, function* () {
        let gitApiObject = null;
        const project = getProject(repo.url);
        let webApi = yield getApi(getProjectUrl(repo.url));
        gitApiObject = yield webApi.getGitApi();
        const repos = (yield gitApiObject.getRepositories(project)) || [];
        let curRepo = null;
        repos.forEach(azpRepo => {
            if ((azpRepo.name || '').toLowerCase() == getRepo(repo.url).toLowerCase()) {
                curRepo = azpRepo;
            }
        });
        if (curRepo) {
            repo.stalePrs = yield getAzpPullRequests(curRepo.id, gitApiObject, repo.groups, repo.url);
        }
        return repo;
    });
}
exports.processAzpRepo = processAzpRepo;
function getAzpPullRequests(id, gitApiObject, groups, repoUrl, page = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        const pullRequests = yield gitApiObject.getPullRequests(id, { status: GitInterfaces.PullRequestStatus.Active }, null, null, page * 100, 100);
        if (pullRequests.length == 0) {
            return [];
        }
        let stalePulls = [];
        for (let i = 0; i < pullRequests.length; i++) {
            const pull = pullRequests[i];
            if (!pull.isDraft) {
                const reviewers = pull.reviewers || [];
                for (let j = 0; j < reviewers.length; j++) {
                    const reviewer = reviewers[j];
                    let isStale = false;
                    for (let k = 0; k < groups.length; k++) {
                        const group = groups[k];
                        if (!isStale) {
                            for (let l = 0; l < (group.azpReviewers || []).length; l++) {
                                const azpReviewer = group.azpReviewers[l];
                                if (!isStale) {
                                    if ((reviewer.displayName || '').toLowerCase().indexOf(azpReviewer.toLowerCase()) > -1) {
                                        let author = 'unknown';
                                        if (pull.createdBy && pull.createdBy.displayName) {
                                            author = pull.createdBy.displayName;
                                        }
                                        // TODO - get actual time since update
                                        let mostRecentUpdate = yield getAzpMostRecentComment(id, gitApiObject, pull);
                                        // TODO
                                        if (pull.commits) {
                                            pull.commits.forEach(commit => {
                                                if (commit.committer && commit.committer.date && commit.committer.date > mostRecentUpdate) {
                                                    mostRecentUpdate = commit.committer.date;
                                                }
                                            });
                                        }
                                        let duration = Date.now() - mostRecentUpdate; //Duration in ms
                                        duration = duration / 1000 / 60 / 60; //Duration in h.
                                        const link = getPullRequestUrl(repoUrl, pull.pullRequestId);
                                        const formattedPull = { author: author, timeSinceUpdate: duration, link: link, title: pull.title || link };
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
        stalePulls = stalePulls.concat(yield getAzpPullRequests(id, gitApiObject, groups, repoUrl, page + 1));
        return stalePulls;
    });
}
function getAzpMostRecentComment(id, gitApiObject, pull) {
    return __awaiter(this, void 0, void 0, function* () {
        let mostRecentUpdate = pull.creationDate || new Date();
        const commentThreads = yield gitApiObject.getThreads(id, pull.pullRequestId);
        commentThreads.forEach(thread => {
            if (thread.lastUpdatedDate && thread.lastUpdatedDate > mostRecentUpdate) {
                mostRecentUpdate = thread.lastUpdatedDate;
            }
        });
        return mostRecentUpdate;
    });
}
function isPrStale(group, pr) {
    const today = new Date();
    if (today.getDate() == 1) {
        // If today is monday, ignore weekend time.
        pr.timeSinceUpdate -= 48;
    }
    return !!group.prTimeout && group.prTimeout < pr.timeSinceUpdate;
}
function getEnv(name) {
    let val = process.env[name] || '';
    if (!val) {
        console.error(`${name} env var not set`);
        process.exit(1);
    }
    return val;
}
function getApi(serverUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                let token = getEnv("azp_token");
                let authHandler = nodeApi.getPersonalAccessTokenHandler(token);
                let option = undefined;
                let azp = new nodeApi.WebApi(serverUrl, authHandler, option);
                resolve(azp);
            }
            catch (err) {
                reject(err);
            }
        }));
    });
}
function getProject(projectUrl) {
    const parts = projectUrl.slice(projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length).split('/');
    return parts[1];
}
function getRepo(projectUrl) {
    const parts = projectUrl.slice(projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length).split('/');
    return parts[parts.length - 1];
}
function getProjectUrl(projectUrl) {
    return projectUrl.slice(0, projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length + projectUrl.slice(projectUrl.indexOf('dev.azure.com/') + 'dev.azure.com/'.length).split('/')[0].length);
}
function getPullRequestUrl(projectUrl, prNumber) {
    return `${getProjectUrl(projectUrl)}/_git/${getRepo(projectUrl)}/pullRequest/${prNumber}`;
}

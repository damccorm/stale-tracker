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
Object.defineProperty(exports, "__esModule", { value: true });
const Octokit = require('@octokit/rest');
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
            duration = duration / 1000 / 60 / 60; //Duration in h.
            const curPr = { author: pull.user.login, timeSinceUpdate: duration, link: pull.url };
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
    });
}
exports.processGitHubRepo = processGitHubRepo;
function isPrStale(group, pr) {
    if (group.githubHandles && (group.githubHandles.indexOf(pr.author.toLowerCase()) > 0 || group.isDefaultGroup)) {
        if (group.prTimeout && group.prTimeout < pr.timeSinceUpdate) {
            return true;
        }
    }
    return false;
}

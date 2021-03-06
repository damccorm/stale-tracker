"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const im = __importStar(require("./interfaces"));
function getRepoType(repoUrl) {
    if (repoUrl.indexOf('github.com') > -1) {
        return im.RepoType.GitHub;
    }
    if (repoUrl.indexOf('dev.azure.com') > -1) {
        return im.RepoType.AZP;
    }
    throw new Error(`repo ${repoUrl} is not a supported repo type. Currently GitHub and Azure Repos are supported`);
}
function loadYaml(configurationPath) {
    const configurationContent = fs.readFileSync(configurationPath, { encoding: 'utf8' }).toLowerCase();
    const configObject = yaml.safeLoad(configurationContent);
    let groupMap = {};
    const groups = configObject.groups;
    if (groups) {
        groups.forEach(group => {
            if (group.id) {
                let githubHandles = group['github-handles'] || [];
                githubHandles = githubHandles.map(handle => {
                    // Slice leading @'s
                    if (handle.startsWith('@')) {
                        handle = handle.slice(1);
                    }
                    return handle;
                });
                const azpReviewers = group['azp-reviewers'] || [];
                const ignoreLabels = group['ignore-labels'] || [];
                groupMap[group.id] = { githubHandles: githubHandles, azpReviewers: azpReviewers, isDefaultGroup: false, ignoreLabels: ignoreLabels };
            }
            else {
                throw new Error('YAML Parse Error: All groups must include an id');
            }
        });
    }
    const repoList = [];
    const repos = configObject.repos;
    if (repos) {
        repos.forEach(repo => {
            let curRepo;
            if (repo.url) {
                // Slice trailing /'s
                while (repo.url.endsWith('/')) {
                    repo.url = repo.url.slice(0, repo.url.length - 1);
                }
                curRepo = { url: repo.url, type: getRepoType(repo.url), groups: [], stalePrs: [] };
                let repoGroups = repo.groups;
                if (repoGroups && repoGroups.length > 0) {
                    repoGroups.forEach(group => {
                        if (group.id) {
                            const prTimeout = group['stale-pr-timeout'] || null;
                            const ignoreLabels = group['ignore-labels'] || [];
                            if (group.id === 'default') {
                                curRepo.groups.push({ isDefaultGroup: true, prTimeout: prTimeout, ignoreLabels: ignoreLabels });
                            }
                            else {
                                if (group.id in groupMap) {
                                    // Combine this with previous group mapping
                                    const prTimeout = group['stale-pr-timeout'] || null;
                                    let curGroup = JSON.parse(JSON.stringify(groupMap[group.id]));
                                    curGroup.prTimeout = prTimeout;
                                    curRepo.groups.push(curGroup);
                                }
                                else {
                                    throw new Error(`YAML Parse Error: No group with id ${group.id} defined`);
                                }
                            }
                        }
                        else {
                            throw new Error('YAML Parse Error, all groups must have id');
                        }
                    });
                }
                else {
                    throw new Error(`YAML Parse Error: No groups provided for ${curRepo.url}`);
                }
            }
            else {
                throw new Error('YAML Parse Error: All repos must include a url');
            }
            repoList.push(curRepo);
        });
    }
    else {
        throw new Error('YAML Parse Error: No repos supplied');
    }
    return repoList;
}
exports.loadYaml = loadYaml;

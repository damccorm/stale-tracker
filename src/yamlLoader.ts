import * as fs from 'fs';
import * as yaml from 'js-yaml';

import * as im from './interfaces';

function getRepoType(repoUrl: string): im.RepoType {
    if (repoUrl.indexOf('github.com') > -1) {
        return im.RepoType.GitHub;
    }
    if (repoUrl.indexOf('dev.azure.com') > -1) {
        return im.RepoType.AZP;
    }
    throw new Error(`repo ${repoUrl} is not a supported repo type. Currently GitHub and Azure Repos are supported`);
}

export function loadYaml(configurationPath): im.Repo[] {
    const configurationContent = fs.readFileSync(configurationPath, {encoding: 'utf8'}).toLowerCase();
    const configObject: any = yaml.safeLoad(configurationContent);

    let groupMap: {[id: string]: im.Group} = {};
    const groups: any[] = configObject.groups
    if (groups) {
        groups.forEach(group => {
            if (group.id) {
                let githubHandles: string[] = group['github-handles'] || [];
                githubHandles = githubHandles.map(handle => {
                    // Slice leading @'s
                    if (handle.startsWith('@')) {
                        handle = handle.slice(1);
                    }
                    return handle;
                });
                const azpReviewers: string[] = group['azp-reviewers'] || [];
                const ignoreLabels = group['ignore-labels'] || [];
                groupMap[group.id] = {githubHandles: githubHandles, azpReviewers: azpReviewers, isDefaultGroup: false, ignoreLabels: ignoreLabels}
            }
            else {
                throw new Error('YAML Parse Error: All groups must include an id');
            }
        })
    }

    const repoList: im.Repo[] = [];
    const repos: any[] = configObject.repos;
    if (repos) {
        repos.forEach(repo => {
            let curRepo: im.Repo;
            if (repo.url) {
                // Slice trailing /'s
                while (repo.url.endsWith('/')) {
                    repo.url = repo.url.slice(0, repo.url.length - 1);
                }
                curRepo = {url: repo.url, type: getRepoType(repo.url), groups: [], stalePrs: []}
                let repoGroups: any[] = repo.groups;
                if (repoGroups && repoGroups.length > 0) {
                    repoGroups.forEach(group => {
                        if (group.id) {
                            const prTimeout = group['stale-pr-timeout'] || null;
                            const ignoreLabels = group['ignore-labels'] || [];
                            if (group.id === 'default') {
                                curRepo.groups.push({isDefaultGroup: true, prTimeout: prTimeout, ignoreLabels: ignoreLabels})
                            }
                            else {
                                if (group.id in groupMap) {
                                    // Combine this with previous group mapping
                                    const prTimeout = group['stale-pr-timeout'] || null;
                                    let curGroup: im.Group = JSON.parse(JSON.stringify(groupMap[group.id]));
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
                    })
                }
                else {
                    throw new Error(`YAML Parse Error: No groups provided for ${curRepo.url}`)
                }
            }
            else {
                throw new Error('YAML Parse Error: All repos must include a url');
            }
            repoList.push(curRepo);
        })
    }
    else {
        throw new Error('YAML Parse Error: No repos supplied');
    }

    return repoList;
}
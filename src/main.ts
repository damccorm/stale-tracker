import * as path from 'path';
import * as os from 'os';

import * as im from './interfaces';
import * as yamlLoader from './yamlLoader';
import * as repos from './repos';


export async function run(isHtml: boolean = false): Promise<string> {
    const today: Date = new Date();
    const day = today.getDay();
    if (day == 0 || day == 6) {
        return '';
    }
    let loadedRepos: im.Repo[] = yamlLoader.loadYaml(path.join(__dirname, '../config.yml'));
    for (let i = 0; i < loadedRepos.length; i++) {
        const curRepo = loadedRepos[i];
        if (curRepo.type == im.RepoType.AZP) {
            loadedRepos[i] = await repos.processAzpRepo(curRepo);
        }
        else if (curRepo.type == im.RepoType.GitHub) {
            loadedRepos[i] = await repos.processGitHubRepo(curRepo);
        }
        else {
            throw new Error(`Repo type ${curRepo.type} not supported.`);
        }
    }
    return formatOutput(loadedRepos, isHtml);
}

function formatOutput(repos: im.Repo[], isHtml: boolean): string {
    let output = '';
    const lineBreak = isHtml ? '<br>' : os.EOL;
    repos.forEach(repo => {
        if (repo.stalePrs && repo.stalePrs.length > 0) {
            output += `REPO: ${formatUrl(repo.url, isHtml)}${lineBreak}`;
            repo.stalePrs.forEach(pr => {
                output += `${formatUrl(pr.link, isHtml)} has been untouched for ${((pr.timeSinceUpdate - pr.timeSinceUpdate%1)/24).toFixed(2)} days${lineBreak}`;
            })
            output += os.EOL;
        }
    });

    if (output == '') {
        return '';
    }

    return output;
}

function formatUrl(curUrl: string, isHtml: boolean) {
    if (!isHtml) {
        return curUrl;
    }
    return `<a href="${curUrl}">${curUrl}</a>`
}

run().then(result => {
    if (result) {
        console.log(result);
    }
    else {
        console.log('No stale PRs!');
    }
});
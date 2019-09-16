import * as path from 'path';
import * as os from 'os';

import * as im from './interfaces';
import * as yamlLoader from './yamlLoader';
import * as repos from './repos';


export async function run(): Promise<string> {
    const today: Date = new Date();
    const day = today.getDay();
    if (day == 0 || day == 6) {
        return 'no stale prs';
    }
    let loadedRepos: im.Repo[] = yamlLoader.loadYaml(path.join(__dirname, 'config.yml'));
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
    return formatOutput(loadedRepos);
}

function formatOutput(repos: im.Repo[]): string {
    let output = '';
    repos.forEach(repo => {
        if (repo.stalePrs && repo.stalePrs.length > 0) {
            output += `REPO: ${repo.url}${os.EOL}`;
            repo.stalePrs.forEach(pr => {
                output += `${pr.link} has been untouched for ${((pr.timeSinceUpdate - pr.timeSinceUpdate%1)/24).toFixed(2)} days${os.EOL}`;
            })
            output += os.EOL;
        }
    });

    if (output == '') {
        return 'no stale prs';
    }

    return output;
}

run().then(result => console.log(result));
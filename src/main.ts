import * as path from 'path';
import * as os from 'os';

import * as im from './interfaces';
import * as yamlLoader from './yamlLoader';
import * as github from './github';


async function run(): Promise<string> {
    let loadedRepos: im.Repo[] = yamlLoader.loadYaml(path.join(__dirname, '../config.yml'));
    for (let i = 0; i < loadedRepos.length; i++) {
        const curRepo = loadedRepos[i];
        if (curRepo.type == im.RepoType.AZP) {
            // TODO
            console.log('Skipping for now');
        }
        else if (curRepo.type == im.RepoType.GitHub) {
            loadedRepos[i] = await github.processGitHubRepo(curRepo);
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
                output += `${pr.link} has been untouched for ${pr.timeSinceUpdate - pr.timeSinceUpdate%1} hours${os.EOL}`;
            })
            output += os.EOL;
        }
    })
    return output;
}

run().then(result => console.log(result));
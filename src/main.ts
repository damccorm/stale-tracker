import * as path from 'path';

import * as im from './interfaces';
import * as yamlLoader from './yamlLoader';
import * as github from './github';


async function run(): Promise<string> {
    let loadedRepos: im.Repo[] = yamlLoader.loadYaml(path.join(__dirname, '../config.yml'));
    for (let i = 0; i < loadedRepos.length; i++) {
        const curRepo = loadedRepos[i];
        if (curRepo.type == im.RepoType.AZP) {
            // TODO
        }
        else (curRepo.type == im.RepoType.GitHub) {
            loadedRepos[i] = await github.processGitHubRepo(curRepo);
        }
    }
    return JSON.stringify(loadedRepos);
}

run().then(result => console.log(result));
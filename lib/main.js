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
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const im = __importStar(require("./interfaces"));
const yamlLoader = __importStar(require("./yamlLoader"));
const repos = __importStar(require("./repos"));
function run(isHtml = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const today = new Date();
        const day = today.getDay();
        if (day == 0 || day == 6) {
            return '';
        }
        let loadedRepos = yamlLoader.loadYaml(path.join(__dirname, '../config.yml'));
        for (let i = 0; i < loadedRepos.length; i++) {
            const curRepo = loadedRepos[i];
            if (curRepo.type == im.RepoType.AZP) {
                loadedRepos[i] = yield repos.processAzpRepo(curRepo);
            }
            else if (curRepo.type == im.RepoType.GitHub) {
                loadedRepos[i] = yield repos.processGitHubRepo(curRepo);
            }
            else {
                throw new Error(`Repo type ${curRepo.type} not supported.`);
            }
        }
        return formatOutput(loadedRepos, isHtml);
    });
}
exports.run = run;
function formatOutput(repos, isHtml) {
    let output = '';
    const lineBreak = isHtml ? '<br>' : os.EOL;
    repos.forEach(repo => {
        if (repo.stalePrs && repo.stalePrs.length > 0) {
            output += `REPO: ${formatUrl(repo.url, isHtml)}${lineBreak}`;
            repo.stalePrs.forEach(pr => {
                output += `${formatUrl(pr.link, isHtml)} has been untouched for ${((pr.timeSinceUpdate - pr.timeSinceUpdate % 1) / 24).toFixed(2)} days${lineBreak}`;
            });
            output += os.EOL;
        }
    });
    if (output == '') {
        return '';
    }
    return output;
}
function formatUrl(curUrl, isHtml) {
    if (!isHtml) {
        return curUrl;
    }
    return `<a href="${curUrl}">${curUrl}</a>`;
}
run().then(result => {
    if (result) {
        console.log(result);
    }
    else {
        console.log('No stale PRs!');
    }
});

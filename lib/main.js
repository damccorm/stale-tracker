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
const github = __importStar(require("./github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let loadedRepos = yamlLoader.loadYaml(path.join(__dirname, '../config.yml'));
        for (let i = 0; i < loadedRepos.length; i++) {
            const curRepo = loadedRepos[i];
            if (curRepo.type == im.RepoType.AZP) {
                // TODO
                console.log('Skipping for now');
            }
            else if (curRepo.type == im.RepoType.GitHub) {
                loadedRepos[i] = yield github.processGitHubRepo(curRepo);
            }
        }
        return formatOutput(loadedRepos);
    });
}
function formatOutput(repos) {
    let output = '';
    repos.forEach(repo => {
        if (repo.stalePrs && repo.stalePrs.length > 0) {
            output += `REPO: ${repo.url}${os.EOL}`;
            repo.stalePrs.forEach(pr => {
                output += `${pr.link} has been untouched for ${pr.timeSinceUpdate - pr.timeSinceUpdate % 1} hours${os.EOL}`;
            });
            output += os.EOL;
        }
    });
    return output;
}
run().then(result => console.log(result));

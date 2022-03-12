const core = require('@actions/core');
const github = require('@actions/github');
const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const ms = core.getInput('delay-fetch-ms');
    core.info(`Waiting ${ms} milliseconds to hit Vercel's API, really take it easy and let them get their stuff together...`);
    core.info('(this isn\'t necessary but it soothes a primate impulse in my brain to know that the deploy will DEF have started.)')
    await wait(parseInt(ms));

    const githubToken = core.getInput('github-token');
    core.setSecret(githubToken);
    const vercelToken = core.getInput('vercel-token');
    core.setSecret(vercelToken);
    const octokit = github.getOctokit(githubToken);
    
    let deployCommit = '';
    core.debug(github.context.toJSON());
    // core.debug(github.context);
    if (github.context.eventName === 'push') {
      deployCommit = github.headCommit.id;
    } else if (github.context.eventName === 'pull_request') {
      const currentPR = await octokit.rest.pulls.get({
        owner: github.context.repository.owner.login, // 'bramarcade'
        repo: github.context.repository.name, // 'bram-arcade'
        pull_number: github.context.number,
      });
      if (currentPR.status !== 200) {
        core.setFailed('Could not get information about the current pull request');
        return;
      }
      deployCommit = currentPR.data.head.sha;
    }

    // Fetch deployments

    // deployments[x].meta.githubCommitSha
    // fetch that sucker!
    let url = deployCommit;

    core.setOutput('vercel-deployment-url', url);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

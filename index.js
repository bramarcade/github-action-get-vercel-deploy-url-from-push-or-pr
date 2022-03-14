const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios').default;
const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const ms = parseInt(core.getInput('delay-fetch-ms'));
    core.info(`Waiting ${ms} milliseconds to hit Vercel's API`);
    core.info('(this isn\'t necessary but it soothes a primate impulse in my brain to know that the deploy WILL DEFINITELY have started)')
    await wait(ms);

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    let deployCommit = '';
    if (github.context.eventName === 'push') { // this is good. this works fine.
      deployCommit = github.context.sha;
    } else if (github.context.eventName === 'pull_request') {
      core.info('GOT TO THE PULL REQUEST BLOCK');
      core.debug(github.context);
      core.debug(github.context.owner);
      core.debug(github.context.repository);
      core.debug(github.context.owner.login);
      core.debug(github.context.repository.name);
      core.debug(github.context.number);
      const currentPR = await octokit.rest.pulls.get({
        owner: github.context.owner.login, // 'bramarcade'
        repo: github.context.repository.name, // 'bram-arcade' 
        pull_number: github.context.number, // 1, 2, 3...
      });
      core.info('sdlkfj');
      if (currentPR.status !== 200) {
        throw 'Could not get information about the current pull request';
      }
      core.debug(currentPR.data);
      deployCommit = currentPR.data.head.sha;
    } else {
      throw 'Action was not run on a push or a pull request. Could not find deployCommit.';
    }
    // "curl https://api.vercel.com/v6/deployments?teamId=team_j9DH3uq1icmGSMJCyPtQOSg8 -H \"Accept: application/json\" -H \"Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}\""

    
    const res = await axios.get('https://api.vercel.com/v6/deployments', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      },
      params: {
        teamId: process.env.VERCEL_TEAM_ID,
      }
    })
    const deploy = res.data.deployments.find((deploy) => deploy.meta.githubCommitSha === deployCommit);
    // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    // https://github.com/actions/toolkit/blob/master/docs/action-debugging.md#how-to-access-step-debug-logs
    core.debug(deploy);

    core.setOutput('deploymentUrl', deploy.url);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

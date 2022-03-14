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

    // const githubToken = core.getInput('github-token');
    // core.setSecret(githubToken);
    // const vercelToken = core.getInput('vercel-token');
    // core.setSecret(vercelToken);
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    let deployCommit = '';
    core.debug(JSON.stringify(github.context)); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true https://github.com/actions/toolkit/blob/master/docs/action-debugging.md#how-to-access-step-debug-logs
    if (github.context.eventName === 'push') { // this is good. this works fine.
      deployCommit = github.context.sha;
    } else if (github.context.eventName === 'pull_request') {
      const currentPR = await octokit.rest.pulls.get({
        owner: github.context.login, // 'bramarcade'
        repo: github.context.name, // 'bram-arcade' 
        pull_number: github.context.number,
      });
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
    core.debug(res.data);
    const deploy = res.data.deployments.find((deploy) => deploy.meta.githubCommitSha === deployCommit);
    core.debug(deploy);
    // deployments[x].meta.githubCommitSha
    // fetch that sucker!
    let url = deployCommit;

    core.setOutput('deploymentUrl', url);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

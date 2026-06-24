// Webhook handler module for the GitHub App.
// Authenticates as the installation, fetches repository info and recent commits,
// and logs repository name, commit messages and changed files.

const githubAuth = require('./githubAppAuth');
const ai = require('./ai');
const readmeUpdater = require('./readmeUpdater');

async function fetchRepoDetails(octokit, owner, repo) {
	const { data } = await octokit.rest.repos.get({ owner, repo });
	return data;
}

async function fetchRecentCommits(octokit, owner, repo, limit = 5) {
	const list = await octokit.rest.repos.listCommits({ owner, repo, per_page: limit });
	const commits = [];

	for (const c of list.data) {
		try {
			const sha = c.sha;
			const commitData = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });
			commits.push({ sha, message: commitData.data.commit.message, files: commitData.data.files || [] });
		} catch (err) {
			console.warn(`Failed to fetch commit ${c.sha}:`, err && err.message ? err.message : err);
		}
	}

	return commits;
}

async function logRepoAndCommits(repoFullName, commits) {
	console.log(`Repository: ${repoFullName}`);
	for (const c of commits) {
		console.log(`- Commit ${c.sha}: ${c.message}`);
		if (c.files && c.files.length) {
			for (const f of c.files) {
				console.log(`  - ${f.filename} (${f.status})`);
			}
		} else {
			console.log('  - No changed files listed');
		}
	}
}

module.exports = async function handleWebhook(payload) {
	if (!payload) {
		console.warn('Empty webhook payload');
		return { success: false, error: 'Empty payload' };
	}

	// Determine whether we have an installation id (GitHub App) or are running locally
	const installationId = payload && payload.installation && payload.installation.id;
	let octokit = null;
	if (installationId) {
		try {
			octokit = await githubAuth.getAppOctokitForInstallation(installationId);
		} catch (err) {
			console.warn('Failed to authenticate as installation — continuing without GitHub API:', err && err.message ? err.message : err);
			octokit = null;
		}
	} else {
		console.warn('No installation.id in payload — processing without GitHub authentication (local/testing).');
	}

	try {
		const owner = payload.repository && payload.repository.owner && payload.repository.owner.login;
		const repo = payload.repository && payload.repository.name;
		const fullName = payload.repository && payload.repository.full_name;

		let repoNameFinal = fullName || (owner && repo ? `${owner}/${repo}` : (payload.repository && payload.repository.name) || 'unknown');

		let commits = [];
		let repoDetails = { full_name: repoNameFinal };

		if (octokit && owner && repo) {
			// Authenticated path: fetch repo details and recent commits via GitHub API
			try {
				repoDetails = await fetchRepoDetails(octokit, owner, repo);
			} catch (err) {
				console.warn('Failed to fetch repository details — continuing with payload data:', err && err.message ? err.message : err);
			}

			try {
				commits = await fetchRecentCommits(octokit, owner, repo, 5);
			} catch (err) {
				console.warn('Failed to fetch recent commits via GitHub API — falling back to payload commits:', err && err.message ? err.message : err);
				commits = [];
			}
		}

		// If we don't have commits from API, build commits from the webhook payload (supports local testing)
		if (!commits || commits.length === 0) {
			if (Array.isArray(payload.commits) && payload.commits.length) {
				commits = payload.commits.map(c => ({ sha: c.id || c.sha, message: c.message || c.commit && c.commit.message || '' , files: [ ...(c.added||[]), ...(c.modified||[]), ...(c.removed||[]) ].map(fn => ({ filename: fn, status: 'modified' })) }));
			} else {
				// No commit information available — warn and continue with empty lists
				console.warn('No commits found in payload');
				commits = [];
			}
		}

		// Log summary
		await logRepoAndCommits(repoNameFinal, commits);

		// Build commitData for AI: repoName, commits (messages + sha), changedFiles
		const commitEntries = commits.map(c => ({ sha: c.sha, message: c.message }));
		const changedFilesSet = new Set();
		for (const c of commits) {
			if (c.files && Array.isArray(c.files)) {
				for (const f of c.files) {
					const filename = typeof f === 'string' ? f : (f.filename || null);
					if (filename) changedFilesSet.add(filename);
				}
			}
		}
		const changedFiles = Array.from(changedFilesSet);

		const commitData = {
			repoName: repoDetails.full_name || repoNameFinal,
			commits: commitEntries,
			changedFiles,
		};

		// Generate release notes (Markdown) via AI
		let releaseNotesMarkdown;
		try {
			releaseNotesMarkdown = await ai.generateReleaseNotes(commitData);
		} catch (err) {
			console.error('Failed to generate release notes:', err && err.message ? err.message : err);
			return { success: false, repository: commitData.repoName, error: 'Failed to generate release notes' };
		}

				// Log generated markdown
				console.log('Gemini generation completed');
				console.log('Generated release notes:\n', releaseNotesMarkdown);

				let commitSha = null;
				if (installationId) {
					console.log('README update started');
					try {
						commitSha = await readmeUpdater.updateReadme({ installationId, owner: owner || undefined, repo: repo || undefined, releaseNotes: releaseNotesMarkdown });
						console.log('README update completed, commit:', commitSha);
					} catch (err) {
						console.error('Failed to update README:', err && err.message ? err.message : err);
						// Continue and return release notes even if README update fails
					}
				} else {
					console.log('No installationId - skipping README update (local/test run)');
				}

				return { success: true, repository: commitData.repoName, releaseNotes: releaseNotesMarkdown, commitSha };
	} catch (err) {
		console.error('webhookHandler error:', err && err.message ? err.message : err);
		return { success: false, error: err && err.message ? err.message : String(err) };
	}
};

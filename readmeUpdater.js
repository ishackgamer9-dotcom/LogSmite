const githubAuth = require('./githubAppAuth');

/**
 * Update README.md by replacing content between markers with release notes.
 * @param {Object} params
 * @param {number|string} params.installationId
 * @param {string} params.owner
 * @param {string} params.repo
 * @param {string} params.releaseNotes - markdown string to insert between markers
 * @returns {Promise<string>} commit SHA
 */
async function updateReadme({ installationId, owner, repo, releaseNotes }) {
  if (!owner || !repo) throw new Error('owner and repo are required');
  if (!releaseNotes) throw new Error('releaseNotes is required');

  let octokit = null;
  try {
    octokit = await githubAuth.getAppOctokitForInstallation(installationId);
  } catch (err) {
    throw new Error(`Failed to authenticate as installation ${installationId}: ${err && err.message ? err.message : err}`);
  }

  try {
    // Get README (default branch)
    const resp = await octokit.rest.repos.getReadme({ owner, repo });
    const sha = resp.data.sha;
    const encoding = resp.data.encoding || 'base64';
    let content = resp.data.content;
    if (encoding === 'base64') {
      content = Buffer.from(content, 'base64').toString('utf8');
    }

    const startMarker = '<!-- AUTO_RELEASE_START -->';
    const endMarker = '<!-- AUTO_RELEASE_END -->';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error('Markers not found or malformed in README.md');
    }

    const before = content.slice(0, startIndex + startMarker.length);
    const after = content.slice(endIndex);

    const newContent = `${before}\n\n${releaseNotes.trim()}\n\n${after}`;

    const newContentBase64 = Buffer.from(newContent, 'utf8').toString('base64');

    // Commit the updated README
    const updateResp = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: `chore(release): update release notes`,
      content: newContentBase64,
      sha,
    });

    return updateResp.data.commit && updateResp.data.commit.sha;
  } catch (err) {
    throw new Error(`Failed to update README: ${err && err.message ? err.message : err}`);
  }
}

module.exports = { updateReadme };

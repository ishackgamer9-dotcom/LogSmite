const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Octokit } = require('@octokit/rest');

// Load environment variables from project .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const APP_ID = process.env.APP_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;

if (!APP_ID) {
  throw new Error('Missing APP_ID in environment');
}

// Resolve private key: prefer PRIVATE_KEY_PATH file, fallback to PRIVATE_KEY env var
let resolvedPrivateKey = PRIVATE_KEY;
if (!resolvedPrivateKey && PRIVATE_KEY_PATH) {
  try {
    const keyPath = path.isAbsolute(PRIVATE_KEY_PATH)
      ? PRIVATE_KEY_PATH
      : path.resolve(__dirname, PRIVATE_KEY_PATH);
    resolvedPrivateKey = fs.readFileSync(keyPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read PRIVATE_KEY_PATH file: ${err.message}`);
  }
}

if (!resolvedPrivateKey) {
  throw new Error('Missing PRIVATE_KEY or PRIVATE_KEY_PATH in environment');
}

async function getAppOctokitForInstallation(installationId) {
  try {
    // Dynamically import @octokit/app to support ESM-only package builds
    const mod = await import('@octokit/app');
    const AppClass = mod.App || mod.default || mod;

    // Create an App instance to sign JWTs
    const app = new AppClass({ id: Number(APP_ID), privateKey: resolvedPrivateKey });

    // Get an installation access token
    const installationAuth = await app.getInstallationAccessToken({ installationId });

    // Create Octokit authenticated as the installation
    const octokit = new Octokit({ auth: installationAuth });

    return octokit;
  } catch (err) {
    console.error('Failed to initialize GitHub App auth:', err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = {
  getAppOctokitForInstallation,
};

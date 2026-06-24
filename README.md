# LogSmite

LogSmite is an AI-powered GitHub App that automatically generates release notes and changelogs from repository activity.

Whenever code is pushed to a connected repository, LogSmite:

1. Receives GitHub webhook events.
2. Analyzes recent commits and changed files.
3. Uses Google Gemini AI to understand the changes.
4. Generates professional Markdown release notes.
5. Automatically updates the repository README.

## Problem

Developers spend valuable time manually maintaining changelogs, release notes, and project documentation.

As projects grow, documentation often becomes outdated, incomplete, or inconsistent.

## Solution

LogSmite acts as an autonomous documentation engineer.

By integrating directly with GitHub, it automatically tracks repository activity and generates meaningful release documentation without requiring manual effort from developers.

## Features

* GitHub App integration
* Automatic webhook processing
* AI-powered commit analysis
* Automatic release note generation
* README auto-updates
* Markdown output
* Supports repository installation through GitHub Apps

## Architecture

```text
GitHub Repository
        │
        ▼
GitHub Webhook
        │
        ▼
LogSmite Server
        │
        ▼
Google Gemini AI
        │
        ▼
Release Notes Generator
        │
        ▼
README Updater
        │
        ▼
Automatic Commit
```

## Tech Stack

### Backend

* Node.js
* Express.js

### AI

* Google Gemini 2.5 Flash
* @google/genai SDK

### GitHub Integration

* GitHub Apps
* GitHub Webhooks
* Octokit

### Utilities

* dotenv

## Environment Variables

Create a `.env` file in the project root.

```env
APP_ID=YOUR_GITHUB_APP_ID
PRIVATE_KEY_PATH=YOUR_PRIVATE_KEY_FILE.pem
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Never commit secrets to GitHub.

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd LogSmite
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file and add the required values.

### 4. Start Application

```bash
npm start
```

Server starts on:

```text
http://localhost:3000
```

## GitHub App Setup

### Create GitHub App

Navigate to:

GitHub → Settings → Developer Settings → GitHub Apps

Create a new GitHub App.

### Required Permissions

Repository Permissions:

* Contents: Read & Write
* Metadata: Read
* Pull Requests: Read

### Webhook Events

Subscribe to:

* Push
* Pull Request

### Generate Private Key

Generate a private key from the GitHub App settings and place it inside the project directory.

Example:

```text
logsmite.private-key.pem
```

### Configure Webhook URL

Expose your local server using ngrok:

```bash
ngrok http 3000
```

Example:

```text
https://your-ngrok-url.ngrok-free.app
```

Webhook URL:

```text
https://your-ngrok-url.ngrok-free.app/webhook
```

## Installing LogSmite on Other Repositories

### Step 1

Open the GitHub App installation page.

### Step 2

Click:

```text
Install App
```

### Step 3

Choose:

```text
Only select repositories
```

### Step 4

Select the repository you want LogSmite to manage.

### Step 5

Complete installation.

LogSmite will begin receiving webhook events from that repository.

## README Configuration

Repositories must contain the following markers:

```md
<!-- AUTO_RELEASE_START -->

Waiting for release notes...

<!-- AUTO_RELEASE_END -->
```

LogSmite replaces everything between these markers with AI-generated release notes.

## Example Output

```md
# Release Notes

## Executive Summary

This release introduces analytics features, improves performance, and updates project documentation.

## Features

- Added analytics dashboard

## Improvements

- Optimized API response handling

## Documentation

- Updated README instructions
```

## Workflow

```text
Developer Pushes Code
          │
          ▼
GitHub Webhook
          │
          ▼
LogSmite
          │
          ▼
Gemini AI Analysis
          │
          ▼
Release Notes Generation
          │
          ▼
README Update
          │
          ▼
Automatic Commit
```

## Future Scope

* Pull Request Summaries
* GitHub Release Creation
* Multi-language Release Notes
* Slack / Discord Notifications
* Team Activity Reports
* Repository Health Insights

## License

MIT License

```
```

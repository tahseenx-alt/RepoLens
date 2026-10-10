# RepoLens 🔍
### GitHub Repository Intelligence Dashboard

**Understand any public GitHub repository at a glance.**

RepoLens is a web-based repository analysis tool that transforms GitHub data into clear statistics, visualizations, and actionable insights. It helps developers understand repository activity, explore programming languages, analyze contributors, and assess basic repository health through a unified dashboard.

## Overview

Understanding a repository often requires navigating multiple GitHub pages to examine commits, contributors, programming languages, issues, and project metadata.

RepoLens brings this information together in one place, making repository exploration faster, simpler, and more intuitive.

## Features

- **Repository Overview** — Explore repository details, stars, forks, watchers, open issues, and other key statistics.
- **Language Analytics** — Visualize programming language distribution using data from GitHub.
- **Commit Activity** — Explore recent development activity through charts and commit history.
- **Contributor Insights** — View contributor profiles and contribution counts.
- **Recent Commits** — Review commit messages, authors, dates, and links to individual commits.
- **Issues and Pull Requests** — Examine repository issues and pull-request activity.
- **Repository Health Checks** — Identify potential improvements involving documentation, licensing, metadata, and recent activity.
- **Light and Dark Themes** — Switch between themes for a comfortable viewing experience.
- **Responsive Interface** — Use the dashboard across desktop, tablet, and mobile devices.
- **Error Handling** — Receive appropriate feedback for invalid repositories, network failures, and GitHub API rate limits.

*Feature availability depends on the current implementation and the data returned by GitHub.*

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface development |
| JavaScript (ES6+) | Application logic |
| Vite | Development server and build tooling |
| CSS / Tailwind CSS | Styling and responsive layouts |
| Recharts | Data visualization |
| Lucide React | Interface icons |
| GitHub REST API | Repository and contributor data |
| Git and GitHub | Version control and source code hosting |
| Render | Static website deployment |

## Getting Started

### Prerequisites

Install the following tools:

- [Node.js](https://nodejs.org/)
- npm, included with Node.js
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/tahseenx-alt/RepoLens.git
```

### 2. Navigate to the project directory

```bash
cd RepoLens
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually `http://localhost:5173`.

### 5. Create a production build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## How to Use RepoLens

1. Open RepoLens in your browser.
2. Enter a public GitHub repository in `owner/repository` format or paste its GitHub URL.
3. Click **Analyze**.
4. Explore the repository overview, language distribution, commit activity, contributors, issues, and health checks.
5. Switch between light and dark themes according to your preference.

For example, try:

- [facebook/react](https://github.com/facebook/react)
- [vitejs/vite](https://github.com/vitejs/vite)

## GitHub API

RepoLens uses the GitHub REST API to retrieve public repository information.

The application is designed to support public repository analysis without requiring users to sign in.

**API limitations:**

- Unauthenticated requests are subject to GitHub's rate limits.
- Some information may be unavailable for particular repositories.
- Analytics depend on the endpoints, permissions, and data returned by GitHub.
- Language byte counts represent the approximate distribution of detected language bytes, not exact lines of code.
- Basic repository health checks are indicators for further investigation, not a guarantee of code quality or security.

### Requests, saved data and rate limits

Without signing in, GitHub allows 60 requests per hour for each IP address. RepoLens never uses a token, so it keeps the number of requests low instead:

- **About 5 requests per repository.** The overview asks for the repository, its languages, commits, contributors and community profile (which also tells RepoLens whether a README exists). The issues and pull requests list is only requested when the **Issues & PRs** tab is first opened. Forks skip the community profile, because GitHub doesn't provide it for them, and check `/readme` instead.
- **No duplicate requests.** Sections that need the same data share one request.
- **Saved answers.** Successful answers are kept in memory and in this browser's `localStorage`, trimmed to the fields the dashboard uses. Opening the same repository again within the time below costs no requests.

  | Data | Reused for |
  |---|---|
  | Languages, README, community profile | 6 hours |
  | Contributors | 1 hour |
  | Repository details, commits, issues and pull requests | 10 minutes |

- **Clear labels.** The header shows when the data on screen was fetched ("Data from 9:55 AM"; hover it to see each section's time). **Refresh** asks GitHub again. **Clear history** also removes the saved answers. At most 60 answers are stored, and the oldest are removed first.
- **Rate limits (HTTP 403 and 429).** When GitHub refuses a request, RepoLens stops sending requests until GitHub's reset time (or the `retry-after` time it gives), shows that time in the error message and the footer, and keeps the **Try again** button disabled until then. If an older saved answer exists (up to 7 days old), it is shown with a warning that says how old it is, instead of being presented as current. Missing data is shown as unavailable, never as zero.

## Deployment on Render

RepoLens can be deployed as a static site using Render's free static-site hosting option, subject to the platform's current usage limits and terms.

### Deployment steps

1. Push the latest project code to GitHub.
2. Sign in to [Render](https://render.com/).
3. Create a new **Static Site**.
4. Connect the `tahseenx-alt/RepoLens` repository.
5. Configure the build settings:

   | Setting | Value |
   |---|---|
   | Build command | `npm install && npm run build` |
   | Publish directory | `dist` |

6. Deploy the site.
7. Open the generated public URL and test the application.

If client-side routing is enabled, configure an appropriate rewrite rule so direct navigation to application routes works correctly.

Render's free hosting availability, limits, and policies may change over time.

## Project Structure

The project follows a component-based React architecture.

```text
RepoLens/
├── public/              # Static assets
├── src/
│   ├── api/             # GitHub API integration
│   ├── components/      # Reusable UI components
│   ├── assets/          # Images and other assets
│   ├── App.jsx          # Main application
│   ├── App.css          # Application styles
│   └── main.jsx         # React entry point
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

*The exact directory structure may vary as the project evolves.*

## Future Improvements

Potential enhancements include:

- Repository comparison.
- Exportable analysis reports.
- More advanced contribution and activity analytics.
- Improved repository health rules.
- Historical activity comparisons.
- Additional accessibility and performance improvements.

## Author

**Tahseen Anwer**

GitHub: [@tahseenx-alt](https://github.com/tahseenx-alt)

## License

No license has been specified here. Add a license file to the repository if you intend to define the terms under which others may use, modify, or distribute the project.

---

*RepoLens — Making GitHub repository analysis clearer, faster, and more accessible.*

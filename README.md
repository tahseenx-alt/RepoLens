<div align="center">

# 🔍 RepoLens

### GitHub Repository Intelligence Dashboard

**Understand any public GitHub repository at a glance.**

### 🌐 [Live Demo: repolens-7lir.onrender.com](https://repolens-7lir.onrender.com)

[Features](#-features) · [Getting started](#-getting-started) · [How it works](#-how-it-works) · [Deployment](#-deployment) · [Roadmap](#-roadmap)

</div>

---

## 📖 About

RepoLens is a web application that turns data from the GitHub REST API into a clear, single-screen dashboard for any public repository. Enter a repository name or paste its link, and RepoLens shows its key statistics, language breakdown, commit activity, top contributors, recent issues and pull requests, and a set of basic health checks.

Reviewing a repository on GitHub usually means opening several pages one after another. RepoLens brings that information together so developers, reviewers and students can judge a project's activity and upkeep in a few seconds.

- **No sign-in or token required.** RepoLens only reads public data.
- **No backend.** It is a static single-page app that talks to GitHub directly from the browser.
- **Careful with GitHub's rate limit.** Requests are kept to a minimum, responses are cached, and rate-limit errors are handled clearly.

## ✨ Features

### Repository search
- Accepts `owner/repo`, `github.com/owner/repo`, full HTTPS links (including `.git` and deep links such as `/tree/main/...`) and SSH clone addresses (`git@github.com:owner/repo.git`).
- Validates input before any request is sent and explains what is wrong with an invalid entry.
- Remembers the 8 most recently analyzed repositories on the start page, with a one-click **Clear history**.

### Dashboard
Each repository has its own shareable address (for example `/facebook/react`), and the open tab is part of the link (`?tab=issues`). A header above the tabs shows the repository's stars, forks, watchers, open issues, license, topics and links to GitHub and the project homepage.

| Tab | What it shows |
|---|---|
| **Overview** | A language breakdown, a commit activity chart, the latest commits, top contributors and a health summary on one screen. |
| **Commits** | The latest 100 commits on the default branch with message, author, date and a link to each commit. The activity chart groups them by day, week or month, filtered to all fetched commits, the last 90 days or the last 30 days. |
| **Contributors** | The top 20 contributors by commit count, with avatars and profile links. |
| **Issues & PRs** | The 30 most recently updated issues and pull requests, filterable by type, with clear states (open, draft, merged, completed, not planned, closed). |
| **Health** | Eight rule-based checks, each with the GitHub data it is based on and a suggestion when something can be improved. |

### Health checks
RepoLens checks for a **README**, a recognized **license**, a **description**, **topics**, a **contributing guide**, **recent commits** (warns after 6 months without one), an enabled **issue tracker**, and whether the repository is **archived**. Each check is marked as passed, warning, unavailable or pending. There is deliberately no overall score: the checks are signals for further review, not a measure of code quality or security.

### Experience
- **Light and dark themes** that follow the operating system until you pick one, with no flash of the wrong theme on load.
- **Responsive layout** for desktop, tablet and mobile.
- **Accessible interface:** keyboard-navigable tabs, a skip link, labeled controls and support for reduced motion.
- **Clear loading, empty and error states** for missing repositories, empty repositories, network failures and rate limits. Missing data is shown as unavailable, never as zero.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | User interface |
| [React Router 7](https://reactrouter.com/) | Shareable repository and tab URLs |
| [Vite 8](https://vite.dev/) | Development server and production build |
| [Recharts 3](https://recharts.org/) | Commit activity chart |
| [Lucide React](https://lucide.dev/) | Icons |
| Plain CSS with custom properties | Styling, theming and responsive layout |
| [GitHub REST API](https://docs.github.com/en/rest) | Repository data |
| [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/) | Unit and component tests |
| [Oxlint](https://oxc.rs/) | Linting |
| [Render](https://render.com/) | Static site hosting |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **22.12 or newer** (the repository pins Node 22 in `.node-version`)
- npm, which comes with Node.js
- [Git](https://git-scm.com/)

### Installation

```bash
git clone https://github.com/tahseenx-alt/RepoLens.git
cd RepoLens
npm install
npm run dev
```

Then open the URL shown in your terminal, usually `http://localhost:5173`.

No environment variables or API keys are needed.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create an optimized production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with a coverage report |
| `npm run lint` | Lint the source code with Oxlint |

## 🧭 Usage

1. Open [RepoLens](https://repolens-7lir.onrender.com) in your browser, or run it locally.
2. Type a public repository such as `facebook/react`, or paste its GitHub link.
3. Press **Analyze**.
4. Use the tabs to explore the overview, commits, contributors, issues and pull requests, and health checks.
5. Use **Refresh** in the header to fetch fresh data, and the theme toggle to switch between light and dark.

Try it with [facebook/react](https://github.com/facebook/react), [vitejs/vite](https://github.com/vitejs/vite) or [tahseenx-alt/RepoLens](https://github.com/tahseenx-alt/RepoLens).

## ⚙️ How It Works

### Data from GitHub

RepoLens calls the public GitHub REST API without authentication:

| Endpoint | Used for |
|---|---|
| `GET /repos/{owner}/{repo}` | Repository details and several health checks |
| `GET /repos/{owner}/{repo}/languages` | Language breakdown |
| `GET /repos/{owner}/{repo}/commits` | Latest 100 commits and activity chart |
| `GET /repos/{owner}/{repo}/contributors` | Top 20 contributors |
| `GET /repos/{owner}/{repo}/community/profile` | README and contributing guide checks |
| `GET /repos/{owner}/{repo}/readme` | README check for forks, which have no community profile |
| `GET /repos/{owner}/{repo}/issues` | 30 most recently updated issues and pull requests |

### Staying within the rate limit

Without a token, GitHub allows **60 requests per hour per IP address**. RepoLens is built around that limit:

- **About 5 requests per repository.** Issues and pull requests are only requested when the **Issues & PRs** tab is first opened.
- **No duplicate requests.** Sections that need the same data share one request.
- **Cached responses.** Successful responses are kept in memory and in the browser's `localStorage`, trimmed to the fields the dashboard uses. Reopening a repository within the cache window costs no requests.

  | Data | Reused for |
  |---|---|
  | Languages, README, community profile | 6 hours |
  | Contributors | 1 hour |
  | Repository details, commits, issues and pull requests | 10 minutes |

- **Transparent freshness.** The header shows when the data on screen was fetched, with per-section times on hover. At most 60 responses are stored, oldest removed first, and **Clear history** removes them all.
- **Graceful rate limiting.** On an HTTP 403 or 429 rate-limit response, RepoLens pauses all requests until GitHub's reset time (or its `retry-after` value), shows that time, and disables **Try again** until then. If a saved response up to 7 days old exists, it is shown with a clear warning about its age instead of being presented as current.

### Known limitations

- Commit analytics cover the latest 100 commits on the default branch, not the full history.
- Language percentages are based on bytes detected by GitHub, not lines of code.
- GitHub's open issue count includes open pull requests.
- Only public repositories on github.com are supported.

## 🗂️ Project Structure

```text
RepoLens/
├── public/                  # Static assets (favicon)
├── src/
│   ├── api/                 # GitHub API client, response cache and rate-limit tracking
│   ├── components/
│   │   ├── charts/          # Commit activity chart and language breakdown
│   │   ├── dashboard/       # Dashboard tabs, panels and repository header
│   │   ├── layout/          # Site header, footer and theme provider/toggle
│   │   ├── search/          # Search form and recent repositories
│   │   └── ui/              # Shared panels, tabs and loading/empty/error states
│   ├── hooks/               # Data loading, rate limit, history and media hooks
│   ├── pages/               # Home, dashboard and not-found pages
│   ├── styles/              # Global, layout, home and dashboard styles
│   ├── tests/               # Vitest test suites and GitHub API fixtures
│   ├── theme/               # Light/dark theme logic and chart colors
│   ├── utils/               # Input parsing, analytics, health checks and formatting
│   ├── App.jsx              # App shell and routes
│   └── main.jsx             # React entry point
├── index.html
├── render.yaml              # Render Blueprint for static deployment
├── vite.config.js
└── package.json
```

## 🧪 Testing

The project uses Vitest with Testing Library and jsdom. Tests run against recorded GitHub API fixtures, so they need no network access and never touch the real rate limit. They cover input parsing, analytics, health checks, history, caching, rate-limit handling, hooks and the main app flows.

```bash
npm test
```

## ☁️ Deployment

The live version of RepoLens is hosted on Render at **[https://repolens-7lir.onrender.com](https://repolens-7lir.onrender.com)**.

RepoLens is a static site and can be hosted anywhere that serves static files. The repository includes a [Render Blueprint](render.yaml) for one-step deployment.

### Render (Blueprint)

1. Sign in to [Render](https://render.com/) and choose **New → Blueprint**.
2. Connect the `tahseenx-alt/RepoLens` repository. Render reads `render.yaml` automatically.

### Render (manual)

Create a **Static Site** with these settings:

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Rewrite rule | Source `/*`, destination `/index.html` |

The rewrite rule lets direct links such as `/facebook/react` load correctly, because routing happens in the browser.

## 🔮 Roadmap

These features are **planned** and not yet implemented:

- [ ] Side-by-side repository comparison
- [ ] Shareable and exportable analysis reports
- [ ] Deeper activity insights beyond the latest 100 commits
- [ ] More detailed repository health rules
- [ ] AI-powered repository summaries

## 👨‍💻 Author

**Tahseen Anwer**

- GitHub: [@tahseenx-alt](https://github.com/tahseenx-alt)

## 📄 License

No license has been chosen for this project yet. Until a `LICENSE` file is added, default copyright applies and all rights are reserved by the author.

---

<div align="center">

*Built to make understanding GitHub repositories simpler and more intuitive.*

</div>

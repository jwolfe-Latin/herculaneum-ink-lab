# Deploying Herculaneum Ink Lab with GitHub Pages

This guide assumes you have created an empty **private** GitHub repository named
`herculaneum-ink-lab`. The application is completely static: GitHub Pages only
hosts the files produced in `dist`.

## Before you begin

Install Git and sign in to GitHub in your browser. You also need permission to
use GitHub Pages for the private repository. Availability can depend on your
GitHub plan and, for an organization repository, its administrator's policies.

Open PowerShell, type `cd ` (including the space), drag the project folder
from File Explorer into the PowerShell window, and press Enter. PowerShell
fills in the correct path for your computer.


## Connect the local project

Replace `YOUR-GITHUB-USERNAME` with the username or organization that owns the
repository:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/herculaneum-ink-lab.git
git remote -v
```

If Git says that `origin` already exists, inspect `git remote -v`. If it points
to the wrong repository, correct it:

```powershell
git remote set-url origin https://github.com/YOUR-GITHUB-USERNAME/herculaneum-ink-lab.git
```

## Push for the first time

Commit the deployment-preparation changes, then push:

```powershell
git add .
git commit -m "Prepare GitHub Pages deployment"
git push -u origin main
```

Git may open a browser so you can sign in. Never put a password or access token
in a project file.

## Enable GitHub Pages

1. Open the repository on GitHub.
2. Select **Settings**.
3. In the left sidebar, select **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Return to the repository's **Actions** tab.

The included workflow runs automatically whenever code is pushed to `main`. You
can also open the workflow in **Actions**, choose **Run workflow**, select
`main`, and choose **Run workflow**.

## Watch the deployment

In **Actions**, open the newest
**Test, build, and deploy to GitHub Pages** run. It installs dependencies, runs
all tests, builds the application, uploads `dist`, and deploys it. Green check
marks beside both the `build` and `deploy` jobs mean it succeeded.

The final student URL is:

```text
https://YOUR-GITHUB-USERNAME.github.io/herculaneum-ink-lab/
```

GitHub also displays the exact URL in the deployment job and on
**Settings > Pages**. Replace the placeholder with the repository owner's
GitHub username or organization name.

## Publish future updates

After making and testing a change:

```powershell
git add .
git commit -m "Describe the update"
git push
```

The push starts a fresh deployment automatically.

## Troubleshoot a failed deployment

1. Open **Actions**, select the failed run, and open the step with the red X.
2. If tests failed, run `pnpm test` locally, fix the reported test, and push a
   new commit.
3. If the build failed, run `pnpm build` locally and fix the first reported
   error.
4. If dependency installation failed, confirm `pnpm-lock.yaml` was committed
   and was not edited by hand.
5. If deployment was denied, confirm **Settings > Pages > Source** is set to
   **GitHub Actions** and that Actions and Pages are allowed for the repository.
6. If the page opens but images are missing, confirm the URL ends with
   `/herculaneum-ink-lab/` and that `public/surface.png`,
   `public/reference-mask.png`, and `public/metadata.json` are committed.
7. After correcting the problem, push another commit or use **Run workflow** to
   retry manually.

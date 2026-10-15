# Angular + NestJS + PostgreSQL + RabbitMQ + Nginx + Jenkins (local laptop)

## 0. Prerequisites
Install Docker Desktop (Windows/macOS) or Docker Engine + Compose plugin (Linux), Git, and Node.js 22+ with npm.

## 1. Generate the Angular and NestJS build scaffolds
The archive includes the application source and Docker/CI files. Generate the standard CLI configuration files in a temporary directory, then copy only those config/package files into this repository so the provided application source is preserved.

Run these commands from the extracted repository root.

### Linux/macOS/Git Bash
```bash
TMP_DIR="$(mktemp -d)"
cd "$TMP_DIR"
npx -y @angular/cli@20 new frontend --standalone --routing --style=css --skip-git
npx -y @nestjs/cli new backend --package-manager npm --skip-git

cp frontend/package.json frontend/package-lock.json frontend/angular.json frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.spec.json "$OLDPWD/frontend/"
cp backend/package.json backend/package-lock.json backend/nest-cli.json backend/tsconfig.json backend/tsconfig.build.json "$OLDPWD/backend/"
cd "$OLDPWD"
rm -rf "$TMP_DIR"
```

If your shell does not preserve `OLDPWD` as expected, set `REPO_DIR` to the absolute path of the extracted repository before running the commands and use `"$REPO_DIR/frontend/"` and `"$REPO_DIR/backend/"` in the `cp` commands.

### Windows PowerShell alternative
```powershell
$Repo = (Get-Location).Path
$Tmp = Join-Path $env:TEMP "angular-nest-scaffold"
Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $Tmp | Out-Null
Set-Location $Tmp
npx -y @angular/cli@20 new frontend --standalone --routing --style=css --skip-git
npx -y @nestjs/cli new backend --package-manager npm --skip-git
Copy-Item frontend/package.json,frontend/package-lock.json,frontend/angular.json,frontend/tsconfig.json,frontend/tsconfig.app.json,frontend/tsconfig.spec.json "$Repo/frontend/"
Copy-Item backend/package.json,backend/package-lock.json,backend/nest-cli.json,backend/tsconfig.json,backend/tsconfig.build.json "$Repo/backend/"
Set-Location $Repo
Remove-Item $Tmp -Recurse -Force
```

Install backend runtime dependencies and regenerate its lockfile:
```bash
cd backend
npm install @nestjs/typeorm typeorm pg amqplib class-validator class-transformer
npm install -D @types/amqplib
cd ..
```

For Angular, keep the generated `package.json` and lockfile. The supplied `src/main.ts`, `src/app/app.ts`, `src/app/app.html`, `src/app/app.css`, and `src/styles.css` replace the corresponding generated source files. Keep the generated `angular.json`, TypeScript configs, and test runner config.

## 2. Build and run everything in Docker
```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

The compose project is named `helloapp`, so this is the same stack that Jenkins deploys. Running it by hand and running a Jenkins build replace each other instead of fighting over host ports.

Open:
- Angular app through Nginx: http://localhost:8081
- Jenkins UI: http://localhost:8080
- RabbitMQ management: http://localhost:15672 (username `hello`, password `hello-change-this`)
- Adminer DB UI: http://localhost:8082 (System: PostgreSQL, Server: `postgres`, Username: `hello`, Password: `hello-change-this`, Database: `hello`)
- PostgreSQL TCP port: `localhost:5432` (use a database client; PostgreSQL is not a browser UI)
- RabbitMQ AMQP port: `localhost:5672`

The API is `http://localhost:8081/api/tasks`. Creating, editing, completing, and deleting tasks writes to PostgreSQL and publishes persistent JSON events to the RabbitMQ `task-events` queue.

## 2b. Local development with hot reload
Run PostgreSQL and RabbitMQ in Docker, and run the backend and frontend on your machine so both reload on save.

Start the infrastructure only:
```bash
docker compose up -d postgres rabbitmq adminer
```

Backend (terminal 1):
```bash
cd backend
npm install
npm run dev
```
It listens on http://localhost:3000 and connects to `localhost:5432` and `localhost:5672` using the defaults in `src/app.module.ts` and `src/tasks/task-events.service.ts`. Override with the `DB_*` and `RABBITMQ_URL` environment variables if needed.

Frontend (terminal 2):
```bash
cd frontend
npm install
npm start
```
Open http://localhost:4200. `frontend/proxy.conf.json` forwards `/api` to the backend on port 3000, so the same relative URLs work in development and in the Nginx image.

Saving a task writes a row to the `tasks` table and publishes an event to the `task-events` queue. Verify with:
```bash
docker exec helloapp-postgres-1 psql -U hello -d hello -c "select id, title, completed from tasks order by id desc limit 5;"
docker exec helloapp-rabbitmq-1 rabbitmqctl list_queues name messages
```

Stop the containerised `backend` and `frontend` services first if they are running, so the browser reaches your dev servers rather than the built images:
```bash
docker compose stop backend frontend
```

## 3. Start Jenkins in Docker
```bash
docker compose -f jenkins/docker-compose.yml up --build -d
docker compose -f jenkins/docker-compose.yml logs -f jenkins
```

Get the initial admin password:
```bash
docker exec local-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
Open http://localhost:8080, install suggested plugins, and create an admin user. Ensure Jenkins has the **Pipeline**, **Git**, and **Pipeline: Stage View** plugins (the Git plugin is normally installed with suggested plugins).

**Docker socket warning:** Jenkins mounts `/var/run/docker.sock` and runs as root inside its container so it can build and deploy containers through the host Docker daemon. A Jenkins job can effectively control your host. Use this only on your trusted laptop; do not expose Jenkins publicly.

## 4. Run Jenkins automatically on every pushed commit
1. Create a GitHub/GitLab repository and push this project. Jenkins must be able to clone it; configure Jenkins credentials for a private repository.
2. In Jenkins, choose **New Item → Pipeline**.
3. Under **Pipeline**, select **Pipeline script from SCM**.
4. SCM: **Git**; Repository URL: your repository URL; Credentials: your token/credential if private; Branch: `*/main` (or your branch); Script Path: `Jenkinsfile`.
5. Save and click **Build Now** once. The job must build once before any trigger works, because Jenkins only learns the repository URL from that first checkout.
6. Enable the bundled git hook so a build starts the moment you push:
   ```bash
   git config core.hooksPath jenkins/hooks
   ```
   On Linux/macOS also run `chmod +x jenkins/hooks/pre-push` if the file lost its executable bit.

`jenkins/hooks/pre-push` waits until the remote actually has the pushed commit, then calls `http://localhost:8080/git/notifyCommit?url=<your repo>`, which makes Jenkins poll immediately instead of waiting for the next minute. Set `JENKINS_URL` in your environment if Jenkins does not run on `localhost:8080`. The hook fails silently, so a stopped Jenkins never blocks a push.

`pollSCM('* * * * *')` stays in the Jenkinsfile as a fallback for pushes made from a clone without the hook. Both paths detect **pushed** commits, not unpushed local ones. For GitHub to push the event itself, the Jenkins URL must be reachable through a secure public tunnel and a webhook must be configured in the repository.

`NOTIFY_COMMIT_ACCESS_CONTROL=disabled-for-polling` in `jenkins/docker-compose.yml` is what allows the unauthenticated `notifyCommit` call. It limits the endpoint to triggering a poll; it cannot be used to build an arbitrary commit.

### What a build does
1. **Checkout** the pushed commit.
2. **Install and test backend** — `npm ci`, Jest, `nest build`.
3. **Install, test and build frontend** — `npm ci`, Karma on headless Chrome, `ng build`.
4. **Build Docker images** for the backend and frontend.
5. **Deploy locally** — stops any container outside the `helloapp` project that holds ports 8081, 8082, 5432, 5672 or 15672, then recreates the stack. This is what makes repeated builds succeed instead of failing on "port is already allocated".
6. **Smoke test** — polls `/api/health` through the Nginx container until it responds.

On success the build log prints the deployed URL. The app is served at **http://localhost:8081** and the API health check at **http://localhost:8081/api/health**. Change `APP_URL` in the `environment` block of the `Jenkinsfile` if you publish the frontend on a different host or port.

Because the deployment runs on your laptop's Docker daemon, the URL is reachable from your machine only. To share it, put a tunnel (for example `cloudflared` or `ngrok`) in front of port 8081.

## 5. Useful commands
```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f rabbitmq
docker compose down
docker compose down -v   # WARNING: deletes PostgreSQL data
```

## Notes
- TypeORM `synchronize: true` is demo-only. Use migrations in real projects.
- Change sample credentials before using this beyond a local laptop.
- The Angular Dockerfile expects `dist/frontend/browser`. If your generated `angular.json` uses a different output path, update the Dockerfile's `COPY --from=build` source.
- The backend ships ESM-only NestJS 12 packages, so Jest runs through `node --experimental-vm-modules` with `ts-jest` in ESM mode (see the `jest` block in `backend/package.json` and `backend/tsconfig.spec.json`).
- `frontend/karma.conf.js` launches headless Chrome with `--no-sandbox` because Jenkins runs as root in its container.

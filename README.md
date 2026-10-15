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

## 2. Build and run locally
```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Open:
- Angular app through Nginx: http://localhost:8081
- Jenkins UI: http://localhost:8080
- RabbitMQ management: http://localhost:15672 (username `hello`, password `hello-change-this`)
- Adminer DB UI: http://localhost:8082 (System: PostgreSQL, Server: `postgres`, Username: `hello`, Password: `hello-change-this`, Database: `hello`)
- PostgreSQL TCP port: `localhost:5432` (use a database client; PostgreSQL is not a browser UI)

The API is `http://localhost:8081/api/tasks`. Creating, editing, completing, and deleting tasks writes to PostgreSQL and publishes persistent JSON events to the RabbitMQ `task-events` queue.

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
5. Save and click **Build Now** once.
6. The `pollSCM('* * * * *')` trigger in the Jenkinsfile checks the remote branch every minute. Commit and **push** changes; Jenkins should start a build after detecting the update.

This is local polling, so it is not instant and it detects pushed commits, not unpushed local commits. For instant webhook builds, the Jenkins URL must be reachable by GitHub/GitLab through a secure public tunnel and the corresponding webhook must be configured.

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
- If the Angular CLI-generated test command differs in your CLI version, adjust the frontend test stage in `Jenkinsfile` to match the generated runner.

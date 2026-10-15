pipeline {
    agent any

    triggers {
        // jenkins/hooks/pre-push calls /git/notifyCommit after a push, which triggers an
        // immediate poll. This schedule is the fallback for pushes made without the hook.
        pollSCM('* * * * *')
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        APP_URL = 'http://localhost:8081'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install and test backend') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm test -- --runInBand'
                    sh 'npm run build'
                }
            }
        }

        stage('Install, test and build frontend') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm test -- --watch=false'
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker images') {
            steps {
                sh 'docker compose -p helloapp -f docker-compose.yml build'
            }
        }

        stage('Deploy locally') {
            steps {
                // Stop containers from other compose projects that hold our published host ports.
                sh '''
                    for port in 8081 8082 5432 5672 15672; do
                      docker ps --filter "publish=$port" --format '{{.ID}} {{.Label "com.docker.compose.project"}}' | while read id project; do
                        if [ "$project" != "helloapp" ]; then
                          echo "Stopping $id (project '$project') holding port $port"
                          docker stop "$id"
                        fi
                      done
                    done
                '''
                sh 'docker compose -p helloapp -f docker-compose.yml down --remove-orphans'
                sh 'docker compose -p helloapp -f docker-compose.yml up -d --remove-orphans'
                sh 'docker compose -p helloapp -f docker-compose.yml ps'
            }
        }

        stage('Smoke test') {
            steps {
                sh '''
                    for i in $(seq 1 30); do
                      if docker run --rm --network helloapp_default curlimages/curl:8.12.1 -fsS http://frontend/api/health; then
                        exit 0
                      fi
                      sleep 2
                    done
                    echo "Health endpoint did not become ready"
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "Deployed. App: ${env.APP_URL}  API health: ${env.APP_URL}/api/health"
        }
        failure {
            sh 'docker compose -p helloapp -f docker-compose.yml logs --tail 60 backend frontend || true'
        }
    }
}

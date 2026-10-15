pipeline {
    agent any

    triggers {
        // Poll the configured Git repository every minute. A local-only Jenkins
        // cannot receive a GitHub webhook unless a public tunnel is configured.
        pollSCM('* * * * *')
    }

    options {
        timestamps()
        disableConcurrentBuilds()
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
}

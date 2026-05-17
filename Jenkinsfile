pipeline {
    agent any

    environment {
        IMAGE_BACKEND  = 'cafespot-backend'
        IMAGE_FRONTEND = 'cafespot-frontend'
        REPO_URL       = 'https://github.com/jnicolette/cafe-spot.git'
        BRANCH         = 'main'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                git url: "${REPO_URL}", branch: "${BRANCH}"
            }
        }

        stage('Lint & Validate') {
            steps {
                sh 'python3 -m py_compile backend/app.py && echo "backend/app.py OK"'
                sh '''
                    test -f backend/app.py           && echo "app.py OK"           || (echo "ERROR: app.py missing" && exit 1)
                    test -f backend/requirements.txt && echo "requirements.txt OK" || (echo "ERROR: requirements.txt missing" && exit 1)
                    test -f backend/Dockerfile       && echo "Dockerfile OK"       || (echo "ERROR: backend Dockerfile missing" && exit 1)
                    test -f frontend/index.html      && echo "index.html OK"       || (echo "ERROR: index.html missing" && exit 1)
                    test -f frontend/dashboard.html  && echo "dashboard.html OK"   || (echo "ERROR: dashboard.html missing" && exit 1)
                    test -f frontend/Dockerfile      && echo "Dockerfile OK"       || (echo "ERROR: frontend Dockerfile missing" && exit 1)
                    test -f docker-compose.yml       && echo "docker-compose.yml OK" || (echo "ERROR: docker-compose.yml missing" && exit 1)
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'pip3 install -r backend/requirements.txt'
                sh 'python3 -c "import flask, flask_cors, flask_jwt_extended, requests; print(\"All imports OK\")"'
            }
        }

        stage('Build Docker Images') {
            steps {
                sh "docker build -t ${IMAGE_BACKEND}:latest ./backend"
                sh "docker build -t ${IMAGE_FRONTEND}:latest ./frontend"
                sh 'docker compose build'
            }
        }

        stage('Test Backend Health') {
            steps {
                script {
                    try { sh 'docker rm -f test-backend' } catch (err) { echo 'No existing test container.' }
                }
                sh "docker run -d --name test-backend -p 5099:5000 -e SECRET_KEY=test-secret -e DB_PATH=/tmp/test.db ${IMAGE_BACKEND}:latest"
                sleep(time: 8, unit: 'SECONDS')
                sh 'docker logs test-backend'
                sh 'curl -f http://localhost:5099/api/health'
                sh 'docker stop test-backend && docker rm test-backend'
            }
        }

        stage('Deploy') {
            steps {
                script {
                    try { sh 'docker compose down' } catch (err) { echo 'Nothing to stop.' }
                }
                sh 'docker compose up -d --build'
                echo 'CafeSpot is LIVE at http://localhost:8082'
            }
        }
    }

    post {
        always {
            script {
                try { sh 'docker rm -f test-backend' } catch (err) { echo 'Clean.' }
            }
        }
        success { echo 'Pipeline succeeded! CafeSpot is live.' }
        failure { echo 'Pipeline failed. Check the stage logs above.' }
    }
}

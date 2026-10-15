FROM jenkins/jenkins:lts-jdk21

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/*

ARG DOCKER_CLI_VERSION=27.5.1
ARG COMPOSE_VERSION=v2.32.4
RUN set -eux; \
    ARCH="$(dpkg --print-architecture)"; \
    case "$ARCH" in \
      amd64) DOCKER_ARCH="x86_64"; COMPOSE_ARCH="x86_64" ;; \
      arm64) DOCKER_ARCH="aarch64"; COMPOSE_ARCH="aarch64" ;; \
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;; \
    esac; \
    curl -fsSL "https://download.docker.com/linux/static/stable/${DOCKER_ARCH}/docker-${DOCKER_CLI_VERSION}.tgz" -o /tmp/docker.tgz; \
    tar -xzf /tmp/docker.tgz -C /tmp; \
    install -m 0755 /tmp/docker/docker /usr/local/bin/docker; \
    mkdir -p /usr/local/lib/docker/cli-plugins; \
    curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${COMPOSE_ARCH}" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose; \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose; \
    rm -rf /tmp/docker /tmp/docker.tgz

# This local-learning image runs as root so it can access the mounted Docker socket.
# Never expose this Jenkins instance to untrusted users.

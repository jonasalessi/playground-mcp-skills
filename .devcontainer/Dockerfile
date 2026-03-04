FROM mcr.microsoft.com/devcontainers/typescript-node:20

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends ripgrep curl tar

USER node
RUN curl -fsSL https://opencode.ai/install | bash

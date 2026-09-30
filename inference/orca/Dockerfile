FROM ghcr.io/ggml-org/llama.cpp:server-cuda

USER root
COPY entrypoint.sh /entrypoint.sh
RUN chmod 0555 /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]

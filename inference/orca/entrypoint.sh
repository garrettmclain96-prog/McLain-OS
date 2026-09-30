#!/bin/sh
set -eu

: "${LLAMA_API_KEY:?LLAMA_API_KEY is required}"
: "${HF_TOKEN:?HF_TOKEN is required for the gated Hugging Face repository}"

MODEL_REPO="${MODEL_REPO:-orcarouter/OrcaSAQ-2-Cyber-27B-Uncensored-GGUF}"
MODEL_ALIAS="${MODEL_ALIAS:-OrcaSAQ-2-27B-Uncensored}"
CTX_SIZE="${LLAMA_CTX_SIZE:-32768}"
PARALLEL="${LLAMA_PARALLEL:-1}"

exec /app/llama-server \
  -hf "$MODEL_REPO" \
  --alias "$MODEL_ALIAS" \
  -ngl 99 \
  -c "$CTX_SIZE" \
  -np "$PARALLEL" \
  --host 0.0.0.0 \
  --port 8080 \
  --api-key "$LLAMA_API_KEY" \
  --no-webui

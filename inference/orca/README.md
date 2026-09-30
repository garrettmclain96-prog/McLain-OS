# Orca Cyber GPU Inference

This image runs `orcarouter/OrcaSAQ-2-Cyber-27B-Uncensored-GGUF` behind `llama-server` as an authenticated OpenAI-compatible endpoint.

## Runtime contract

- GPU: 24 GB VRAM minimum practical target for full offload.
- Port: `8080`.
- OpenAI API: `/v1/chat/completions`, `/v1/models`.
- Health: `/health`.
- Authentication: `Authorization: Bearer $LLAMA_API_KEY`.
- Web UI: disabled.
- Tool execution: disabled. Tool schemas may be returned by the model, but execution stays outside this service.

## Required secrets

- `HF_TOKEN`: Hugging Face token authorized to download the gated model. Accept the repository access conditions before deployment.
- `LLAMA_API_KEY`: long random token shared only with the McLain AI Gateway.

## Optional settings

- `MODEL_REPO` default: `orcarouter/OrcaSAQ-2-Cyber-27B-Uncensored-GGUF`
- `MODEL_ALIAS` default: `OrcaSAQ-2-27B-Uncensored`
- `LLAMA_CTX_SIZE` default: `32768`
- `LLAMA_PARALLEL` default: `1`

## RunPod deployment

Use a Secure Cloud Pod with a 24 GB+ NVIDIA GPU. A5000/RTX 3090 are the lowest-cost practical class; RTX 4090 is preferable when latency matters.

Build/publish this directory as a container, attach persistent storage for the Hugging Face cache, expose port 8080 only through the provider proxy, and set the required secrets. Do not expose an unauthenticated `llama-server`.

After the pod is healthy, configure McLain OS:

- `ORCA_BASE_URL=https://<private-or-proxied-host>/v1`
- `ORCA_API_KEY=<same value as LLAMA_API_KEY>`
- `ORCA_MODEL=OrcaSAQ-2-27B-Uncensored`
- `MCLAIN_AI_GATEWAY_KEY=<separate gateway client key>`

McLain OS clients use model alias `mclain-cyber`; they never depend on the upstream hostname or Orca model identifier.

## Boundary

The inference service generates text and structured tool calls only. Do not mount host files, Docker sockets, cloud credentials, scanner credentials, or production shells into this container. Authorization for downstream actions belongs to the McLain OS tool/policy layer.

# Deploy Orca on RunPod

McLain OS owns the model interface. RunPod is only the replaceable GPU compute provider.

## Architecture

```
McLain OS / consumers
        |
        | OpenAI-compatible API
        v
McLain AI Gateway
 model = mclain-cyber
        |
        | authenticated private upstream
        v
RunPod GPU worker
 llama-server + OrcaSAQ-2 Cyber 27B
```

The client never receives the RunPod URL, Hugging Face token, or upstream model identifier.

## Before launching

1. Accept access conditions for `orcarouter/OrcaSAQ-2-Cyber-27B-Uncensored-GGUF` on Hugging Face.
2. Create a RunPod API key.
3. Add these GitHub Actions secrets to `garrettmclain96-prog/McLain-OS`:
   - `RUNPOD_API_KEY`
   - `HF_TOKEN`
   - `LLAMA_API_KEY` — generate a long random value; this protects the GPU worker.
4. If the GHCR package is private, create a RunPod container-registry credential and add its ID as optional secret `RUNPOD_REGISTRY_AUTH_ID`.

## Launch

Open GitHub Actions → **Launch Orca GPU Pod** → **Run workflow**.

The workflow is deliberately manual because starting a GPU creates billable infrastructure.

Defaults:
- GPU: `NVIDIA GeForce RTX 4090`
- Cloud: `SECURE`
- Context: 32,768
- GPU count: 1
- Worker port: 8080/http
- SSH: disabled
- Persistent cache volume: 30 GB
- Auto-stop: 4 hours

The GPU ID is editable at launch. RunPod recommends using `runpodctl gpu list` to see exact currently available GPU IDs.

## Worker URL

RunPod exposes HTTP ports as:

```
https://<pod-id>-8080.proxy.runpod.net
```

The gateway should then receive:
- `ORCA_BASE_URL=https://<pod-id>-8080.proxy.runpod.net/v1`
- `ORCA_API_KEY=<same value as LLAMA_API_KEY>`
- `ORCA_MODEL=OrcaSAQ-2-27B-Uncensored`

Consumers continue to use only:
- base URL: the McLain AI Gateway
- model: `mclain-cyber`
- gateway credential: `MCLAIN_AI_GATEWAY_KEY`

## Cost containment

The launch workflow requires an explicit manual action and defaults to `--stop-after 4h`. Change that window only when you intentionally want longer GPU uptime. Stopping a Pod releases GPU compute, but storage can remain billable until the Pod/storage is removed.

## Security boundary

The GPU container:
- has no SSH by default,
- has the llama.cpp web UI disabled,
- requires its own API key,
- has no Docker socket or host filesystem,
- has no application/cloud credentials,
- does not execute model-generated tools.

Execution authorization remains outside the model in McLain OS.

# McLain AI Gateway service

This is the separately deployable model-router process used by McLain OS.

It exposes:
- `POST /v1/chat/completions`
- `GET /v1/models`
- `GET /health`

Clients only request the stable alias `mclain-cyber`. The service maps that alias to the configured private GPU provider.

Required runtime configuration:
- `MCLAIN_AI_GATEWAY_KEY`
- `ORCA_BASE_URL`
- `ORCA_API_KEY`
- optional `ORCA_MODEL`

The service never accepts an upstream URL from a client request and does not execute model-generated tools.

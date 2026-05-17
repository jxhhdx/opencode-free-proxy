# opencode-free-proxy

Proxy server that exposes [OpenCode](https://opencode.ai) free-tier AI models through standard **OpenAI** and **Anthropic** APIs.

Run it on any VPS and point your tools at it — they get free access to DeepSeek V4 Flash, MiniMax M2.5, Qwen 3.6, and more.

## How it works

```
Your app / IDE / CLI
        │
        ▼
  opencode-free-proxy (this server)
        │
        ▼  HTTPS + x-opencode-* auth headers
  opencode.ai/zen/v1/  (free tier)
```

The proxy adds the required `x-opencode-*` authentication headers that the Zen API expects (discovered via reverse engineering the opencode binary). Without these headers, even `Authorization: Bearer public` gets rejected.

## Quick start

```bash
git clone https://github.com/bigdata2211it-web/opencode-free-proxy.git
cd opencode-free-proxy
npm install
node server.mjs
```

On first run, the server generates `api-keys.json` with two keys: `admin` and `user-default`. Use these as your API key when connecting.

## Endpoints

| Method | Path | Format | Description |
|--------|------|--------|-------------|
| `POST` | `/v1/chat/completions` | OpenAI | Chat completions (streaming + non-streaming) |
| `POST` | `/v1/messages` | Anthropic | Messages API (streaming + non-streaming) |
| `GET` | `/v1/models` | OpenAI | List available models |
| `GET` | `/health` | — | Health check |

## Authentication

Set your API key in requests:

```bash
# OpenAI format
curl http://localhost:9090/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash-free","messages":[{"role":"user","content":"Hello"}]}'

# Anthropic format
curl http://localhost:9090/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash-free","messages":[{"role":"user","content":"Hello"}],"max_tokens":1024}'
```

Both `Authorization: Bearer KEY` and `x-api-key: KEY` headers are accepted on all endpoints.

## Available models

| Model | Backend | Status |
|-------|---------|--------|
| `deepseek-v4-flash-free` | DeepSeek V4 Flash | Stable |
| `big-pickle` | DeepSeek V4 Flash | Stable |
| `minimax-m2.5-free` | MiniMax M2.5 | Stable |
| `nemotron-3-super-free` | NVIDIA Nemotron | Flaky |
| `qwen3.6-plus-free` | Qwen 3.6 Plus | Intermittent |

## Use with opencode CLI

Add to `~/.config/opencode/opencode.json`:

```json
{
  "provider": {
    "oc-free": {
      "name": "oc-free",
      "type": "openai",
      "apiKey": "YOUR_KEY",
      "baseURL": "http://YOUR_SERVER:9090/v1",
      "models": {
        "oc-free/deepseek-v4-flash-free": {
          "name": "oc-free/deepseek-v4-flash-free",
          "id": "deepseek-v4-flash-free",
          "attachment": true,
          "reasoning": true
        }
      }
    }
  }
}
```

## Use with Claude Code / Cursor / etc.

Point any tool that supports custom OpenAI or Anthropic endpoints at `http://YOUR_SERVER:9090`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_PORT` | `9090` | Server port |
| `KEYS_FILE` | `./api-keys.json` | Path to API keys file |

## SSH tunnel (if server port not exposed)

```bash
ssh -L 19090:127.0.0.1:9090 user@your-server
# Then use http://localhost:19090/v1 as base URL
```

## How Zen API auth works

The opencode binary (Bun runtime) sets these headers for free-tier requests:

- `Authorization: Bearer public`
- `User-Agent: opencode/<version> ai-sdk/provider-utils/...`
- `x-opencode-client: cli`
- `x-opencode-project: global`
- `x-opencode-request: msg_<unique_id>`
- `x-opencode-session: ses_<unique_id>`

Without the `x-opencode-*` headers, the API returns `AuthError: Missing API key`.

This was discovered by:
1. Running `BUN_CONFIG_VERBOSE_FETCH=curl opencode run` to capture HTTP requests
2. Decompiling the bundled JS chunks in the Bun binary
3. Finding the provider plugin that sets `apiKey = "public"` for free models

## License

MIT

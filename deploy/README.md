# Deployment

The lecture app is a Node + Socket.io server with a SQLite database, packaged
with Docker. Deployment scripts are organized by provider.

```
deploy/
  Dockerfile            shared — container image
  docker-compose.yml    shared — runs the image, mounts SQLite volume
  do-*.bat              DigitalOcean scripts    ← recommended
  do-userdata.sh        DigitalOcean cloud-init
  README-DIGITALOCEAN.md
```

## Which provider?

- **DigitalOcean** (`deploy/`, `do-*.bat`) — recommended. Singapore region (low
  latency to Malaysia), ~$6–12/mo billed hourly, persistent disk, great CLI.

The former `aws-ec2/` and `aws-lightsail/` script sets have been removed; only
the DigitalOcean path is maintained. All providers kept the same Docker + SQLite
setup and share the `Dockerfile` and `docker-compose.yml` at the `deploy/` root.

## Shared Docker files

`Dockerfile` and `docker-compose.yml` stay at the `deploy/` root because the
deploy scripts unpack the whole repo onto the server and run
`docker-compose -f deploy/docker-compose.yml`. The compose `context: ..` points
at the repo root (one level up from `deploy/`). Don't move these into a
subfolder without updating those relative paths.

## Rate limiting

The app ships with two layers of protection against a room full of phones (and
against a student who discovers that feedback earns points):

1. **HTTP** — `express-rate-limit` guards state-changing requests and new
   Socket.io handshakes, keyed by client IP. Static GETs are never limited, so a
   lecture hall loading the page at once is harmless.
2. **Socket.io events** — messages never pass through Express, so every event is
   budgeted per connection, per student (shared across their tabs) and per IP
   (the backstop for a whole room behind one NAT/tunnel address). Over-limit
   senders get a `rate:limited` toast and are disconnected after repeated
   violations; the client auto-reconnects and auto-logs-in.
3. **Point rules** — feedback and questions have a per-action cooldown and a
   per-session cap, enforced server-side, so a held-down button cannot inflate
   a score (or the team bonus derived from it).

The pages also throttle their own event listeners (`public/js/rate-limit-client.js`)
so a double tap or a stuck key never becomes traffic in the first place.

Tuning lives in `server.js` under "Rate limiting: configuration & HTTP layer".
Every value is an environment variable; add them to `docker-compose.yml` to
override the defaults:

| Variable | Default | Meaning |
| --- | --- | --- |
| `RATE_LIMIT_ENABLED` | `1` | Set `0` to turn all limiting off |
| `TRUST_PROXY` | `0` | Number of proxies in front (set `2` for the Cloudflare Tunnel) |
| `RATE_LIMIT_HTTP_MAX` / `RATE_LIMIT_HTTP_WINDOW_MS` | `120` / `60000` | Non-GET request budget per IP |
| `RATE_LIMIT_HANDSHAKE_MAX` / `RATE_LIMIT_HANDSHAKE_WINDOW_MS` | `900` / `60000` | New Socket.io connections per IP per window |
| `RATE_LIMIT_MULTIPLIER` | `1` | Scales every per-event socket budget at once |
| `RATE_LIMIT_IP_EVENTS_MAX` / `RATE_LIMIT_IP_WINDOW_MS` | `6000` / `10000` | Shared socket-event backstop per IP |
| `ACTIVITY_COOLDOWN_MS` | `10000` | Minimum gap between two feedback/question sends |
| `FEEDBACK_CAP` / `QUESTION_CAP` | `8` / `5` | Per-student cap per session |
| `RATE_LIMIT_DISCONNECT_AFTER` | `40` | Violations allowed before a socket is dropped |

Notes when changing these:

- `RATE_LIMIT_IP_EVENTS_MAX` is shared by *every* client behind one public
  address, and the tunnel is one address — raise `RATE_LIMIT_MULTIPLIER`
  (e.g. `--scale` a bigger room) rather than lowering the per-student numbers.
- The socket-event budgets are flood guards, deliberately looser than the point
  rules. If you tighten them below what a legitimately enthusiastic student
  sends, the server silently drops the event instead of returning the friendly
  "you've hit the limit" message.

Verify everything still behaves after a change:

```bash
npm run test:rate-limit
```

It boots the real server and checks that each limit engages, that a spammer
cannot farm points, and that normal lecture traffic is untouched.


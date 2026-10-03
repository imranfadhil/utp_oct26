# Deploying to DigitalOcean

Runs the lecture app on a DigitalOcean Droplet in **Singapore (`sgp1`)** — the
lowest-latency DO region to Malaysia. Keeps the same Docker + SQLite setup and
pushes code over SSH.

## Why DigitalOcean

- **Cost**: `s-1vcpu-2gb` Droplet ≈ **$12/mo**, billed hourly. A one-day lecture
  costs cents if you destroy it after. Drop to `s-1vcpu-1gb` (~$6/mo) to trim.
- **Reliable + great tooling**: `doctl` CLI scripts the whole lifecycle.
- **Persistent disk**: SQLite works unchanged and survives restarts.
- **Low latency to Malaysia**: Singapore region is ~1–2 ms away.

## Prerequisites

- `doctl` installed and authenticated: `doctl auth init`
  (install: https://docs.digitalocean.com/reference/doctl/how-to/install/)
- OpenSSH `ssh`, `scp`, `ssh-keygen` on PATH (built into Windows 10/11)
- `tar` (built into Windows 10/11)

## Configure

Edit `do-config.bat`:

- `SIZE` — droplet size (`s-1vcpu-2gb` default, `s-1vcpu-1gb` to save cost)
- `REGION` — `sgp1` (Singapore) by default
- `ADMIN_PASSWORD` — locks `/lecturer.html`; empty to disable auth

## Commands

```bat
cd deploy

do-deploy.bat            REM create droplet, push code, start app
do-sync.bat             REM push code changes (no rebuild)
do-sync.bat --restart   REM push + force docker rebuild
do-destroy.bat          REM delete droplet + DO SSH key
```

`do-deploy.bat` prints the public IP and URLs when done. Open Present mode at
`http://<public-ip>/present.html` so the join QR encodes the reachable URL.

## HTTPS via Cloudflare Tunnel (no domain needed)

`do-sync.bat` automatically starts a **Cloudflare Tunnel** container alongside the app,
giving you a real HTTPS URL like:

```
https://<random>.trycloudflare.com
```

This URL is printed at the end of `do-sync.bat`. Use it for Present mode so
students connect over HTTPS — the QR code will encode the HTTPS URL.

The tunnel runs as a Docker container (`cloudflare/cloudflared`) and restarts
automatically with the app. If you need the URL again later, run:

```bash
ssh -i %USERPROFILE%\.ssh\utp-lecture-do-key root@<ip> docker ps --filter name=cloudflared --format '{{.Names}}' | head -1 | xargs docker logs 2>&1 | grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' | head -1
```

## Notes

- The `docker-20-04` marketplace image ships with Docker + Compose, so first
  boot is quick; deploy waits ~45s before the first code push.
- Droplet user is `root`; app lives in `/root/lecture-system`.
- Data persists on the droplet's disk across restarts; destroying the droplet
  deletes it.

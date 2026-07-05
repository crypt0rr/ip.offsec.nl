# ip.offsec.nl

Public IP and request diagnostics utility, inspired by `ident.me` and `ifconfig.co`.

## Behavior

- Browser requests to `https://ip.offsec.nl` render a small diagnostics page.
- CLI-style requests such as `curl https://ip.offsec.nl` return only the public IP plus a newline.
- `Accept: application/json` or `/json` returns structured request metadata.

## Endpoints

```sh
curl https://ip.offsec.nl
curl https://ip.offsec.nl/ip
curl https://ip.offsec.nl/json
curl https://ip.offsec.nl/headers
curl https://ip.offsec.nl/asn
curl https://ip.offsec.nl/country
curl https://ip.offsec.nl/city
curl https://ip.offsec.nl/colo
curl https://ip.offsec.nl/ua
```

## Development

```sh
npm install
npm test
npm run dev
```

The app is designed for Cloudflare Pages advanced mode. Deploy the `public/` directory as the Pages output directory. The `_worker.js` file handles dynamic responses and falls back to static assets.

## Cloudflare Pages

Recommended project settings:

- Project name: `ip-offsec-nl`
- Build command: none
- Build output directory: `public`
- Custom domain: `ip.offsec.nl`

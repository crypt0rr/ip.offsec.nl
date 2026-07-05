import assert from "node:assert/strict";
import worker from "../public/_worker.js";

const env = {
  ASSETS: {
    fetch: async () => new Response("missing", { status: 404 })
  }
};

function request(path = "/", init = {}) {
  const { headers = {}, origin = "https://ip.offsec.nl", ...rest } = init;

  return new Request(`${origin}${path}`, {
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      "cf-ray": "8abc123def456789-AMS",
      "user-agent": "node-test",
      ...headers
    },
    ...rest
  });
}

async function text(path, init) {
  const response = await worker.fetch(request(path, init), env);
  return [response, await response.text()];
}

{
  const [response, body] = await text("/", {
    headers: {
      accept: "*/*",
      "user-agent": "curl/8.0.0"
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(body, "203.0.113.10\n");
}

{
  const [response, body] = await text("/", {
    origin: "http://ip.offsec.nl",
    headers: {
      accept: "*/*",
      "user-agent": "curl/8.0.0"
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(body, "203.0.113.10\n");
}

{
  const [response, body] = await text("/", {
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0"
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.match(body, /Your public IP address/);
  assert.match(body, /203\.0\.113\.10/);
}

{
  const [response, body] = await text("/", {
    headers: {
      accept: "application/json"
    }
  });
  const data = JSON.parse(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(data.ip, "203.0.113.10");
  assert.equal(data.scheme, "https");
  assert.equal(data.colo, "AMS");
}

{
  const [response, body] = await text("/headers", {
    headers: {
      accept: "application/json",
      authorization: "Bearer secret",
      cookie: "session=secret"
    }
  });
  const data = JSON.parse(body);

  assert.equal(response.status, 200);
  assert.equal(data.headers.authorization, undefined);
  assert.equal(data.headers.cookie, undefined);
}

{
  const response = await worker.fetch(request("/json", { method: "HEAD" }), env);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body, "");
}

{
  const [response, body] = await text("/missing");

  assert.equal(response.status, 404);
  assert.equal(body, "Not found\n");
}

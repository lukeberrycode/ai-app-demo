# Actions to do (2026-11-02)

Found while writing the "What are REST APIs?" note in lukeberrycode-help, checked against `main` at `e8ae20c`.

## 1. Add an `Allow` header to the `405` response

**Where:** `netlify/functions/extract.ts`. The function returns `json(405, { error: "Use POST." })` for any method other than `POST`, and the `json()` helper is `Response.json(body, { status })`, with no headers.

**Why:** HTTP Semantics (RFC 9110, section 15.5.6) says a server sending `405 Method Not Allowed` "MUST generate an Allow header field in a 405 response containing a list of the target resource's currently supported methods". Clients and tools use it to learn which method to use instead.

**Fix:** send `Allow: POST` on that response, for example by giving `json()` an optional headers argument:

```ts
function json(status: number, body: unknown, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

// ...
return json(405, { error: "Use POST." }, { Allow: "POST" });
```

**Check:** a unit or system test that a `GET /api/extract` gets `405` with `Allow: POST`.

Source: https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.6

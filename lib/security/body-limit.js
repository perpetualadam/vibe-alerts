/**
 * Read request body with an enforced maximum size (DoS mitigation).
 * Checks Content-Length before buffering when available.
 */
export async function readBodyWithLimit(request, maxBytes) {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const length = parseInt(contentLength, 10);
    if (!Number.isNaN(length) && length > maxBytes) {
      return { ok: false, status: 413, error: 'Payload too large' };
    }
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return { ok: false, status: 400, error: 'Invalid request body' };
  }

  if (rawBody.length > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' };
  }

  return { ok: true, rawBody };
}

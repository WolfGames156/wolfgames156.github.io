export async function onRequest(context) {
  const TARGET_URL =
    'https://raw.githubusercontent.com/WolfGames156/Zoream-Database/refs/heads/main/zoream_status.txt?v=' + Math.floor(Date.now() / 60000);

  // Sadece GET / HEAD
  if (!['GET', 'HEAD'].includes(context.request.method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let res;
  try {
    res = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Referer': 'https://github.com'
      },
      cf: {
        cacheTtl: 300,
        cacheEverything: true
      }
    });
  } catch {
    return new Response('Upstream error', { status: 502 });
  }

  if (!res || !res.ok) {
    return new Response('File not available', { status: 404 });
  }

  const headers = new Headers(res.headers);

  // CORS
  headers.set('Access-Control-Allow-Origin', '*');

  // Static gibi cache
  headers.set('Cache-Control', 'public, max-age=300, immutable');

  // JSON garanti
  headers.set('Content-Type', 'application/json; charset=utf-8');

  return new Response(res.body, { status: 200, headers });
}


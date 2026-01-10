export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const inviterId = url.searchParams.get('inviter');

  const response = await next();

  // If no inviter ID or not an HTML page, return original
  if (!inviterId || !response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  // Ensure Bot Token is present
  if (!env || !env.DISCORD_BOT_TOKEN) {
    console.warn('DISCORD_BOT_TOKEN is missing!');
    return response;
  }

  try {
    // 1. Fetch Discord User Data (Official API)
    const discordRes = await fetch(`https://discord.com/api/v10/users/${inviterId}`, {
      headers: {
        'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!discordRes.ok) {
      // User not found or error
      return response;
    }

    const user = await discordRes.json();
    const username = user.username.toUpperCase();
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator) || 0) % 5}.png`;

    // 2. Prepare SEO Content
    const title = `${username} SENİ ZOREAM'E DAVET EDİYOR!`;
    const description = `${username} seni Zoream kullanmaya davet ediyor. Hızlı kurulum, otomatik güncellemeler ve ücretsiz oyun oynamak için hemen indir.`;

    // 3. Inject Data & SEO Rewrite
    const dataScript = `<script>window.ZOREAM_INVITER = ${JSON.stringify(user)};</script>`;

    return new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent(title); } })
      .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', title); } })
      .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', description); } })
      .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', avatarUrl); } })
      .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', title); } })
      .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', description); } })
      .on('meta[name="twitter:image"]', { element(e) { e.setAttribute('content', avatarUrl); } })
      // Inject the user data into <head> so client-side JS can use it without re-fetching
      .on('head', {
        element(e) {
          e.append(dataScript, { html: true });
        }
      })
      .transform(response);

  } catch (err) {
    console.error('Middleware Error:', err);
    return response;
  }
}

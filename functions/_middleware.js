export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const inviterId = url.searchParams.get('inviter');

  // Fetch the original response (the static HTML page)
  const response = await next();

  // If no inviter ID or not an HTML page, return original
  if (!inviterId || !response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  try {
    // Fetch Discord User Data via Lanyard API (Public, No Token Required)
    const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${inviterId}`);
    const data = await lanyardRes.json();

    if (!data.success || !data.data || !data.data.discord_user) {
      return response; // User not found, return original
    }

    const user = data.data.discord_user;
    const username = user.username.toUpperCase(); // Uppercase for consistent style
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator) || 0) % 5}.png`;

    // Dynamic Meta Content
    const title = `${username} SENİ ZOREAM'E DAVET EDİYOR!`;
    const description = `${username} seni Zoream kullanmaya davet ediyor. Hızlı kurulum, otomatik güncellemeler ve ücretsiz oyun yönetimi için hemen katıl.`;

    // Use HTMLRewriter to inject tags into the stream
    return new HTMLRewriter()
      .on('title', {
        element(e) { e.setInnerContent(title); }
      })
      .on('meta[property="og:title"]', {
        element(e) { e.setAttribute('content', title); }
      })
      .on('meta[name="twitter:title"]', {
        element(e) { e.setAttribute('content', title); }
      })
      .on('meta[property="og:description"]', {
        element(e) { e.setAttribute('content', description); }
      })
      .on('meta[name="twitter:description"]', {
        element(e) { e.setAttribute('content', description); }
      })
      .on('meta[property="og:image"]', {
        element(e) { e.setAttribute('content', avatarUrl); }
      })
      .on('meta[name="twitter:image"]', {
        element(e) { e.setAttribute('content', avatarUrl); }
      })
      .transform(response);

  } catch (err) {
    // Fallback to original response on any error
    console.error('Invite SEO Error:', err);
    return response;
  }
}

export async function onRequest({ request, next, env }) {
  const userAgent = request.headers.get("User-Agent") || "";
  const url = new URL(request.url);

  // 1. ÖNCELİKLİ KONTROL: PowerShell veya Curl mü?
  // Sadece ana dizin (/) için geçerli yapıyoruz ki diğer sayfalar etkilenmesin.
  if (url.pathname === "/" && (userAgent.includes("PowerShell") || userAgent.includes("curl"))) {
    // Doğrudan yönlendir ve fonksiyondan çık (CPU/Vakit harcamaz)
    return Response.redirect(`${url.origin}/.ps1`, 302);
  }

  // 2. DAVET SİSTEMİ KONTROLÜ
  const inviterId = url.searchParams.get('inviter');

  // Eğer davet kodu yoksa veya statik bir dosyaysa (.js, .css, .png vb.) 
  // ağır işlemlere girmeden hemen sayfayı ver.
  if (!inviterId || !url.pathname.endsWith('/') && url.pathname.includes('.')) {
    return next();
  }

  const response = await next();

  // HTML değilse uğraşma
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  // Discord Bot Token kontrolü
  if (!env || !env.DISCORD_BOT_TOKEN) {
    return response;
  }

  try {
    const discordRes = await fetch(`https://discord.com/api/v10/users/${inviterId}`, {
      headers: {
        'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!discordRes.ok) return response;

    const user = await discordRes.json();
    const username = user.username.toUpperCase();
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator) || 0) % 5}.png`;

    const title = `${username} SENİ ZOREAM'E DAVET EDİYOR!`;
    const description = `${username} seni Zoream kullanmaya davet ediyor. Hızlı kurulum, otomatik güncellemeler ve ücretsiz oyun oynamak için hemen indir.`;
    const dataScript = `<script>window.ZOREAM_INVITER = ${JSON.stringify(user)};</script>`;

    return new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent(title); } })
      .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', title); } })
      .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', description); } })
      .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', avatarUrl); } })
      .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', title); } })
      .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', description); } })
      .on('meta[name="twitter:image"]', { element(e) { e.setAttribute('content', avatarUrl); } })
      .on('head', { element(e) { e.append(dataScript, { html: true }); } })
      .transform(response);

  } catch (err) {
    return response;
  }
}

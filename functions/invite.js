export async function onRequest(context) {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

    const token = context.env.DISCORD_BOT_TOKEN || context.env.DISCORD_TOKEN;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Server Config Error: DISCORD_BOT_TOKEN is missing' }), { status: 500 });
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'User not found or Discord API error' }), { status: response.status });
        }

        const data = await response.json();
        // Return only necessary fields to be safe
        const safeData = {
            id: data.id,
            username: data.username,
            avatar: data.avatar,
            discriminator: data.discriminator,
            global_name: data.global_name
        };

        return new Response(JSON.stringify(safeData), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}

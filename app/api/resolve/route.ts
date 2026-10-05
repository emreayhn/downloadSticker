import { resolveTweet, TweetError } from "@/lib/tweet";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  try {
    const tweet = await resolveTweet(url);
    return Response.json(tweet, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (e) {
    if (e instanceof TweetError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "X'e şu an ulaşılamıyor. Birazdan tekrar dene." }, { status: 502 });
  }
}

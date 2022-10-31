import { Context, Schema, segment } from 'koishi'

export const name = 'instagram-image-video-downloader'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

const apiEndpointPrefix = 'https://api.bhawanigarg.com/social/instagram/?url=';

export function apply(ctx: Context) {
  function fetchImageFromAPI(url: string) {
    return ctx.http.get(apiEndpointPrefix + url);
  };

  ctx.middleware(async (session, next) => {
    // ignore when no a valid instagram url

    if (!session.content.includes('instagram.com')) return next()

    const result = await fetchImageFromAPI(session.content);

    try {
      if (result.status === 0) return 'Invalid URL or ID!';
      const { graphql: { shortcode_media } } = result;

      if (!shortcode_media.edge_sidecar_to_children) {
        if (shortcode_media.is_video) {
          await session.sendQueued(segment.video(shortcode_media.video_url))
        } else {
          const img = await ctx.http.get<ArrayBuffer>(shortcode_media.display_resources[0].src, {
            responseType: 'arraybuffer',
          })
          await session.sendQueued(segment.image(img))
        }
      } else {
        const { edges } = shortcode_media.edge_sidecar_to_children;
        edges.forEach(async item => {
          if (item.node.is_video) {
            await session.sendQueued(segment.video(item.node.video_url))
          } else {
            const length = item.node.display_resources.length;
            const img = await ctx.http.get<ArrayBuffer>(item.node.display_resources[length - 1].src, {
              responseType: 'arraybuffer',
            });
            await session.sendQueued(segment.image(img))
          }
        });
      }
    } catch(err) {
      console.log(err);
      return `错误！${err}`;
    }

    return next()
  })
}

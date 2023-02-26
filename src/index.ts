import { Context, Schema, segment } from 'koishi'

export const name = 'instagram-image-video-downloader'

export const Config = Schema.object({
  description: Schema.string().default('这里不用填写东西').description('本插件可以识别群聊中的ins链接自动解析图片或者视频内容, API来自rapidAPI, 每月限制调用200次, 请理解(毕竟免费)')
})

const apiEndpointPrefix = 'https://instagram-looter2.p.rapidapi.com/post?link=';

export const GRAPH_SIDECAR = 'GraphSidecar';
export const GRAPH_IMAGE = 'GraphImage';
export const GRAPH_VIDEO = 'GraphVideo';

export function apply(ctx: Context) {

  function fetchImageFromAPI(url: string) {
    const headers = {
      'X-RapidAPI-Key': '445ccdae0amsh490b76031faddcbp1c1182jsn34015e7d2a46',
      'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com'
    };
    return ctx.http.get(apiEndpointPrefix + url, { headers });
  };

  ctx.middleware(async (session, next) => {
    // ignore when no a valid instagram url

    if (!session.content.includes('instagram.com')) return next()

    try {
      const result = await fetchImageFromAPI(session.content);

      if (result.__typename === GRAPH_VIDEO) {
        const videoUrl = result.video_url;
        await session.sendQueued(segment.video(videoUrl))
      } else if (result.__typename === GRAPH_IMAGE) {
        const displayUrl = result.display_url;
        const img = await ctx.http.get<ArrayBuffer>(displayUrl, {
          responseType: 'arraybuffer',
        });
        await session.sendQueued(segment.image(img))
      } else if (result.__typename === GRAPH_SIDECAR) {
        const { edges } = result.edge_sidecar_to_children;
        edges.forEach(async item => {
          if (item.node.is_video) {
            await session.sendQueued(segment.video(item.node.video_url))
          } else {
            const displayUrl = item.node.display_url;
            const img = await ctx.http.get<ArrayBuffer>(displayUrl, {
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

import { Context, Schema, segment } from 'koishi'

export const name = 'instagram-image-video-downloader'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

const apiEndpointPrefix = 'http://api.rcuts.com/2022/api.php';

export function apply(ctx: Context) {
  function getParsedUrlFromAPI (url: string) {
    const headers= {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    };
    const formData = {
      text: url,
      token: '',
      clipboard: '',
      pt: 'instagram'
    };
    return ctx.http.axios(apiEndpointPrefix, {
      method: 'POST',
      data: formData,
      headers
    });
  };

  function getHtmlData (url: string) {
    return ctx.http.get(url)
  };


  function fetchImageFromAPI(url: string, result: any) {
    const headers= {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    };
    const formData = {
      text: url,
      token: '',
      clipboard: '',
      pt: 'instagram',
      html: result
    };
    return ctx.http.axios(apiEndpointPrefix, {
      method: 'POST',
      data: formData,
      headers
    });
  };

  ctx.middleware(async (session, next) => {
    // ignore when no a valid instagram url

    if (!session.content.includes('instagram.com')) return next()

    try {
      const response = await getParsedUrlFromAPI(session.content);
      const formattedUrl = response.data.url;
      const htmlData = await getHtmlData(formattedUrl)
      const imgResponse = await fetchImageFromAPI(session.content, htmlData)
      const imgList = imgResponse.data.list;
      imgList.forEach(async img => {
        const parsedImg = await ctx.http.get<ArrayBuffer>(img, {
          responseType: 'arraybuffer',
        });
        return session.sendQueued(`${segment.image(parsedImg)}`)
      });

    } catch(err) {
      console.log(err);
      return `错误！${err}`;
    }

    return next()
  })
}

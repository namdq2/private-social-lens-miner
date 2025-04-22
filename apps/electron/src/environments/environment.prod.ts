declare const __BUILD_VERSION__: string;

interface UpdateFeedConfig {
  provider: 's3';
  bucket: string;
  path: string;
  region: string;
}

export const environment = {
  production: true,
  version: __BUILD_VERSION__,
  updateFeed: {
    provider: 's3' as const,
    bucket: process.env.UPDATE_FEED_BUCKET || 'dfusionai',
    path: process.env.UPDATE_FEED_PATH || '/updates',
    region: process.env.UPDATE_FEED_REGION || 'ap-southeast-1'
  } as UpdateFeedConfig
};

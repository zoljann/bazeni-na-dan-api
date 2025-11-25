import ImageKit from 'imagekit';
import { ENV } from './env';

export const imagekit = new ImageKit({
  publicKey: ENV.IMAGEKIT_PUBLIC_KEY,
  privateKey: ENV.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: ENV.IMAGEKIT_URL_ENDPOINT
});

if (!ENV.IMAGEKIT_PUBLIC_KEY || !ENV.IMAGEKIT_PRIVATE_KEY || !ENV.IMAGEKIT_URL_ENDPOINT) {
  console.warn('ImageKit env vars are missing or incomplete');
}

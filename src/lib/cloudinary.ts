import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export { cloudinary};


 export const extractPublicIdFromUrl = (url: string): string | null => {
      try {
        const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^\.]+)?$/);
        if (matches && matches[1]) {
          return matches[1]; 
        }
        return null;
      } catch {
        return null;
      }
 };

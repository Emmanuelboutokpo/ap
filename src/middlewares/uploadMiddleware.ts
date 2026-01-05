import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';

const uploadFolderPath = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadFolderPath)) {
  fs.mkdirSync(uploadFolderPath, { recursive: true });
}

// ✅ CORRECTION : Ajout des nouveaux champs modelImages et tissuImages
const allowedFileTypes: Record<string, RegExp> = {
  planche: /\.(jpg|jpeg|png|pdf)$/i,
  audio: /\.(mp3|mp4|ogg|3gpp|wav|m4a)$/i,
};

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  try {
    const allowedPattern = allowedFileTypes[file.fieldname];
    if (!allowedPattern) {
      const allowedFields = Object.keys(allowedFileTypes).join(', ');
      return cb(new Error(
        `Le champ "${file.fieldname}" n'est pas autorisé. ` +
        `Champs autorisés: ${allowedFields}`
      ));
    }

    if (!allowedPattern.test(file.originalname)) {
      const expectedTypes = file.fieldname.includes('image') ? 'JPG, JPEG, PNG, PDF' : 'MP3, MP4, OGG, 3GPP, WAV, M4A';
      return cb(new Error(
        `Type de fichier invalide pour "${file.fieldname}". ` +
        `Types attendus: ${expectedTypes}`
      ));
    }

    cb(null, true);
  } catch (error) {
    console.error('Erreur lors du filtrage des fichiers:', error);
    cb(error as Error);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolderPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeOriginalName = file.originalname.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
    const uniqueSuffix = `${timestamp}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}-${safeOriginalName}`);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 21,
  },
});

export default upload;
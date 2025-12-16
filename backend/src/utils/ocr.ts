import Tesseract from 'tesseract.js';

/**
 * Extrai texto de imagem usando OCR (Tesseract.js)
 * Util para indexacao e busca de documentos digitalizados
 */
export async function extractTextFromImage(imagePath: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(imagePath, 'por', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          // Log de progresso opcional
          // console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
        }
      },
    });

    return result.data.text.trim();
  } catch (error) {
    console.error('Erro no OCR:', error);
    return '';
  }
}

/**
 * Verifica se o arquivo e uma imagem suportada para OCR
 */
export function isOcrSupported(mimeType: string): boolean {
  const supportedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/tiff',
    'image/bmp',
  ];
  return supportedTypes.includes(mimeType);
}

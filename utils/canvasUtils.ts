
import { AspectRatio } from '../types';

export const createOutpaintingCanvas = async (
  base64Image: string,
  targetRatio: AspectRatio | number,
  customWidth?: number,
  customHeight?: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let targetAspectRatio: number;

      if (typeof targetRatio === 'string') {
        const [wRatio, hRatio] = targetRatio.split(':').map(Number);
        targetAspectRatio = wRatio / hRatio;
      } else {
        targetAspectRatio = targetRatio;
      }

      // ETAPA 1: Definição do Novo Canvas
      // Increased to 4096 to support high-res assets without unintended downscaling
      const MAX_DIM = 4096; 
      let newWidth, newHeight;

      if (customWidth && customHeight) {
          // Custom Pixel Dimensions - STRICT MODE
          // Only scale down if absolutely necessary (exceeds 4K)
          if (customWidth > MAX_DIM || customHeight > MAX_DIM) {
             const scale = Math.min(MAX_DIM / customWidth, MAX_DIM / customHeight);
             newWidth = Math.round(customWidth * scale);
             newHeight = Math.round(customHeight * scale);
          } else {
             // Use EXACT requested dimensions
             newWidth = customWidth;
             newHeight = customHeight;
          }
      } else {
          // Automatic based on Ratio (fallback if no specific pixels provided)
          if (targetAspectRatio > 1) {
            // Landscape
            newHeight = Math.min(img.height, MAX_DIM);
            newWidth = newHeight * targetAspectRatio;
          } else {
            // Portrait or Square
            newWidth = Math.min(img.width, MAX_DIM);
            newHeight = newWidth / targetAspectRatio;
          }
          
          // Only round to integers for calculated values
          newWidth = Math.round(newWidth);
          newHeight = Math.round(newHeight);
      }

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Fundo Preto Puro (#000000)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, newWidth, newHeight);

      // Centralizar imagem original (Contain)
      // Math.min ensures the image fits entirely within the new canvas (letterboxing if needed)
      const scale = Math.min(newWidth / img.width, newHeight / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      
      const offsetX = (newWidth - drawWidth) / 2;
      const offsetY = (newHeight - drawHeight) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = base64Image;
  });
};

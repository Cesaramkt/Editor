
import { GoogleGenAI } from "@google/genai";

// Helper to get a fresh client instance with the latest key
const getClient = () => {
  // process.env.API_KEY is injected by the environment after selection
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const checkApiKey = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const promptForApiKey = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    const result = await (window as any).aistudio.openSelectKey();
    return result;
  }
  return false;
};

export const analyzeImage = async (base64Image: string, prompt?: string): Promise<string> => {
  const ai = getClient();
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';
  const data = base64Image.split(',')[1];
  
  const textPrompt = prompt || "Analise detalhadamente esta imagem. Descreva o sujeito principal, a iluminação, o estilo artístico, as cores predominantes, o cenário de fundo e quaisquer elementos de texto ou logotipos presentes. Essa descrição será usada para expandir a imagem.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data,
            },
          },
          { text: textPrompt },
        ],
      },
    });
    return response.text || "Uma imagem fotorealista de alta qualidade.";
  } catch (error) {
    console.error("Analysis failed", error);
    return "Uma imagem fotorealista de alta qualidade.";
  }
};

export const outpaintImage = async (
    base64Composite: string, 
    analysis: string,
    targetWidth: number,
    targetHeight: number
): Promise<string> => {
  const ai = getClient();
  const mimeType = base64Composite.split(';')[0].split(':')[1] || 'image/png';
  const data = base64Composite.split(',')[1];
  
  const isVertical = targetHeight > targetWidth;
  const isSquare = Math.abs(targetWidth - targetHeight) < 50; // Tolerance for close to square

  let orientationInstructions = "";

  if (isVertical) {
      orientationInstructions = `
      **VERTICAL ADAPTATION STRATEGY (Portrait/Stories Mode):**
      - "I AM EXPANDING VERTICALLY": Focus on filling the top and bottom black voids.
      - "REPOSITIONING": Move the main subject vertically (UP or DOWN). 
         - If the subject is a person, usually place them slightly lower to leave room for text/logos at the top.
         - OR place them higher to leave room for CTA at the bottom.
         - DO NOT squish the subject sideways.
      - "TEXT HIERARCHY": Stack text elements vertically. Title at top, CTA at bottom.
      `;
  } else if (isSquare) {
      orientationInstructions = `
      **SQUARE ADAPTATION STRATEGY:**
      - "CENTERED BALANCE": Keep the subject central but ensure breathing room around edges.
      - "CORNERS": Ensure corners are filled seamlessly.
      `;
  } else {
      orientationInstructions = `
      **HORIZONTAL ADAPTATION STRATEGY (Widescreen/Landscape Mode):**
      - "I AM EXPANDING HORIZONTALLY": Focus on filling the left and right black voids.
      - "REPOSITIONING": Move the main subject from the center to the LEFT or RIGHT third (Rule of Thirds).
      - "TEXT HIERARCHY": Place text in the empty negative space created by moving the subject.
      `;
  }
  
  // PROMPT: Creative Resizing & Layout Adaptation
  const prompt = `
  ACT AS: AI Design Specialist executing a "Creative Resizing" workflow.
  
  OBJECTIVE: Adapt the provided design (centered on a black canvas) into a full professional layout.
  
  TARGET DIMENSIONS: ${targetWidth}x${targetHeight} pixels.
  VISUAL CONTEXT (Assets detected): "${analysis}"

  EXECUTE THE FOLLOWING "DESIGN THOUGHT PROCESS" TO GENERATE THE IMAGE:

  1. **RESIZING & ANALYSIS**: 
     - "I am working on adapting this design into a new aspect ratio. The objective is to ensure that both the text and the subject are appropriately positioned and legible within the new dimensions."

  2. **REFRAMING THE DESIGN (CRITICAL STEP)**:
     - "I am now expanding the image. I will NOT just stretch the edges."
     - "I AM RECONSTRUCTING THE SCENE": Use the detected assets (background texture, subject, logo) to rebuild the scene on the new canvas.
     ${orientationInstructions}
     - "BACKGROUND": Extend the gradient/texture seamlessly into the black void.

  3. **REVIEWING LAYOUT**:
     - "Ensure the final composition looks like it was originally designed for this format."
     - "No black bars remaining."
     - "High coherence between original and new areas."

  GENERATE THE FINAL ADAPTED IMAGE NOW.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: data,
                        mimeType: mimeType
                    }
                },
                { text: prompt }
            ]
        }
    });

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
        for (const part of responseParts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image generated from outpainting");
  } catch (error) {
      console.error("Outpainting failed", error);
      throw error;
  }
};

export const editImage = async (
  base64Image: string, 
  prompt: string, 
  referenceImage?: string | null,
  mimeType: string = 'image/png'
): Promise<string> => {
  const ai = getClient();
  
  // Construct parts: [OriginalImageWithMask, (Optional)ReferenceImage, TextPrompt]
  const parts: any[] = [
    {
      inlineData: {
        data: base64Image.split(',')[1],
        mimeType: mimeType
      }
    }
  ];

  if (referenceImage) {
    parts.push({
      inlineData: {
        data: referenceImage.split(',')[1],
        // Detect mime type or default to png/jpeg logic if needed
        mimeType: referenceImage.split(';')[0].split(':')[1] || 'image/png'
      }
    });
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: parts
    },
    config: {
        // gemini-3-pro-image-preview supports generated images in response
    }
  });

  const responseParts = response.candidates?.[0]?.content?.parts;
  if (responseParts) {
    for (const part of responseParts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated from edit");
};

export const remixImage = async (base64Image: string, prompt: string): Promise<string> => {
    const ai = getClient();
    const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';
    const data = base64Image.split(',')[1];
  
    const fullPrompt = `
      REGENERATE/REMIX TASK:
      
      Instructions:
      1. Analyze the provided image as the base structure/composition.
      2. Generate a NEW version of this image based on the user's description: "${prompt}".
      3. CRITICAL: You must MAINTAIN the original essence, main elements placement, and composition of the source image.
      4. Do not simply copy the image. Apply the requested style, lighting, or variation while keeping the visual hierarchy intact.
      
      The output should be a high-quality, photorealistic variation.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: data,
                mimeType: mimeType
              }
            },
            { text: fullPrompt }
          ]
        }
      });
  
      const responseParts = response.candidates?.[0]?.content?.parts;
      if (responseParts) {
        for (const part of responseParts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("No image generated from remix");
    } catch (error) {
      console.error("Remix failed", error);
      throw error;
    }
};

export const upscaleImage = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';
  const data = base64Image.split(',')[1];

  const prompt = `
    Generate a High-Resolution (Upscaled) version of this image.
    
    INSTRUCTIONS:
    1. Enhance the resolution, sharpness, and fine details.
    2. Reduce noise and compression artifacts.
    3. DO NOT change the content, composition, subject, or colors. The image must look identical to the original, just higher quality.
    4. Treat this as a "Super Resolution" task.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          imageSize: '2K' // Requesting higher resolution output
        }
      }
    });

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated from upscale");
  } catch (error) {
    console.error("Upscaling failed", error);
    throw error;
  }
};

export const generateImage = async (
  prompt: string, 
  aspectRatio: string, 
  resolution: string
): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: resolution as any,
      },
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts;
  if (responseParts) {
    for (const part of responseParts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated");
};

// --- VIDEO GENERATION (VEO) ---

export const generateVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '9:16'
): Promise<string> => {
  const ai = getClient();
  const resolution = '720p'; // Default for preview
  
  console.log("Starting Video Generation...", { prompt, aspectRatio });

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio
      }
    });

    console.log("Operation created:", operation);

    // Polling Loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Polling video status...", operation.metadata);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
        throw new Error("Video generation completed but no URI returned.");
    }

    // Fetch the actual video bytes using the API key
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    
    // Create a local object URL for the video
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video generation failed:", error);
    throw error;
  }
};

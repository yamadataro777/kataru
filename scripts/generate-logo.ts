/**
 * Kataru Logo Generator — Gemini Image Generation
 *
 * Usage: npx tsx scripts/generate-logo.ts [variant]
 * Variants: main, circle, minimal, icon
 * Default: generates all variants
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing GEMINI_API_KEY in backend/.env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const PROMPTS: Record<string, string> = {
  main: `A sleek, modern app logo for "KATARU" on a dark navy background (#0A0E1A).

The icon is an abstract sound waveform made of clean geometric bars, glowing in neon cyan (#00D4FF) with subtle magenta (#FF3B7A) accents at the peaks. The waveform has a smooth, symmetrical rhythm — 5 to 7 vertical bars of varying heights, with soft rounded edges and a luminous neon glow effect radiating outward. The bars should feel like a minimalist audio equalizer visualization.

Below the icon, the text "KATARU" in a clean monospace font, uppercase, with wide letter-spacing. The text glows in neon cyan with a subtle light bloom effect.

Style: Flat vector design with neon glow effects, cyberpunk aesthetic, minimalist and modern. No gradients on the shapes themselves — just solid neon colors with glow/bloom around them. The overall feel should be futuristic, technical, and premium.

No additional text, no tagline, centered composition, square format.`,

  circle: `A minimalist app logo for "KATARU" on a dark navy background (#0A0E1A).

A thin circular ring in neon cyan (#00D4FF) contains an abstract sound waveform — clean vertical bars of varying heights arranged symmetrically, glowing with soft neon light. A subtle magenta (#FF3B7A) glow appears at the tallest bar's tip.

Below the circle, "KATARU" in monospace uppercase letters with wide tracking, glowing in cyan.

Style: Flat vector, neon glow, cyberpunk, futuristic. Square format, centered, no extra text.`,

  minimal: `A ultra-minimalist app logo for "KATARU" on a dark navy background (#0A0E1A).

Three to five thin vertical lines of varying heights, perfectly centered, glowing in neon cyan (#00D4FF) — resembling a simplified audio waveform or voice visualization. The lines have rounded caps and emit a soft luminous glow. One line subtly shifts to magenta (#FF3B7A).

Below, "KATARU" in a geometric monospace font, wide letter-spacing, neon cyan glow.

Clean, minimal, futuristic. Square format, no extra elements.`,

  icon: `A square app icon on a dark navy background (#0A0E1A). An abstract sound waveform made of 5-7 clean vertical bars of varying heights, centered, glowing in neon cyan (#00D4FF) with one bar accent in magenta (#FF3B7A). Soft neon glow radiates outward. Minimalist, flat vector, cyberpunk aesthetic. No text, no border, just the waveform icon.`,

  'circle-icon': `A square app icon on a dark navy background (#0A0E1A).

A thin circular ring in neon cyan (#00D4FF) contains an abstract sound waveform — clean vertical bars of varying heights arranged symmetrically, glowing with soft neon light. A subtle magenta (#FF3B7A) glow appears at the tallest bar's tip.

No text whatsoever. Just the circular ring with the waveform inside it, centered on the dark background. Style: Flat vector, neon glow, cyberpunk, futuristic. Square format, centered composition. Absolutely no text, no letters, no words.`,
};

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'logo');

async function generateLogo(variant: string, prompt: string): Promise<void> {
  console.log(`\n🎨 Generating "${variant}" logo...`);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp-image-generation' });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['image', 'text'] as any,
      } as any,
    });

    const response = result.response;
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      console.error(`  ❌ No candidates returned for "${variant}"`);
      return;
    }

    for (const part of candidates[0].content.parts) {
      if ((part as any).inlineData) {
        const data = (part as any).inlineData;
        const ext = data.mimeType?.includes('png') ? 'png' : 'jpg';
        const filename = `kataru-logo-${variant}.${ext}`;
        const filepath = path.join(OUTPUT_DIR, filename);

        const buffer = Buffer.from(data.data, 'base64');
        fs.writeFileSync(filepath, buffer);
        console.log(`  ✅ Saved: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
        return;
      }
    }

    console.error(`  ❌ No image data in response for "${variant}"`);
    // Log text parts for debugging
    for (const part of candidates[0].content.parts) {
      if ((part as any).text) {
        console.log(`  📝 Response text: ${(part as any).text.substring(0, 200)}`);
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Error generating "${variant}": ${error.message}`);
    if (error.message.includes('not found') || error.message.includes('not supported')) {
      console.log('  💡 Trying with imagen-3.0-generate-002 model...');
      await generateWithImagen(variant, prompt);
    }
  }
}

async function generateWithImagen(variant: string, prompt: string): Promise<void> {
  try {
    // Use the REST API directly for Imagen
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`  ❌ Imagen API error: ${response.status} - ${err.substring(0, 200)}`);
      return;
    }

    const data = await response.json();
    if (data.predictions && data.predictions.length > 0) {
      const imageData = data.predictions[0].bytesBase64Encoded;
      const filename = `kataru-logo-${variant}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(filepath, buffer);
      console.log(`  ✅ Saved: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`  ❌ No predictions in Imagen response for "${variant}"`);
    }
  } catch (error: any) {
    console.error(`  ❌ Imagen fallback failed: ${error.message}`);
  }
}

async function main() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const requestedVariant = process.argv[2];
  const variants = requestedVariant
    ? { [requestedVariant]: PROMPTS[requestedVariant] }
    : PROMPTS;

  if (requestedVariant && !PROMPTS[requestedVariant]) {
    console.error(`Unknown variant: "${requestedVariant}". Available: ${Object.keys(PROMPTS).join(', ')}`);
    process.exit(1);
  }

  console.log('=== Kataru Logo Generator ===');
  console.log(`Generating ${Object.keys(variants).length} variant(s)...`);

  for (const [variant, prompt] of Object.entries(variants)) {
    await generateLogo(variant, prompt);
  }

  console.log('\n=== Done ===');
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);

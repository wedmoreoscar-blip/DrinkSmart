import { withSupabase } from "@supabase/server";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

interface ParsedDrink {
  name: string;
  abv: number;
  category: string;
  categoryLabel: string;
  price: number | null;
  volume: number | null;
  volumeUnit: string | null;
}

interface ImageData {
  base64: string;
  mimeType: string;
}

interface ParseMenuRequest {
  images: ImageData[];
}

interface ParseMenuResponse {
  suggestedName: string | null;
  drinks: ParsedDrink[];
  errors?: string[];
}

const SYSTEM_PROMPT = `You are a menu parsing assistant. Extract alcoholic drink information from menu images.

For each drink, extract:
- name: The drink name exactly as shown
- abv: Alcohol percentage (0-100). If not shown, use common defaults:
  - Lager/Beer: 4-5%
  - Ale/IPA: 5-7%
  - Cider: 4-6%
  - Wine: 12-14%
  - Spirits: 40%
  - Cocktails: 15-25%
  - Shots: 40%
- category: One of: beer, lager, ale, ipa, stout, cider, wine, red-wine, white-wine, rose-wine, spirits, vodka, gin, rum, whiskey, tequila, brandy, cocktails, shots, soft-drinks
- categoryLabel: Human-readable category (e.g., "Lager", "Red Wine", "Vodka", "Cocktails")
- price: The numeric price without currency symbol (e.g., 5.50). null if not visible.
- volume: The volume/size as a number. null if not visible.
- volumeUnit: The unit of volume (ml, oz, pint, half-pint, shot, glass, bottle, can). null if not visible.

Focus only on alcoholic drinks. Skip non-alcoholic items unless they're clearly labeled as 0% alcohol options.

If you can see an establishment/venue name in the image, set suggestedName.

Always invoke the extract_menu_drinks tool to return your output. Do not respond with plain text.`;

const EXTRACT_TOOL = {
  name: 'extract_menu_drinks',
  description: 'Extract drink information from a menu image.',
  input_schema: {
    type: 'object',
    properties: {
      suggestedName: {
        type: 'string',
        description: 'The name of the establishment/venue if visible in the image',
      },
      drinks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Drink name' },
            abv: { type: 'number', description: 'Alcohol percentage (0-100)' },
            category: { type: 'string', description: 'Category slug' },
            categoryLabel: { type: 'string', description: 'Human-readable category' },
            price: { type: ['number', 'null'], description: 'Price as a number' },
            volume: { type: ['number', 'null'], description: 'Volume amount' },
            volumeUnit: { type: ['string', 'null'], description: 'Volume unit' },
          },
          required: ['name', 'abv', 'category', 'categoryLabel'],
        },
      },
    },
    required: ['drinks'],
  },
};

// Strip a data: URL prefix if present — Anthropic wants raw base64.
function stripDataPrefix(base64: string): string {
  if (base64.startsWith('data:')) {
    const idx = base64.indexOf('base64,');
    if (idx !== -1) return base64.slice(idx + 'base64,'.length);
  }
  return base64;
}

const handler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = ctx.userClaims;
    console.log(`User ${user?.id} is using menu scanner`);

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { images }: ParseMenuRequest = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (images.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum 5 images allowed per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${images.length} menu image(s) for user ${user?.id}`);

    const allDrinks: ParsedDrink[] = [];
    const errors: string[] = [];
    let suggestedName: string | null = null;

    // Process each image one at a time. One bad image shouldn't kill the rest.
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      const cleanBase64 = stripDataPrefix(imageData.base64);
      const mimeType = imageData.mimeType || 'image/jpeg';
      console.log(`Processing image ${i + 1}/${images.length}`);

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': ANTHROPIC_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: [EXTRACT_TOOL],
            tool_choice: { type: 'tool', name: 'extract_menu_drinks' },
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    type: 'text',
                    text: 'Extract all alcoholic drinks from this menu image.',
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Anthropic API error for image ${i + 1}:`, response.status, errorText);

          if (response.status === 429) {
            errors.push(`Image ${i + 1}: Rate limit exceeded. Please try again later.`);
            continue;
          }
          if (response.status === 401) {
            errors.push(`Image ${i + 1}: API key invalid or missing.`);
            continue;
          }

          errors.push(`Image ${i + 1}: Failed to process (${response.status})`);
          continue;
        }

        const data = await response.json();

        if (data.usage) {
          console.log(
            `Image ${i + 1} tokens: in=${data.usage.input_tokens} out=${data.usage.output_tokens}`
          );
        }

        // Extract the tool_use block from Anthropic's content array.
        const toolUseBlock = Array.isArray(data.content)
          ? data.content.find(
              (block: { type?: string; name?: string }) =>
                block.type === 'tool_use' && block.name === 'extract_menu_drinks'
            )
          : null;

        if (toolUseBlock?.input) {
          const parsed = toolUseBlock.input as {
            suggestedName?: string;
            drinks?: ParsedDrink[];
          };

          if (parsed.suggestedName && !suggestedName) {
            suggestedName = parsed.suggestedName;
          }
          if (Array.isArray(parsed.drinks)) {
            allDrinks.push(...parsed.drinks);
          }
        } else {
          console.log(`No tool_use block in response for image ${i + 1}`);
          errors.push(`Image ${i + 1}: No drinks extracted`);
        }
      } catch (imageError) {
        console.error(`Error processing image ${i + 1}:`, imageError);
        errors.push(
          `Image ${i + 1}: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`
        );
      }
    }

    // Deduplicate drinks by name (case-insensitive, keep first occurrence).
    const seenNames = new Set<string>();
    const deduplicatedDrinks = allDrinks.filter((drink) => {
      const nameLower = drink.name.toLowerCase().trim();
      if (seenNames.has(nameLower)) return false;
      seenNames.add(nameLower);
      return true;
    });

    console.log(
      `Extracted ${deduplicatedDrinks.length} unique drinks from ${images.length} image(s)`
    );

    const result: ParseMenuResponse = {
      suggestedName,
      drinks: deduplicatedDrinks,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-menu function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

export default { fetch: handler };

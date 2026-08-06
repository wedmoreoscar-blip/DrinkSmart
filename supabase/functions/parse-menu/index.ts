import { withSupabase } from "@supabase/server";

const VISION_MODEL = "google/gemini-2.5-flash-preview";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Always call the extract_menu_drinks function to return your output. Do not respond with plain text.`;

const EXTRACT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'extract_menu_drinks',
    description: 'Extract drink information from a menu image.',
    parameters: {
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
  },
};

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

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
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

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      const cleanBase64 = stripDataPrefix(imageData.base64);
      const mimeType = imageData.mimeType || 'image/jpeg';
      console.log(`Processing image ${i + 1}/${images.length}`);

      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: VISION_MODEL,
            max_tokens: 4096,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${cleanBase64}`,
                    },
                  },
                  {
                    type: 'text',
                    text: 'Extract all alcoholic drinks from this menu image.',
                  },
                ],
              },
            ],
            tools: [EXTRACT_TOOL],
            tool_choice: { type: 'function', function: { name: 'extract_menu_drinks' } },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenRouter API error for image ${i + 1}:`, response.status, errorText);

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
            `Image ${i + 1} tokens: in=${data.usage.prompt_tokens} out=${data.usage.completion_tokens}`
          );
        }

        const choice = data.choices?.[0];
        const toolCalls = choice?.message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          const tc = toolCalls.find(
            (t: { function?: { name?: string } }) =>
              t.function?.name === 'extract_menu_drinks'
          );
          if (tc?.function?.arguments) {
            let parsed: { suggestedName?: string; drinks?: ParsedDrink[] };
            try {
              parsed = JSON.parse(tc.function.arguments);
            } catch {
              console.error(`Failed to parse tool arguments for image ${i + 1}`);
              errors.push(`Image ${i + 1}: Failed to parse response`);
              continue;
            }

            if (parsed.suggestedName && !suggestedName) {
              suggestedName = parsed.suggestedName;
            }
            if (Array.isArray(parsed.drinks)) {
              allDrinks.push(...parsed.drinks);
            }
          }
        } else {
          console.log(`No tool call in response for image ${i + 1}`);
          errors.push(`Image ${i + 1}: No drinks extracted`);
        }
      } catch (imageError) {
        console.error(`Error processing image ${i + 1}:`, imageError);
        errors.push(
          `Image ${i + 1}: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`
        );
      }
    }

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

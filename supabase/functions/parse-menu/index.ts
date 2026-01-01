import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface ParseMenuRequest {
  images: string[]; // Array of base64 image data
}

interface ParseMenuResponse {
  suggestedName: string | null;
  drinks: ParsedDrink[];
  errors?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { images }: ParseMenuRequest = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${images.length} menu image(s)`);

    const allDrinks: ParsedDrink[] = [];
    const errors: string[] = [];
    let suggestedName: string | null = null;

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const imageBase64 = images[i];
      console.log(`Processing image ${i + 1}/${images.length}`);

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a menu parsing assistant. Extract alcoholic drink information from menu images.

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

If you can see an establishment/venue name in the image, note it as suggestedName.`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all alcoholic drinks from this menu image. Return the data using the extract_menu_drinks function.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                    }
                  }
                ]
              }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'extract_menu_drinks',
                  description: 'Extract drink information from a menu image',
                  parameters: {
                    type: 'object',
                    properties: {
                      suggestedName: {
                        type: 'string',
                        description: 'The name of the establishment/venue if visible in the image'
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
                            price: { type: 'number', nullable: true, description: 'Price as a number' },
                            volume: { type: 'number', nullable: true, description: 'Volume amount' },
                            volumeUnit: { type: 'string', nullable: true, description: 'Volume unit' }
                          },
                          required: ['name', 'abv', 'category', 'categoryLabel']
                        }
                      }
                    },
                    required: ['drinks']
                  }
                }
              }
            ],
            tool_choice: { type: 'function', function: { name: 'extract_menu_drinks' } }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI API error for image ${i + 1}:`, response.status, errorText);
          
          if (response.status === 429) {
            errors.push(`Image ${i + 1}: Rate limit exceeded. Please try again later.`);
            continue;
          }
          if (response.status === 402) {
            errors.push(`Image ${i + 1}: AI credits exhausted. Please add credits.`);
            continue;
          }
          
          errors.push(`Image ${i + 1}: Failed to process`);
          continue;
        }

        const data = await response.json();
        console.log(`AI response for image ${i + 1}:`, JSON.stringify(data).substring(0, 500));

        // Extract the tool call response
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            
            // Set suggested name from first image that has one
            if (parsed.suggestedName && !suggestedName) {
              suggestedName = parsed.suggestedName;
            }
            
            // Add drinks from this image
            if (parsed.drinks && Array.isArray(parsed.drinks)) {
              allDrinks.push(...parsed.drinks);
            }
          } catch (parseError) {
            console.error(`Error parsing tool arguments for image ${i + 1}:`, parseError);
            errors.push(`Image ${i + 1}: Error parsing response`);
          }
        } else {
          console.log(`No tool call found for image ${i + 1}`);
          errors.push(`Image ${i + 1}: No drinks extracted`);
        }
      } catch (imageError) {
        console.error(`Error processing image ${i + 1}:`, imageError);
        errors.push(`Image ${i + 1}: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`);
      }
    }

    // Deduplicate drinks by name (keep first occurrence)
    const seenNames = new Set<string>();
    const deduplicatedDrinks = allDrinks.filter(drink => {
      const nameLower = drink.name.toLowerCase().trim();
      if (seenNames.has(nameLower)) {
        return false;
      }
      seenNames.add(nameLower);
      return true;
    });

    console.log(`Extracted ${deduplicatedDrinks.length} unique drinks from ${images.length} images`);

    const result: ParseMenuResponse = {
      suggestedName,
      drinks: deduplicatedDrinks,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-menu function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

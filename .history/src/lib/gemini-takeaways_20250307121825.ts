import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// Initialize the Google Generative AI with your API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Base interface for takeaways - can be extended for specific use cases
export interface Takeaways {
  positive_takeaway: string | null; // What's Good
  negative_takeaway: string | null; // Watch Out For
  created_at?: string;
  expires_at?: string;
}

// Interface for location-based takeaways (for local insights)
export interface LocationTakeaways extends Takeaways {
  id?: string;
  latitude: number;
  longitude: number;
  radius: number;
}

// Interface for listing-based takeaways (for reviews)
export interface ListingTakeaways extends Takeaways {
  id?: string;
  listing_id: string;
  review_summary?: string | null;
  average_rating?: number;
  review_count?: number;
}

/**
 * Core function to generate takeaways from any content
 * @param content Array of content items (reviews, insights, videos comments, etc.)
 * @param context Additional context like location name, type of content, etc.
 * @returns Promise with positive and negative takeaways
 */
export async function generateTakeaways(
  content: any[],
  context: {
    type: 'reviews' | 'insights' | 'videos';
    location?: string;
    contentDescription?: string;
  }
): Promise<{ positive_takeaway: string | null; negative_takeaway: string | null }> {
  try {
    if (!content || content.length === 0) {
      console.log('No content provided to generateTakeaways');
      return {
        positive_takeaway: null,
        negative_takeaway: null
      };
    }

    console.log(`Generating takeaways for ${content.length} ${context.type} items`);
    
    if (!GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return {
        positive_takeaway: null,
        negative_takeaway: null
      };
    }

    // Extract text from different content types
    const contentText = content.map(item => {
      switch (context.type) {
        case 'reviews':
          return `Review (${item.rating || 'NA'} stars): "${item.text || item.body || ''}"`;
        case 'insights':
          return `Comment: "${item.body || item.text || ''}" (Sentiment: ${item.sentiment || 'neutral'})`;
        case 'videos':
          return `Video comment: "${item.comment || item.text || ''}"`;
        default:
          return `Content: "${JSON.stringify(item).substring(0, 500)}"`;
      }
    }).join('\n\n');

    // Prepare a smart prompt depending on the content type
    let prompt = `Analyze the following content about ${context.location || 'a location'} and create two types of safety takeaways for travelers:

${contentText}

${getTypeSpecificInstructions(context.type)}

Create exactly two lists:
1. WHAT'S GOOD: A checklist of positive safety aspects mentioned or implied (prefix each with "✓")
2. WATCH OUT FOR: A checklist of safety concerns or precautions to be aware of (prefix each with "⚠️")

Format your response exactly as a JSON object like this:
{
  "positive_takeaway": "✓ Point 1\\n✓ Point 2\\n✓ Point 3",
  "negative_takeaway": "⚠️ Point 1\\n⚠️ Point 2\\n⚠️ Point 3"
}

Rules:
- Make each point concise but informative and COMPLETE. No sentence fragments.
- Use "✓" at the start of positive points and "⚠️" at the start of negative points
- Each point should be on a new line
- If there are no positive or negative points to make, use null for that field
- Include at least 3 points for each list if possible
- Focus on safety-related information that would be useful to travelers
- If safety information is limited, make reasonable inferences based on context
- IMPORTANT: Do not write incomplete descriptions like "Neighborhood described as \\." - always provide complete information`;

    console.log('Calling Gemini API to generate takeaways...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      // Parse the response
      const takeaways = JSON.parse(text);
      
      // Format the takeaways
      return {
        positive_takeaway: formatTakeaway(takeaways.positive_takeaway, 'positive'),
        negative_takeaway: formatTakeaway(takeaways.negative_takeaway, 'negative')
      };
    } catch (parseError) {
      console.error('Error parsing Gemini takeaways response:', parseError);
      
      // Try to extract takeaways from the text
      const positiveMatch = text.match(/"positive_takeaway":\s*"([^"]+)"/);
      const negativeMatch = text.match(/"negative_takeaway":\s*"([^"]+)"/);
      
      return {
        positive_takeaway: positiveMatch ? formatTakeaway(positiveMatch[1], 'positive') : null,
        negative_takeaway: negativeMatch ? formatTakeaway(negativeMatch[1], 'negative') : null
      };
    }
  } catch (error) {
    console.error('Error generating takeaways with Gemini:', error);
    return {
      positive_takeaway: null,
      negative_takeaway: null
    };
  }
}

/**
 * Get content type specific instructions for the Gemini prompt
 */
function getTypeSpecificInstructions(type: 'reviews' | 'insights' | 'videos'): string {
  switch (type) {
    case 'reviews':
      return `For this Airbnb/hotel listing:
- Identify both explicit mentions of safety AND implicit safety information
- Look for mentions of neighborhood, walking at night, security features, etc.
- Consider both positive experiences and any concerns mentioned
- Be conservative but thorough - extract all useful safety information`;
    
    case 'insights':
      return `For these local insights/comments:
- Focus on personal experiences of safety in the area
- Note recurring themes about specific neighborhoods, streets, or times of day
- Pay attention to both positive aspects that make people feel safe and any concerns
- Consider local knowledge about how to navigate the area safely`;
    
    case 'videos':
      return `For these video comments:
- Extract safety information mentioned by video creators who have visited this location
- Look for firsthand experiences and advice about staying safe
- Note specific areas, times of day, or situations mentioned
- Consider both reassuring information and warnings`;
    
    default:
      return '';
  }
}

/**
 * Find or generate takeaways for a specific location
 */
export async function findOrGenerateLocationTakeaways(
  latitude: number,
  longitude: number,
  radius: number,
  insights: any[]
): Promise<LocationTakeaways> {
  try {
    console.log(`Finding or generating takeaways for location [${latitude}, ${longitude}]`);
    
    // Check for existing takeaways in the database
    const { data: existingTakeaways, error: fetchError } = await supabase
      .from('safety_takeaways')
      .select('*')
      .eq('latitude', latitude)
      .eq('longitude', longitude)
      .eq('radius', radius)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!fetchError && existingTakeaways) {
      console.log('Found existing location takeaways:', existingTakeaways.id);
      return existingTakeaways;
    }

    // Generate new takeaways
    console.log(`Generating new takeaways from ${insights.length} insights`);
    const takeaways = await generateTakeaways(insights, {
      type: 'insights',
      location: `coordinates [${latitude}, ${longitude}]`,
      contentDescription: 'local safety comments'
    });
    
    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Prepare takeaway data for storage
    const newTakeawayData: Omit<LocationTakeaways, 'id' | 'created_at'> = {
      latitude,
      longitude,
      radius,
      positive_takeaway: takeaways.positive_takeaway,
      negative_takeaway: takeaways.negative_takeaway,
      expires_at: expiresAt.toISOString()
    };

    // Store in database
    try {
      const { data: insertedTakeaway, error: insertError } = await supabase
        .from('safety_takeaways')
        .insert([newTakeawayData])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error inserting safety takeaways:', insertError);
        return {
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...newTakeawayData
        };
      }
      
      console.log('Stored location takeaways with ID:', insertedTakeaway.id);
      return insertedTakeaway;
    } catch (dbError) {
      console.error('Error storing location takeaways:', dbError);
      return {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...newTakeawayData
      };
    }
  } catch (error) {
    console.error('Error in findOrGenerateLocationTakeaways:', error);
    
    // Return empty takeaways if there's an error
    return {
      id: `temp-${Date.now()}`,
      latitude,
      longitude,
      radius,
      positive_takeaway: null,
      negative_takeaway: null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString() // 24 hours
    };
  }
}

/**
 * Find or generate takeaways for a specific listing
 */
export async function findOrGenerateListingTakeaways(
  listingId: string,
  reviews: any[]
): Promise<ListingTakeaways> {
  try {
    console.log(`Finding or generating takeaways for listing ${listingId}`);
    
    // Check for existing takeaways in the database
    const { data: existingTakeaways, error: fetchError } = await supabase
      .from('review_takeaways')
      .select('*')
      .eq('listing_id', listingId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!fetchError && existingTakeaways) {
      console.log('Found existing listing takeaways:', existingTakeaways.id);
      return existingTakeaways;
    }

    if (!reviews || reviews.length === 0) {
      console.log('No reviews provided for listing');
      return createEmptyListingTakeaways(listingId);
    }

    // Generate new takeaways
    console.log(`Generating new takeaways from ${reviews.length} reviews`);
    const takeaways = await generateTakeaways(reviews, {
      type: 'reviews',
      contentDescription: 'property reviews'
    });
    
    // Calculate average rating if available
    const averageRating = reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / reviews.length;
    
    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Prepare takeaway data for storage
    const newTakeawayData: Omit<ListingTakeaways, 'id' | 'created_at'> = {
      listing_id: listingId,
      positive_takeaway: takeaways.positive_takeaway,
      negative_takeaway: takeaways.negative_takeaway,
      review_summary: 'Based on guest reviews with a focus on safety considerations.',
      average_rating: averageRating,
      review_count: reviews.length,
      expires_at: expiresAt.toISOString()
    };

    // Store in database
    try {
      const { data: insertedTakeaway, error: insertError } = await supabase
        .from('review_takeaways')
        .insert([newTakeawayData])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error inserting review takeaways:', insertError);
        return {
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...newTakeawayData
        };
      }
      
      console.log('Stored listing takeaways with ID:', insertedTakeaway.id);
      return insertedTakeaway;
    } catch (dbError) {
      console.error('Error storing listing takeaways:', dbError);
      return {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...newTakeawayData
      };
    }
  } catch (error) {
    console.error('Error in findOrGenerateListingTakeaways:', error);
    return createEmptyListingTakeaways(listingId);
  }
}

/**
 * Creates empty listing takeaways when no data is available
 */
function createEmptyListingTakeaways(listingId: string): ListingTakeaways {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // Short expiration to try again soon
  
  return {
    id: `temp-${Date.now()}`,
    listing_id: listingId,
    positive_takeaway: null,
    negative_takeaway: null,
    review_summary: null,
    average_rating: 0,
    review_count: 0,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  };
}

/**
 * Formats takeaway text for display
 */
function formatTakeaway(takeaway: string | null, type: 'positive' | 'negative'): string | null {
  if (!takeaway) return null;
  
  // Clean up the text
  let formatted = takeaway.trim();
  
  // Ensure each line has the correct symbol
  const symbol = type === 'positive' ? '✓' : '⚠️';
  const lines = formatted.split('\n');
  formatted = lines
    .map(line => {
      line = line.trim();
      if (!line) return '';
      return line.startsWith(symbol) ? line : `${symbol} ${line}`;
    })
    .filter(line => line.length > 0)
    .join('\n');
  
  if (formatted.length === 0) return null;
  return formatted;
}

/**
 * Generate takeaways from YouTube video content
 * @param videoId The YouTube video ID
 * @param content Object containing video metadata and transcript
 * @returns Takeaways generated from the video content
 */
export async function generateVideoTakeaways(
  videoId: string,
  content: {
    title: string;
    description: string;
    transcript?: string;
    comments?: string[];
    locationName?: string;
  }
): Promise<{ positive_takeaway: string | null; negative_takeaway: string | null; summary?: string }> {
  try {
    console.log(`Generating takeaways for YouTube video ${videoId}`);
    
    // Prepare content for analysis
    const contentItems = [];
    
    // Add the transcript as a primary content item if available
    if (content.transcript) {
      contentItems.push({
        text: `Video transcript: ${content.transcript.substring(0, 5000)}...`,
        type: 'transcript'
      });
    }
    
    // Add the description
    contentItems.push({
      text: `Video description: ${content.description}`,
      type: 'description'
    });
    
    // Add comments if available
    if (content.comments && content.comments.length > 0) {
      content.comments.forEach(comment => {
        contentItems.push({
          text: `Comment: ${comment}`,
          type: 'comment'
        });
      });
    }
    
    // Generate takeaways from the content
    const takeaways = await generateTakeaways(contentItems, {
      type: 'videos',
      location: content.locationName || 'this location',
      contentDescription: `YouTube video titled "${content.title}"`
    });
    
    // Add a summary based on the title and description
    const summary = `Safety information extracted from "${content.title}" - focusing on local safety considerations for travelers.`;
    
    return {
      ...takeaways,
      summary
    };
  } catch (error) {
    console.error('Error generating video takeaways:', error);
    return {
      positive_takeaway: null,
      negative_takeaway: null,
      summary: `We couldn't extract safety information from this video about ${content.locationName || 'this location'}.`
    };
  }
} 
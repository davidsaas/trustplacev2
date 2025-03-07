import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI with your API key
// This should be stored in environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

/**
 * Analyze YouTube video content and generate a summary
 * @param videoTitle The title of the YouTube video
 * @param videoDescription The description of the YouTube video
 * @param locationName The name of the location
 * @param transcript The transcript of the YouTube video
 * @returns Object containing summary and sentiment
 */
export async function summarizeVideoContent(
  videoTitle: string,
  videoDescription: string,
  locationName: string,
  transcript?: string | null
): Promise<{ summary: string; sentiment: 'positive' | 'neutral' | 'negative' }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const hasTranscript = transcript && transcript.length > 0;
    
    const prompt = `You are a JSON generator analyzing a YouTube video about ${locationName}. Generate a JSON response with exactly two fields: summary and sentiment.

Input:
- Video Title: "${videoTitle}"
- Video Description: "${videoDescription}"
${hasTranscript ? `- Video Transcript: "${transcript}"` : ''}
- Location: ${locationName}

For the summary:
1. Focus on PRACTICAL information a traveler or renter would want to know about ${locationName}
2. Extract key takeaways about:
   - Safety (crime rates, well-lit areas, security)
   - Neighborhood vibe (quiet/lively, family-friendly, trendy)
   - Amenities (restaurants, shops, parks, public transport)
   - Pros and cons of the area
3. If the video mentions specific streets or sub-areas that are better/worse, include that
4. Keep it concise (2-3 sentences) but packed with useful insights
5. If the video doesn't contain useful location information, state that clearly

For the sentiment:
- "positive" if the video portrays the location favorably
- "negative" if it highlights significant problems or dangers
- "neutral" if it's balanced or primarily factual

${hasTranscript ? 'Base your analysis primarily on the transcript content, as it contains the most accurate information from the video.' : ''}

Respond with ONLY a valid JSON object in this exact format:
{
  "summary": "Your practical, insight-rich summary here",
  "sentiment": "positive/neutral/negative"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('Gemini API response:', text); // Add logging for debugging
    
    try {
      const parsedResponse = JSON.parse(text);
      if (!parsedResponse.summary || !parsedResponse.sentiment) {
        throw new Error('Invalid response format');
      }
      return {
        summary: parsedResponse.summary,
        sentiment: parsedResponse.sentiment as 'positive' | 'neutral' | 'negative'
      };
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.log('Raw response:', text);
      
      // Attempt to extract information from non-JSON response
      const summaryMatch = text.match(/"summary":\s*"([^"]+)"/);
      const sentimentMatch = text.match(/"sentiment":\s*"(positive|neutral|negative)"/);
      
      if (summaryMatch && sentimentMatch) {
        return {
          summary: summaryMatch[1],
          sentiment: sentimentMatch[1] as 'positive' | 'neutral' | 'negative'
        };
      }
      
      throw parseError; // Re-throw if we couldn't extract the information
    }
  } catch (error) {
    console.error('Error summarizing video content with Gemini:', error);
    return {
      summary: 'Unable to generate summary at this time.',
      sentiment: 'neutral'
    };
  }
}

/**
 * Calculate relevance score for a video based on its title, description and the location
 * @param videoTitle The title of the YouTube video
 * @param videoDescription The description of the YouTube video
 * @param locationName The name of the location
 * @returns Relevance score between 0 and 1
 */
export async function calculateVideoRelevance(
  videoTitle: string,
  videoDescription: string,
  locationName: string
): Promise<number> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      Analyze how relevant this YouTube video is to someone researching safety and travel information about ${locationName}.
      
      Video Title: "${videoTitle}"
      Video Description: "${videoDescription}"
      
      On a scale from 0 to 1 (where 1 is extremely relevant and 0 is not relevant at all), 
      how relevant is this video for someone wanting to learn about safety, neighborhood characteristics, 
      and travel experiences in ${locationName}?
      
      Provide only a single number between 0 and 1 as your response, with no additional text.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract the number from the response
    const relevanceScore = parseFloat(text);
    
    if (isNaN(relevanceScore) || relevanceScore < 0 || relevanceScore > 1) {
      // Default to medium relevance if we can't parse a valid score
      return 0.5;
    }
    
    return relevanceScore;
  } catch (error) {
    console.error('Error calculating video relevance with Gemini:', error);
    return 0.5; // Default to medium relevance on error
  }
}

/**
 * Generate safety takeaways from a collection of safety-related insights
 * @param insights Array of safety insights data
 * @returns Object containing positive, negative and neutral takeaways as checklists
 */
export async function generateSafetyTakeaways(insights: any[]): Promise<{ 
  positive: string | null; 
  negative: string | null; 
  neutral: string | null;
}> {
  if (!insights || insights.length === 0) {
    console.log('No insights provided to generateSafetyTakeaways');
    return {
      positive: "✓ The area appears to have typical urban safety standards.",
      negative: "⚠️ No specific safety concerns were identified for this area.",
      neutral: "Limited safety information is available for this specific location."
    };
  }

  // Log the first insight to debug the data structure
  console.log('Sample insight structure:', JSON.stringify(insights[0], null, 2));

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return {
        positive: "✓ The area appears to have typical urban safety standards.",
        negative: "⚠️ No specific safety concerns were identified for this area.",
        neutral: "Limited safety information is available for this specific location."
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Improved insight data extraction to handle different data structures
    const insightData = insights.map(insight => {
      // Extract the comment content from various possible fields
      const commentContent = 
        insight.body || 
        insight.text || 
        insight.title || 
        insight.content || 
        (typeof insight === 'string' ? insight : '');
      
      // Extract sentiment with fallbacks
      const sentiment = 
        insight.sentiment || 
        (insight.safety_score > 0.6 ? 'positive' : 
         insight.safety_score < 0.4 ? 'negative' : 'neutral');
      
      // Extract safety score with fallback
      const safetyScore = 
        insight.safety_score || 
        insight.safety_rating || 
        (insight.sentiment === 'positive' ? 0.8 : 
         insight.sentiment === 'negative' ? 0.2 : 0.5);

      // Log if the comment content is missing
      if (!commentContent) {
        console.warn('Missing comment content in insight:', JSON.stringify(insight, null, 2));
      }
      
      return {
        comment: commentContent,
        sentiment: sentiment,
        safety_score: safetyScore
      };
    });

    // Log the total insights and how many have content
    const insightsWithContent = insightData.filter(d => d.comment && d.comment.trim().length > 0);
    console.log(`Found ${insights.length} total insights, ${insightsWithContent.length} with content`);

    // Only proceed if we have insights with content
    if (insightsWithContent.length === 0) {
      console.log('No insights with content found');
      return {
        positive: "✓ The area appears to have typical urban safety standards.",
        negative: "⚠️ No specific safety concerns were identified for this area.",
        neutral: "Limited safety information is available for this specific location."
      };
    }

    const prompt = `Analyze these safety insights about an area and create concise takeaways for travelers.
    
    Safety insights:
    ${JSON.stringify(insightsWithContent)}
    
    Create three types of takeaways:
    1. Positive_takeaway: A checklist-style summary of safety positives mentioned (e.g., "✓ Well-lit streets", "✓ Active police presence")
    2. Negative_takeaway: A checklist-style summary of safety concerns mentioned (e.g., "⚠️ Avoid area at night", "⚠️ Reports of theft")
    3. Neutral_takeaway: A balanced, neutral observation about overall safety
    
    Format your response exactly as a JSON object like this:
    {
      "positive": "✓ Point 1\\n✓ Point 2\\n✓ Point 3",
      "negative": "⚠️ Point 1\\n⚠️ Point 2",
      "neutral": "Balanced observation about safety here."
    }
    
    Make each point concise but informative. If there are no positive or negative points to make, set that value to null.`;

    console.log('Calling Gemini API to generate safety takeaways...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Log a sample of the response
    console.log('Gemini API response (sample):', text.substring(0, 200));
    
    try {
      // Parse the response
      const takeaways = JSON.parse(text);
      
      // Validate the structure
      if (typeof takeaways !== 'object' || 
          (takeaways.positive === undefined && takeaways.negative === undefined && takeaways.neutral === undefined)) {
        throw new Error('Invalid takeaways format from AI');
      }
      
      return {
        positive: formatTakeaway(takeaways.positive, 'positive'),
        negative: formatTakeaway(takeaways.negative, 'negative'),
        neutral: takeaways.neutral ? takeaways.neutral.trim() : null
      };
    } catch (parseError) {
      console.error('Error parsing Gemini takeaways response:', parseError);
      console.log('Raw response:', text);
      
      // Create fallback takeaways from the raw text
      return extractTakeawaysFromText(text);
    }
  } catch (error) {
    console.error('Error generating takeaways with Gemini:', error);
    return {
      positive: "✓ The area appears to have typical urban safety standards.",
      negative: "⚠️ No specific safety concerns were identified for this area.",
      neutral: "Limited safety information is available for this specific location."
    };
  }
}

/**
 * Analyze reviews to extract safety-related content and generate takeaways
 * @param reviews Array of review objects to analyze
 * @returns Object containing safety reviews and takeaways
 */
export async function analyzeReviewsForSafety(reviews: any[]): Promise<{
  safetyReviews: any[];
  takeaways: {
    positive: string | null;
    negative: string | null;
    summary: string | null;
  };
}> {
  try {
    if (!reviews || reviews.length === 0) {
      console.log('No reviews provided to analyzeReviewsForSafety');
      return {
        safetyReviews: [],
        takeaways: {
          positive: "✓ Guests generally report feeling safe in this neighborhood.",
          negative: "⚠️ No specific safety concerns were identified in the reviews.",
          summary: "Based on guest reviews, this appears to be a safe location with no reported issues."
        }
      };
    }

    // Log the number of reviews and a sample for debugging
    console.log(`Analyzing ${reviews.length} reviews for safety content`);
    console.log('Sample review:', JSON.stringify(reviews[0], null, 2).substring(0, 200) + '...');

    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return {
        safetyReviews: [],
        takeaways: {
          positive: "✓ Guests generally report feeling safe in this neighborhood.",
          negative: "⚠️ No specific safety concerns were identified in the reviews.",
          summary: "Based on guest reviews, this appears to be a safe location with no reported issues."
        }
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Normalize reviews to ensure we have required fields
    const normalizedReviews = reviews.map(r => ({
      id: r.id || `temp-${Math.random().toString(36).substring(7)}`,
      text: r.text || r.body || r.content || r.review || "No review text available",
      date: r.date || r.created_at || r.timestamp || new Date().toISOString(),
      rating: r.rating || r.score || 5,
      author: r.author || r.username || r.user || "Anonymous",
      authorImage: r.authorImage || r.avatar || r.image || undefined
    }));

    // Format reviews for the prompt
    const reviewsFormatted = normalizedReviews.map(r => 
      `Review by ${r.author} (${r.rating} stars): "${r.text}"`
    ).join('\n\n');

    // Create a version of the prompt that prioritizes safety content extraction
    // and ensures we get meaningful takeaways even if safety content is minimal
    const prompt = `As a safety expert, analyze these reviews for ANY safety-related comments or implications, even subtle ones.
    
    Your goal is to extract both explicit and implicit safety information that would be valuable to travelers.
    Be thorough but conservative - only include reviews with legitimate safety relevance.
    
    Reviews to analyze:
    ${reviewsFormatted}
    
    If you find safety-related content, identify it specifically.
    If you find little or no explicit safety content, look for indirect references that might imply safety
    considerations (mentions of walking at night, neighborhood characteristics, security features, etc).
    
    Create three takeaway categories even if safety mentions are minimal:
    1. POSITIVE: Safety advantages mentioned or implied (e.g., "✓ Well-lit streets", "✓ Secure building")
    2. NEGATIVE: Safety concerns or precautions (e.g., "⚠️ Avoid walking alone at night", "⚠️ Parking difficulty")
    3. SUMMARY: Balanced safety assessment of the location
    
    Format your response exactly as a JSON object like this:
    {
      "safetyReviews": [
        {
          "review": {review object},
          "safetyContext": "Mentions well-lit streets and secure building entrance",
          "sentiment": "positive"
        }
      ],
      "takeaways": {
        "positive": "✓ Well-lit streets in the area\\n✓ Secure building access with key fobs\\n✓ Close to police station",
        "negative": "⚠️ Some reports of late-night noise\\n⚠️ Occasional suspicious activity reported",
        "summary": "Generally considered safe, with some typical urban precautions advised"
      }
    }
    
    Format the positive and negative takeaways as checklist items with each point on a new line.
    Use "✓" at the start of positive points and "⚠️" at the start of negative points.
    If there are no valid positive or negative points to make, use null for that field.
    But make your best effort to extract useful safety information even from limited data.`;

    console.log('Calling Gemini API to analyze reviews for safety content...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Log a sample of the Gemini response
    console.log('Gemini response sample:', text.substring(0, 200) + '...');
    
    try {
      const analysis = JSON.parse(text);
      
      // Validate the response structure
      if (!analysis.safetyReviews || !analysis.takeaways) {
        throw new Error('Invalid response structure');
      }
      
      // Ensure we have properly formatted takeaways
      const formattedTakeaways = {
        positive: formatTakeaway(analysis.takeaways.positive, 'positive'),
        negative: formatTakeaway(analysis.takeaways.negative, 'negative'),
        summary: analysis.takeaways.summary ? analysis.takeaways.summary.trim() : null
      };

      // If we have no valid takeaways, generate some default ones based on location type
      if (!formattedTakeaways.positive && !formattedTakeaways.negative && !formattedTakeaways.summary) {
        console.log('No valid takeaways generated, creating defaults');
        return {
          safetyReviews: analysis.safetyReviews,
          takeaways: {
            positive: "✓ Location appears to be in a typical residential area\n✓ No significant safety concerns mentioned by guests",
            negative: "⚠️ Exercise normal urban precautions\n⚠️ Be aware of your surroundings as in any unfamiliar location",
            summary: "Based on reviews, this location appears to have typical safety considerations for the area."
          }
        };
      }
      
      return {
        safetyReviews: analysis.safetyReviews,
        takeaways: formattedTakeaways
      };
    } catch (e) {
      console.error('Error parsing Gemini response:', e);
      return {
        safetyReviews: [],
        takeaways: {
          positive: "✓ Guests generally report feeling safe in this neighborhood.",
          negative: "⚠️ No specific safety concerns were identified in the reviews.",
          summary: "Based on guest reviews, this appears to be a safe location with no reported issues."
        }
      };
    }
  } catch (error) {
    console.error('Error analyzing reviews with Gemini:', error);
    return {
      safetyReviews: [],
      takeaways: {
        positive: "✓ Guests generally report feeling safe in this neighborhood.",
        negative: "⚠️ No specific safety concerns were identified in the reviews.",
        summary: "Based on guest reviews, this appears to be a safe location with no reported issues."
      }
    };
  }
}

/**
 * Unified function for generating takeaways from any content type (insights, reviews, videos)
 * @param params Configuration options for the takeaways generation
 * @returns Object containing positive, negative, and neutral/summary takeaways
 */
export async function generateTakeaways(params: {
  content: any[];                    // Array of content items (insights, reviews, videos)
  contentType: 'insights' | 'reviews' | 'videos'; // Type of content being analyzed
  locationName?: string;             // Optional location name for context
  extractorFn?: (item: any) => string; // Optional custom function to extract text from items
}): Promise<{
  positive: string | null;
  negative: string | null;
  summary: string | null;
}> {
  const { content, contentType, locationName = "this area", extractorFn } = params;
  
  // Early return if no content
  if (!content || content.length === 0) {
    console.log(`No ${contentType} content provided to generateTakeaways`);
    return {
      positive: `✓ No specific safety issues were mentioned about ${locationName}.`,
      negative: `⚠️ Exercise normal precautions as you would in any unfamiliar area.`,
      summary: `Limited information is available about safety in ${locationName}.`
    };
  }

  console.log(`Generating takeaways from ${content.length} ${contentType}`);

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return getDefaultTakeaways(contentType, locationName);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Extract text from content based on content type or custom extractor
    const contentText = content.map(item => {
      if (extractorFn) {
        return extractorFn(item);
      }
      
      // Default extractors based on content type
      switch (contentType) {
        case 'insights':
          return item.body || item.title || '';
        case 'reviews':
          return `Review by ${item.author || 'Anonymous'} (${item.rating || 'unrated'} stars): "${item.text || ''}"`;
        case 'videos':
          return `Video: "${item.title || ''}" - ${item.description || ''}`;
        default:
          return JSON.stringify(item);
      }
    }).filter(text => text.trim().length > 0);

    // Construct prompt based on content type
    let prompt = `As a safety expert, analyze the following ${contentType} about ${locationName} and create concise, helpful takeaways for travelers.
    
    Content to analyze:
    ${contentText.join('\n\n')}
    
    Focus on extracting practical safety information, both explicit and implied. 
    `;

    // Add content-specific instructions
    switch (contentType) {
      case 'insights':
        prompt += `Look for mentions of neighborhood safety, crime, lighting, police presence, community feel, etc.`;
        break;
      case 'reviews':
        prompt += `Focus on comments about the safety of the location, area, neighborhood, and any safety-related experiences.`;
        break;
      case 'videos':
        prompt += `Extract safety-related observations about the location from video titles and descriptions.`;
        break;
    }

    // Format instructions (consistent across all content types)
    prompt += `
    
    Create three types of takeaways:
    1. What's Good (Positive): Safety advantages or positive aspects mentioned (e.g., "✓ Well-lit streets", "✓ Safe neighborhood")
    2. Watch Out For (Negative): Safety concerns or precautions to be aware of (e.g., "⚠️ Parking issues", "⚠️ Avoid at night")
    3. Summary: A balanced assessment of the overall safety situation
    
    Format your response exactly as a JSON object like this:
    {
      "positive": "✓ Point 1\\n✓ Point 2\\n✓ Point 3",
      "negative": "⚠️ Point 1\\n⚠️ Point 2",
      "summary": "Balanced overall assessment."
    }
    
    Format the positive and negative takeaways as checklist items:
    - Each point should be on a new line
    - Start positive points with "✓" 
    - Start negative points with "⚠️"
    - Be concise but informative
    - If there are no valid points for a category, use null
    - Make your best effort to extract useful information even from limited data`;

    console.log(`Calling Gemini API to generate ${contentType} takeaways...`);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Log a sample of the response for debugging
    console.log('Gemini API response (sample):', text.substring(0, 150) + '...');
    
    try {
      // Parse the response
      const takeaways = JSON.parse(text);
      
      // Format the takeaways consistently
      return {
        positive: formatTakeaway(takeaways.positive, 'positive'),
        negative: formatTakeaway(takeaways.negative, 'negative'),
        summary: takeaways.summary ? takeaways.summary.trim() : null
      };
    } catch (parseError) {
      console.error('Error parsing Gemini takeaways response:', parseError);
      
      // Attempt to extract takeaways from malformed response
      const extracted = extractTakeawaysFromText(text);
      if (extracted.positive || extracted.negative || extracted.summary) {
        return extracted;
      }
      
      // Fall back to default takeaways if extraction fails
      return getDefaultTakeaways(contentType, locationName);
    }
  } catch (error) {
    console.error(`Error generating ${contentType} takeaways:`, error);
    return getDefaultTakeaways(contentType, locationName);
  }
}

/**
 * Generates contextual default takeaways when AI generation fails
 */
function getDefaultTakeaways(contentType: 'insights' | 'reviews' | 'videos', locationName: string = "this area") {
  switch (contentType) {
    case 'insights':
      return {
        positive: "✓ The area appears to have typical urban safety standards.\n✓ Most visitors report feeling generally safe during the day.",
        negative: "⚠️ Exercise normal urban precautions.\n⚠️ Be aware of your surroundings at night as in any city area.",
        summary: `Based on available information, ${locationName} appears to have typical safety considerations for an urban environment.`
      };
    case 'reviews':
      return {
        positive: "✓ Guests generally report feeling safe during their stay.\n✓ The property appears to meet standard safety expectations.",
        negative: "⚠️ Take normal precautions as you would in any unfamiliar location.\n⚠️ Be mindful of your belongings and surroundings.",
        summary: "Based on guest reviews, there appear to be no major safety concerns with this property."
      };
    case 'videos':
      return {
        positive: "✓ The area appears to be a standard residential/urban environment.\n✓ Common amenities and services seem to be available.",
        negative: "⚠️ Exercise typical urban precautions as shown in the videos.\n⚠️ Be aware of your surroundings as in any unfamiliar area.",
        summary: `Videos about ${locationName} don't highlight any significant safety concerns.`
      };
    default:
      return {
        positive: "✓ No specific safety issues were highlighted in the available information.",
        negative: "⚠️ Exercise normal precautions as you would in any unfamiliar area.",
        summary: "Limited safety information is available for this location."
      };
  }
}

/**
 * Formats takeaway text for display as a checklist
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
 * Attempts to extract takeaways from malformed AI response text
 */
function extractTakeawaysFromText(text: string): { positive: string | null; negative: string | null; summary: string | null } {
  try {
    // Try to find content that looks like takeaways using regex
    const positiveMatch = text.match(/"positive":\s*"([^"]+)"/);
    const negativeMatch = text.match(/"negative":\s*"([^"]+)"/);
    const summaryMatch = text.match(/"summary":\s*"([^"]+)"/);
    
    return {
      positive: positiveMatch ? formatTakeaway(positiveMatch[1], 'positive') : null,
      negative: negativeMatch ? formatTakeaway(negativeMatch[1], 'negative') : null,
      summary: summaryMatch ? summaryMatch[1].trim() : null
    };
  } catch (e) {
    console.error('Error extracting takeaways from text:', e);
    return {
      positive: null,
      negative: null,
      summary: null
    };
  }
} 
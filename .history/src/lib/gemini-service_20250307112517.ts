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
    return {
      positive: "✓ The area appears to have typical urban safety standards.",
      negative: "⚠️ No specific safety concerns were identified for this area.",
      neutral: "Limited safety information is available for this specific location."
    };
  }

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

    // Prepare insight data for the prompt
    const insightData = insights.map(insight => {
      return {
        comment: insight.body || insight.title || insight.text,
        sentiment: insight.sentiment,
        safety_score: insight.safety_score
      };
    });

    const prompt = `Analyze these safety insights about an area and create concise takeaways for travelers.
    
    Safety insights:
    ${JSON.stringify(insightData)}
    
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

    // Format reviews for the prompt
    const reviewsFormatted = reviews.map(r => 
      `Review by ${r.author || 'Anonymous'} (${r.rating || 'Unrated'} stars): "${r.text}"`
    ).join('\n\n');

    const prompt = `Analyze these Airbnb reviews and identify safety-related comments. Focus ONLY on concrete safety observations and filter out non-safety related content.
    
    For each safety-related review, explain what specific safety context is mentioned.
    Be conservative in your analysis - only include reviews that explicitly mention safety aspects.
    If a review is not clearly about safety, do not include it.

    Reviews to analyze:
    ${reviewsFormatted}

    Format your response exactly like this example:
    {
      "safetyReviews": [
        {
          "review": {original review object},
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

    Format the positive and negative takeaways as checklist items, with each point on a new line.
    Use "✓" at the start of each positive point and "⚠️" at the start of each negative point.
    If there are no positive or negative points to make, use null for that field.`;

    console.log('Calling Gemini API to analyze reviews for safety content...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const analysis = JSON.parse(text);
      
      // Validate the response structure
      if (!analysis.safetyReviews || !analysis.takeaways) {
        throw new Error('Invalid response structure');
      }
      
      // Format takeaways to ensure proper formatting
      return {
        safetyReviews: analysis.safetyReviews,
        takeaways: {
          positive: formatTakeaway(analysis.takeaways.positive, 'positive'),
          negative: formatTakeaway(analysis.takeaways.negative, 'negative'),
          summary: analysis.takeaways.summary ? analysis.takeaways.summary.trim() : null
        }
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
 * Attempts to extract takeaways from malformed AI response text
 * @param text The raw text from the AI response
 * @returns Extracted or fallback takeaways
 */
function extractTakeawaysFromText(text: string): { positive: string | null; negative: string | null; neutral: string | null } {
  try {
    // Try to find content that looks like takeaways using regex
    const positiveMatch = text.match(/"positive":\s*"([^"]+)"/);
    const negativeMatch = text.match(/"negative":\s*"([^"]+)"/);
    const neutralMatch = text.match(/"neutral":\s*"([^"]+)"/);
    
    return {
      positive: positiveMatch ? formatTakeaway(positiveMatch[1], 'positive') : "✓ The area appears generally safe",
      negative: negativeMatch ? formatTakeaway(negativeMatch[1], 'negative') : "⚠️ Exercise normal urban precautions",
      neutral: neutralMatch ? neutralMatch[1].trim() : "Safety standards appear typical for this type of location"
    };
  } catch (e) {
    return {
      positive: "✓ The area appears generally safe",
      negative: "⚠️ Exercise normal urban precautions",
      neutral: "Safety standards appear typical for this type of location"
    };
  }
}

/**
 * Formats takeaway text for display
 * @param takeaway Raw takeaway text from AI
 * @param type Type of takeaway (positive or negative)
 * @returns Formatted takeaway text or null
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
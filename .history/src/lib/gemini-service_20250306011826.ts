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
 * @returns Object containing summary and sentiment
 */
export async function summarizeVideoContent(
  videoTitle: string,
  videoDescription: string,
  locationName: string
): Promise<{ summary: string; sentiment: 'positive' | 'neutral' | 'negative' }> {
  try {
    console.log('Summarizing video content with Gemini AI...');
    console.log('API Key available:', !!GEMINI_API_KEY);
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return {
        summary: 'Unable to generate summary: API key not configured.',
        sentiment: 'neutral'
      };
    }
    
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Create a prompt that focuses on extracting location-specific information
    const prompt = `
      Analyze this YouTube video about ${locationName} based on its title and description.
      
      Video Title: "${videoTitle}"
      Video Description: "${videoDescription}"
      
      Please provide:
      1. A concise summary (2-3 sentences) focusing on what the video reveals about ${locationName}, 
         especially regarding safety, neighborhood characteristics, and traveler experiences.
      2. Determine the overall sentiment of the video towards this location (positive, neutral, or negative).
      
      Format your response as JSON with two fields:
      - summary: The concise summary
      - sentiment: Either "positive", "neutral", or "negative"
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini AI response:', text);
    
    // Parse the JSON response
    try {
      const parsedResponse = JSON.parse(text);
      return {
        summary: parsedResponse.summary,
        sentiment: parsedResponse.sentiment as 'positive' | 'neutral' | 'negative'
      };
    } catch (parseError) {
      console.error('Error parsing Gemini response as JSON:', parseError);
      console.log('Raw response:', text);
      
      // If JSON parsing fails, extract information manually
      const summaryMatch = text.match(/summary[:\s]+(.*?)(?=sentiment|$)/i);
      const sentimentMatch = text.match(/sentiment[:\s]+"?(positive|neutral|negative)"?/i);
      
      return {
        summary: summaryMatch?.[1]?.trim() || 'Summary extraction failed. Please try again.',
        sentiment: (sentimentMatch?.[1]?.toLowerCase() as 'positive' | 'neutral' | 'negative') || 'neutral'
      };
    }
  } catch (error) {
    console.error('Error summarizing video content with Gemini:', error);
    
    // Provide more specific error message
    let errorMessage = 'Unable to generate summary at this time.';
    if (error instanceof Error) {
      errorMessage = `Error: ${error.message}`;
    }
    
    return {
      summary: errorMessage,
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
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return 0.5; // Default to medium relevance if API key is missing
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
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
    
    console.log('Relevance score response:', text);
    
    // Extract the number from the response
    const relevanceScore = parseFloat(text);
    
    if (isNaN(relevanceScore) || relevanceScore < 0 || relevanceScore > 1) {
      console.warn('Invalid relevance score received:', text);
      // Default to medium relevance if we can't parse a valid score
      return 0.5;
    }
    
    return relevanceScore;
  } catch (error) {
    console.error('Error calculating video relevance with Gemini:', error);
    return 0.5; // Default to medium relevance on error
  }
} 
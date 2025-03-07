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
    
    const prompt = `You are a JSON generator. Your task is to analyze a YouTube video about ${locationName} and generate a JSON response with exactly two fields: summary and sentiment.

Input:
- Video Title: "${videoTitle}"
- Video Description: "${videoDescription}"
${hasTranscript ? `- Video Transcript: "${transcript}"` : ''}
- Location: ${locationName}

Requirements:
1. The summary should be 2-3 sentences focusing on what the video reveals about ${locationName}, especially regarding safety, neighborhood characteristics, and traveler experiences.
${hasTranscript ? '2. Base your summary primarily on the transcript content, as it contains the most accurate information from the video.' : ''}
${hasTranscript ? '3' : '2'}. The sentiment must be exactly one of these values: "positive", "neutral", or "negative"

Respond with ONLY a valid JSON object in this exact format:
{
  "summary": "Your 2-3 sentence summary here",
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
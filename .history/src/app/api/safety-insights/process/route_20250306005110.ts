import { NextResponse } from 'next/server';
import { processLocalJsonFile, processApifyData } from '@/lib/safety-insights/processor';

export async function POST(request: Request) {
  try {
    const { source, city, filePath, apifyUrl } = await request.json();
    
    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }
    
    let processedInsights = [];
    
    if (source === 'local' && filePath) {
      // Process local JSON file
      processedInsights = await processLocalJsonFile(filePath, city);
    } else if (source === 'apify' && apifyUrl) {
      // Process data from Apify API
      processedInsights = await processApifyData(apifyUrl, city);
    } else {
      return NextResponse.json(
        { error: 'Invalid source or missing parameters' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      processed: processedInsights.length,
      insights: processedInsights,
    });
  } catch (error) {
    console.error('Error processing safety insights:', error);
    return NextResponse.json(
      { error: 'Failed to process safety insights' },
      { status: 500 }
    );
  }
}

// Rate limit this endpoint to prevent abuse
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}; 
import { NextResponse } from 'next/server';

// Cache to store results by location
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
interface CacheEntry {
  timestamp: number;
  data: any[];
}
const cache: Record<string, CacheEntry> = {};

export async function POST(request: Request) {
  try {
    const { location } = await request.json();
    
    if (!location || !location.neighborhood) {
      return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
    }
    
    // Generate cache key based on location
    const cacheKey = `${location.neighborhood}-${location.city || ''}`;
    
    // Check cache first
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp) < CACHE_TTL) {
      console.log('Returning cached Reddit comments for', cacheKey);
      return NextResponse.json({ comments: cache[cacheKey].data });
    }
    
    // Generate search queries based on location
    const searchQueries = generateSearchQueries(location);
    
    // Fetch Reddit comments for each query
    const allComments = [];
    for (const query of searchQueries) {
      const comments = await fetchRedditComments(query);
      allComments.push(...comments);
    }
    
    // Filter and process comments
    const processedComments = processComments(allComments);
    
    // Update cache
    cache[cacheKey] = {
      timestamp: Date.now(),
      data: processedComments
    };
    
    return NextResponse.json({ comments: processedComments });
  } catch (error) {
    console.error('Error fetching social comments:', error);
    return NextResponse.json({ error: 'Failed to fetch social comments' }, { status: 500 });
  }
}

// Generate search queries based on location data
function generateSearchQueries(location: any): string[] {
  const { neighborhood, city } = location;
  const queries = [];
  
  // Basic location queries
  if (neighborhood && city) {
    queries.push(`${neighborhood} ${city}`);
    queries.push(`${neighborhood} ${city} safety`);
    queries.push(`${neighborhood} ${city} area`);
  } else if (neighborhood) {
    queries.push(neighborhood);
    queries.push(`${neighborhood} safety`);
    queries.push(`${neighborhood} area`);
  } else if (city) {
    queries.push(city);
    queries.push(`${city} safety`);
  }
  
  // Add more specific queries for safety/travel
  if (neighborhood) {
    queries.push(`is ${neighborhood} safe`);
    queries.push(`staying in ${neighborhood}`);
    queries.push(`${neighborhood} at night`);
  }
  
  return queries.slice(0, 3); // Limit to 3 queries to avoid too many requests
}

// Fetch Reddit comments for a search query
async function fetchRedditComments(query: string): Promise<any[]> {
  try {
    // Encode the query for URL
    const encodedQuery = encodeURIComponent(query);
    
    // Use Reddit's JSON API to search for posts
    const response = await fetch(`https://www.reddit.com/search.json?q=${encodedQuery}&sort=relevance&t=year&limit=5`);
    
    if (!response.ok) {
      console.error(`Reddit API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const posts = data.data?.children || [];
    
    // Extract relevant comments from posts
    const comments = [];
    
    for (const post of posts) {
      const postData = post.data;
      
      // Skip posts with low scores or irrelevant content
      if (postData.score < 5 || postData.over_18) continue;
      
      // Get comments for this post
      const commentsResponse = await fetch(`https://www.reddit.com${postData.permalink}.json`);
      
      if (!commentsResponse.ok) continue;
      
      const commentsData = await commentsResponse.json();
      
      // Process top-level comments
      if (commentsData && commentsData.length > 1) {
        const topComments = commentsData[1].data.children
          .filter((comment: any) => comment.kind === 't1' && comment.data.score > 3)
          .slice(0, 3); // Take top 3 comments
        
        for (const comment of topComments) {
          const commentData = comment.data;
          
          comments.push({
            id: commentData.id,
            source: 'Reddit',
            username: commentData.author,
            date: new Date(commentData.created_utc * 1000).toISOString().split('T')[0],
            text: commentData.body,
            score: commentData.score,
            permalink: `https://www.reddit.com${postData.permalink}${commentData.id}`,
            postTitle: postData.title
          });
        }
      }
    }
    
    return comments;
  } catch (error) {
    console.error('Error fetching Reddit comments:', error);
    return [];
  }
}

// Process and filter comments
function processComments(comments: any[]): any[] {
  // Remove duplicates
  const uniqueComments = comments.filter((comment, index, self) =>
    index === self.findIndex((c) => c.id === comment.id)
  );
  
  // Sort by relevance/score
  const sortedComments = uniqueComments.sort((a, b) => b.score - a.score);
  
  // Take top comments
  const topComments = sortedComments.slice(0, 5);
  
  // Add sentiment analysis (simplified version)
  return topComments.map(comment => {
    // Simple sentiment analysis based on keywords
    const text = comment.text.toLowerCase();
    let sentiment = 'neutral';
    
    const positiveWords = ['safe', 'good', 'great', 'nice', 'love', 'recommend', 'clean', 'friendly'];
    const negativeWords = ['unsafe', 'bad', 'dangerous', 'avoid', 'scary', 'crime', 'sketchy', 'dirty'];
    
    const positiveScore = positiveWords.filter(word => text.includes(word)).length;
    const negativeScore = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveScore > negativeScore) sentiment = 'positive';
    else if (negativeScore > positiveScore) sentiment = 'negative';
    else if (positiveScore > 0 && negativeScore > 0) sentiment = 'mixed';
    
    // Generate avatar URL using deterministic hash from username
    const avatarId = Math.abs(comment.username.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 70);
    const avatar = `https://i.pravatar.cc/150?img=${avatarId}`;
    
    return {
      id: comment.id,
      source: comment.source,
      username: comment.username,
      date: comment.date,
      text: comment.text,
      sentiment,
      avatar,
      permalink: comment.permalink
    };
  });
} 
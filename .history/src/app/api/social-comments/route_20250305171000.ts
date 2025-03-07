import { NextResponse } from 'next/server';

// Cache to store results by location
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
interface CacheEntry {
  timestamp: number;
  data: any[];
}
const cache: Record<string, CacheEntry> = {};

// City-specific subreddits for better relevance
const CITY_SUBREDDITS: Record<string, string[]> = {
  'Los Angeles': ['LosAngeles', 'AskLosAngeles', 'LAlist', 'LARentals', 'LABike', 'FoodLosAngeles'],
  'San Francisco': ['sanfrancisco', 'AskSF', 'SFBayHousing', 'SFBayJobs', 'SFFood'],
  'New York': ['nyc', 'AskNYC', 'newyorkcity', 'nycapartments', 'FoodNYC'],
  'Chicago': ['chicago', 'AskChicago', 'ChicagoSuburbs', 'ChicagoFood'],
  'Miami': ['Miami', 'MiamiBeach', 'SoFla'],
  'Seattle': ['Seattle', 'SeattleWA', 'SeaList', 'SeattleFood'],
  'Portland': ['Portland', 'askportland', 'PDXBuyNothing'],
  'Austin': ['Austin', 'askaustin', 'austinfood', 'austinhousing'],
  'Denver': ['Denver', 'DenverList', 'Denverfood'],
  'Boston': ['boston', 'bostonhousing', 'bostonfood'],
  'Washington DC': ['washingtondc', 'dcfood', 'nova'],
  'Philadelphia': ['philadelphia', 'phillylist', 'phillyfood'],
  'San Diego': ['sandiego', 'asksandiego', 'sandiegofood'],
  'Nashville': ['nashville', 'asknashville'],
  'New Orleans': ['neworleans', 'asknola'],
  'Las Vegas': ['vegas', 'LasVegas'],
  // Add more cities as needed
};

// Default subreddits to search if no city-specific ones are found
const DEFAULT_SUBREDDITS = ['travel', 'solotravel', 'TravelHacks', 'AirBnB', 'backpacking'];

export async function POST(request: Request) {
  try {
    const { location } = await request.json();
    
    if (!location) {
      return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
    }
    
    // Generate cache key based on location
    const neighborhood = location.neighborhood || '';
    const city = location.city || '';
    const cacheKey = `${neighborhood}-${city}`;
    
    // Check cache first
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp) < CACHE_TTL) {
      console.log('Returning cached Reddit comments for', cacheKey);
      return NextResponse.json({ comments: cache[cacheKey].data });
    }
    
    // Find relevant subreddits for the city
    let subreddits: string[] = [];
    
    // Try to match the city with our predefined list
    for (const [cityName, citySubreddits] of Object.entries(CITY_SUBREDDITS)) {
      if (city.toLowerCase().includes(cityName.toLowerCase()) || 
          cityName.toLowerCase().includes(city.toLowerCase())) {
        subreddits = citySubreddits;
        break;
      }
    }
    
    // If no city-specific subreddits found, use default travel subreddits
    if (subreddits.length === 0) {
      subreddits = DEFAULT_SUBREDDITS;
    }
    
    // Generate search queries based on location
    const searchQueries = generateSearchQueries(location);
    
    // Fetch Reddit comments in parallel
    const commentPromises: Promise<any[]>[] = [];
    
    // First priority: Search in city-specific subreddits with neighborhood
    if (neighborhood) {
      for (const subreddit of subreddits.slice(0, 3)) { // Limit to top 3 subreddits
        commentPromises.push(fetchSubredditComments(subreddit, neighborhood));
      }
    }
    
    // Second priority: General search queries across Reddit
    for (const query of searchQueries.slice(0, 2)) { // Limit to top 2 queries
      commentPromises.push(fetchRedditComments(query));
    }
    
    // Wait for all promises to resolve
    const commentsArrays = await Promise.all(commentPromises);
    
    // Flatten the arrays of comments
    const allComments = commentsArrays.flat();
    
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
    queries.push(`${neighborhood} ${city} safety`);
    queries.push(`${neighborhood} ${city} area`);
  } else if (neighborhood) {
    queries.push(`${neighborhood} safety`);
    queries.push(`${neighborhood} area`);
  } else if (city) {
    queries.push(`${city} safety`);
    queries.push(`${city} neighborhood`);
  }
  
  // Add more specific queries for safety/travel
  if (neighborhood) {
    queries.push(`staying in ${neighborhood}`);
    queries.push(`${neighborhood} at night`);
  }
  
  return queries;
}

// Fetch comments from a specific subreddit about a topic
async function fetchSubredditComments(subreddit: string, searchTerm: string): Promise<any[]> {
  try {
    // Encode the search term for URL
    const encodedQuery = encodeURIComponent(searchTerm);
    
    // Use Reddit's JSON API to search within a specific subreddit
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/search.json?q=${encodedQuery}&restrict_sr=on&sort=relevance&t=year&limit=5`);
    
    if (!response.ok) {
      console.error(`Reddit API error for subreddit ${subreddit}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const posts = data.data?.children || [];
    
    // Extract relevant comments from posts
    const comments = [];
    
    // Process up to 3 posts to keep it fast
    for (const post of posts.slice(0, 3)) {
      const postData = post.data;
      
      // Skip posts with low scores or irrelevant content
      if (postData.score < 5 || postData.over_18) continue;
      
      // Instead of fetching comments for each post (which is slow),
      // just use the post title and text as a comment itself
      if (postData.selftext && postData.selftext.length > 0) {
        comments.push({
          id: postData.id,
          source: 'Reddit',
          username: postData.author,
          date: new Date(postData.created_utc * 1000).toISOString().split('T')[0],
          text: postData.selftext.length > 300 ? postData.selftext.substring(0, 300) + '...' : postData.selftext,
          score: postData.score,
          permalink: `https://www.reddit.com${postData.permalink}`,
          postTitle: postData.title,
          subreddit: postData.subreddit_name_prefixed
        });
      }
    }
    
    return comments;
  } catch (error) {
    console.error(`Error fetching subreddit comments from ${subreddit}:`, error);
    return [];
  }
}

// Fetch Reddit comments for a general search query
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
    
    // Process up to 3 posts to keep it fast
    for (const post of posts.slice(0, 3)) {
      const postData = post.data;
      
      // Skip posts with low scores or irrelevant content
      if (postData.score < 5 || postData.over_18) continue;
      
      // Skip posts from irrelevant subreddits
      const subreddit = postData.subreddit.toLowerCase();
      const irrelevantSubreddits = ['movies', 'gaming', 'politics', 'news', 'worldnews', 'funny', 'pics'];
      if (irrelevantSubreddits.includes(subreddit)) continue;
      
      // Instead of fetching comments for each post (which is slow),
      // just use the post title and text as a comment itself
      if (postData.selftext && postData.selftext.length > 0) {
        comments.push({
          id: postData.id,
          source: 'Reddit',
          username: postData.author,
          date: new Date(postData.created_utc * 1000).toISOString().split('T')[0],
          text: postData.selftext.length > 300 ? postData.selftext.substring(0, 300) + '...' : postData.selftext,
          score: postData.score,
          permalink: `https://www.reddit.com${postData.permalink}`,
          postTitle: postData.title,
          subreddit: postData.subreddit_name_prefixed
        });
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
      source: `Reddit (${comment.subreddit || 'r/reddit'})`,
      username: comment.username,
      date: comment.date,
      text: comment.text,
      sentiment,
      avatar,
      permalink: comment.permalink
    };
  });
} 
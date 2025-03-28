import qs from 'qs';

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_URL || !STRAPI_API_TOKEN) {
  throw new Error('Missing Strapi API environment variables');
}

/**
 * Helper to make GET requests to Strapi API endpoints
 */
export async function fetchAPI(path: string, urlParamsObject = {}, options = {}) {
  try {
    // Merge default and user options
    const mergedOptions = {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      ...options,
    };

    // Build request URL
    const queryString = qs.stringify(urlParamsObject, {
      encodeValuesOnly: true,
    });
    const requestUrl = `${STRAPI_API_URL}/api${path}${queryString ? `?${queryString}` : ''}`;

    // Trigger API call
    const response = await fetch(requestUrl, mergedOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      throw new Error(`An error occurred please try again`);
    }

    return data;
  } catch (error) {
    console.error(error);
    throw new Error(`Please check if your Strapi server is running`);
  }
}

export async function getHomePage() {
  const path = '/homepage';
  const urlParamsObject = {
    populate: {
      hero: {
        populate: '*',
      },
      features: {
        populate: '*',
      },
      testimonials: {
        populate: {
          items: {
            populate: '*',
          },
        },
      },
      partners: {
        populate: '*',
      },
      safetyInsights: {
        populate: '*',
      },
      interactiveMap: {
        populate: '*',
      },
      popularDestinations: {
        populate: '*',
      },
      faq: {
        populate: '*',
      },
      seo: {
        populate: '*',
      },
    },
  };

  const response = await fetchAPI(path, urlParamsObject);
  return response;
}

export async function getBlogPosts(page = 1, pageSize = 9) {
  const path = `/articles?${qs.stringify({
    populate: ['coverImage', 'author', 'seo'],
    sort: ['publishedAt:desc'],
    pagination: {
      page,
      pageSize,
    },
  })}`;
  return fetchAPI(path);
}

export async function getBlogPost(slug: string) {
  const path = `/articles?${qs.stringify({
    filters: {
      slug: {
        $eq: slug,
      },
    },
    populate: ['coverImage', 'author', 'seo', 'content'],
  })}`;
  return fetchAPI(path);
}

export async function getCategories() {
  const path = `/categories?${qs.stringify({
    populate: '*',
  })}`;
  return fetchAPI(path);
}

export async function getPostsByCategory(category: string, page = 1, pageSize = 9) {
  const path = `/articles?${qs.stringify({
    filters: {
      category: {
        slug: {
          $eq: category,
        },
      },
    },
    populate: ['coverImage', 'author', 'seo'],
    sort: ['publishedAt:desc'],
    pagination: {
      page,
      pageSize,
    },
  })}`;
  return fetchAPI(path);
} 
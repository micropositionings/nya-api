const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// AllAnime API Configuration
const ALLANIME_API = 'https://api.allanime.day';
const ALLANIME_BASE = 'allanime.day';
const ALLANIME_REFR = 'https://allanime.to';
const AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

// Create axios instance with retry logic
const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': AGENT,
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US,en;q=0.9'
  }
});

// Decrypt tobeparsed function (from ani-cli)
function b64urlToHex(str) {
  let len = str.length;
  let mod = len % 4;
  let pad = '';
  if (mod === 2) pad = '==';
  else if (mod === 3) pad = '=';
  
  const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('hex');
}

// Search anime
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query required' });

    console.log(`[SEARCH] Searching for: ${query}`);

    // Simple search - use GET with query parameters
    const searchUrl = `${ALLANIME_API}/allanime/byQuery/?query=${encodeURIComponent(query)}&type=anime`;
    
    const response = await axiosInstance.get(searchUrl, {
      headers: {
        'Referer': ALLANIME_REFR
      }
    });

    console.log(`[SEARCH] Response received, status: ${response.status}`);

    let results = [];
    
    if (response.data) {
      const data = response.data;
      console.log(`[SEARCH] Response type: ${typeof data}`);
      
      // Handle different response formats
      if (Array.isArray(data)) {
        results = data.slice(0, 40).map(item => ({
          id: item._id || item.id,
          name: item.name,
          episodes: item.totalEpisodes || item.availableEpisodes || 0
        })).filter(r => r.id && r.name);
      } else if (data.results && Array.isArray(data.results)) {
        results = data.results.slice(0, 40).map(item => ({
          id: item._id || item.id,
          name: item.name,
          episodes: item.totalEpisodes || item.availableEpisodes || 0
        })).filter(r => r.id && r.name);
      }
    }

    console.log(`[SEARCH] Found ${results.length} results`);

    if (results.length === 0) {
      return res.json({ results: [] }); // Return empty array instead of error
    }

    res.json({ results });
  } catch (error) {
    console.error('[SEARCH] Error:', error.message);
    console.error('[SEARCH] Error details:', error.response?.status, error.response?.data);
    
    // Try alternative API endpoint
    try {
      const query = req.query.q;
      const altUrl = `${ALLANIME_API}/api/v1/search?query=${encodeURIComponent(query)}`;
      const altResponse = await axiosInstance.get(altUrl);
      
      if (altResponse.data) {
        const results = (altResponse.data.results || altResponse.data || [])
          .slice(0, 40)
          .map(item => ({
            id: item._id || item.id,
            name: item.name,
            episodes: item.totalEpisodes || 0
          }))
          .filter(r => r.id && r.name);
        
        return res.json({ results });
      }
    } catch (altError) {
      console.error('[SEARCH] Alternative endpoint also failed:', altError.message);
    }

    res.status(500).json({ error: 'Search failed', results: [] });
  }
});

// Get anime details with cover art
app.get('/api/anime/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const detailsGql = `query ($showId: String!) { show(_id: $showId) { _id name availableEpisodes __typename } }`;
    const response = await axios.post(`${ALLANIME_API}/api`, {
      variables: { showId: id },
      query: detailsGql
    }, {
      headers: {
        'User-Agent': AGENT,
        'Content-Type': 'application/json',
        'Referer': ALLANIME_REFR
      }
    });

    // Try to get cover from multiple sources
    let coverUrl = null;
    
    // Fallback to placeholder with anime name
    const animeData = response.data;
    const nameMatch = JSON.stringify(animeData).match(/"name":"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : 'Anime';

    res.json({
      id,
      name,
      cover: coverUrl || `https://via.placeholder.com/300x450?text=${encodeURIComponent(name)}&bg=1a1a1a`
    });
  } catch (error) {
    console.error('Anime details error:', error.message);
    res.status(500).json({ error: 'Failed to get anime details' });
  }
});

// Get episodes list
app.get('/api/episodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[EPISODES] Getting episodes for: ${id}`);

    const episodesUrl = `${ALLANIME_API}/allanime/${id}/1/1`;
    const response = await axiosInstance.get(episodesUrl, {
      headers: {
        'Referer': ALLANIME_REFR
      }
    });

    let episodes = [];

    if (response.data) {
      const data = response.data;
      
      // Try to extract episodes from different possible locations
      if (Array.isArray(data)) {
        episodes = data.filter(e => e && e.episodeNum).map(e => e.episodeNum);
      } else if (data.episodes && Array.isArray(data.episodes)) {
        episodes = data.episodes.map(e => typeof e === 'object' ? e.number : e);
      } else if (typeof data === 'object') {
        // Look for episode data in nested structure
        const keys = Object.keys(data);
        for (const key of keys) {
          if (key.includes('episode') && Array.isArray(data[key])) {
            episodes = data[key].map(e => typeof e === 'object' ? (e.number || e.episodeNum) : e);
            break;
          }
        }
      }

      episodes = episodes
        .map(e => parseFloat(e))
        .filter(e => !isNaN(e))
        .sort((a, b) => a - b);
    }

    console.log(`[EPISODES] Found ${episodes.length} episodes`);

    res.json({ episodes: episodes.length > 0 ? episodes : ['1'] });
  } catch (error) {
    console.error('[EPISODES] Error:', error.message);
    res.status(500).json({ error: 'Failed to get episodes', episodes: ['1'] });
  }
});

// Get episode streaming links
app.get('/api/episode/:id/:ep', async (req, res) => {
  try {
    const { id, ep } = req.params;
    console.log(`[EPISODE] Getting links for ${id} ep ${ep}`);

    // Try multiple endpoint formats
    const urls = [
      `${ALLANIME_API}/allanime/${id}/ep-${ep}`,
      `${ALLANIME_API}/allanime/${id}/${ep}/1`
    ];

    let response;
    let lastError;

    for (const url of urls) {
      try {
        console.log(`[EPISODE] Trying: ${url}`);
        response = await axiosInstance.get(url, {
          headers: {
            'Referer': ALLANIME_REFR
          }
        });
        if (response.data) break;
      } catch (e) {
        lastError = e;
        console.log(`[EPISODE] URL failed: ${e.message}`);
        continue;
      }
    }

    if (!response || !response.data) {
      throw lastError || new Error('No response');
    }

    const links = [];
    const data = response.data;

    if (Array.isArray(data)) {
      data.forEach((item, idx) => {
        if (item.link || item.url) {
          links.push({
            source: item.source || item.name || `Source ${idx + 1}`,
            url: item.link || item.url
          });
        }
      });
    } else if (typeof data === 'object') {
      // Handle nested structure
      if (data.links && Array.isArray(data.links)) {
        data.links.forEach((link, idx) => {
          links.push({
            source: link.source || link.name || `Source ${idx + 1}`,
            url: link.link || link.url
          });
        });
      } else if (data.sources && Array.isArray(data.sources)) {
        data.sources.forEach((source, idx) => {
          links.push({
            source: source.name || source.source || `Source ${idx + 1}`,
            url: source.url || source.link
          });
        });
      }
    }

    console.log(`[EPISODE] Found ${links.length} links`);

    res.json({ 
      episode: ep,
      links: links.length > 0 ? links : [{ source: 'Coming Soon', url: '#' }]
    });
  } catch (error) {
    console.error('[EPISODE] Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get episode links',
      links: [{ source: 'Coming Soon', url: '#' }]
    });
  }
});

app.listen(PORT, () => {
  console.log(`🎬 Ani-CLI API Server running on http://localhost:${PORT}`);
  console.log(`📺 Anime search available at http://localhost:${PORT}/api/search?q=naruto`);
});

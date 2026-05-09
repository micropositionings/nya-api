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
const ANILIST_API = 'https://graphql.anilist.co';
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

// Search anime using AniList API
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query required' });

    console.log(`[SEARCH] Searching for: ${query}`);

    const anilistQuery = `
      query ($search: String) {
        Page(perPage: 40) {
          media(search: $search, type: ANIME) {
            id
            title {
              romaji
              english
            }
            episodes
            coverImage {
              large
            }
          }
        }
      }
    `;

    const response = await axiosInstance.post(ANILIST_API, {
      query: anilistQuery,
      variables: { search: query }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`[SEARCH] Response received`);

    let results = [];
    
    if (response.data?.data?.Page?.media) {
      results = response.data.data.Page.media.map(item => ({
        id: item.id.toString(),
        name: item.title.romaji || item.title.english || 'Unknown',
        episodes: item.episodes || 0,
        cover: item.coverImage?.large
      }));
    }

    console.log(`[SEARCH] Found ${results.length} results`);

    res.json({ results });
  } catch (error) {
    console.error('[SEARCH] Error:', error.message);
    console.error('[SEARCH] Response data:', error.response?.data);
    res.status(500).json({ error: 'Search failed', results: [] });
  }
});

// Get anime details - get cover and title from AniList
app.get('/api/anime/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const anilistQuery = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
        }
      }
    `;

    const response = await axiosInstance.post(ANILIST_API, {
      query: anilistQuery,
      variables: { id: parseInt(id) }
    });

    if (response.data?.data?.Media) {
      const media = response.data.data.Media;
      return res.json({
        id: media.id,
        name: media.title.romaji || media.title.english || 'Anime',
        cover: media.coverImage?.large || `https://via.placeholder.com/300x450?text=Anime&bg=1a1a1a`,
        episodes: media.episodes || 0
      });
    }

    res.status(404).json({ error: 'Anime not found' });
  } catch (error) {
    console.error('[ANIME] Error:', error.message);
    res.status(500).json({ error: 'Failed to get anime details' });
  }
});

// Get episodes list using AniList
app.get('/api/episodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[EPISODES] Getting episodes for: ${id}`);

    const anilistQuery = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          episodes
          title {
            romaji
          }
        }
      }
    `;

    const response = await axiosInstance.post(ANILIST_API, {
      query: anilistQuery,
      variables: { id: parseInt(id) }
    });

    let episodes = [];

    if (response.data?.data?.Media?.episodes) {
      const totalEps = response.data.data.Media.episodes;
      // Generate array of episode numbers from 1 to totalEps
      episodes = Array.from({length: totalEps}, (_, i) => i + 1);
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
    console.log(`[EPISODE] Getting links for AniList ID ${id} ep ${ep}`);

    // For now, return placeholder links
    // In production, you would map AniList IDs to AllAnime IDs and fetch real streams
    const links = [
      {
        source: 'Jikan (Meta)',
        url: '#'
      },
      {
        source: 'Find on AllAnime',
        url: `https://allanime.to/search?keyw=${encodeURIComponent(id)}`
      }
    ];

    console.log(`[EPISODE] Returning ${links.length} links`);

    res.json({ 
      episode: ep,
      links: links,
      note: 'Real streaming links require AniList to AllAnime ID mapping'
    });
  } catch (error) {
    console.error('[EPISODE] Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get episode links',
      links: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`🎬 Ani-CLI API Server running on http://localhost:${PORT}`);
  console.log(`📺 Anime search available at http://localhost:${PORT}/api/search?q=naruto`);
});

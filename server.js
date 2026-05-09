const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Jikan API (MyAnimeList) - most reliable
const JIKAN_API = 'https://api.jikan.moe/v4';

console.log(`🎬 Anime Web Server starting...`);

// Search anime
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query required' });

    console.log(`[SEARCH] ${query}`);

    const response = await axios.get(`${JIKAN_API}/anime`, {
      params: {
        query: query,
        limit: 25,
        status: 'complete,ongoing'
      }
    });

    const results = response.data.data.map(anime => ({
      id: anime.mal_id,
      name: anime.title,
      episodes: anime.episodes || 0,
      score: anime.score || 0,
      cover: anime.images.jpg.large_image_url
    }));

    res.json({ results });
  } catch (error) {
    console.error('[SEARCH] Error:', error.message);
    res.status(500).json({ error: 'Search failed', results: [] });
  }
});

// Get anime details
app.get('/api/anime/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${JIKAN_API}/anime/${id}`);
    const anime = response.data.data;

    res.json({
      id: anime.mal_id,
      name: anime.title,
      episodes: anime.episodes || 0,
      cover: anime.images.jpg.large_image_url,
      synopsis: anime.synopsis || '',
      score: anime.score || 0,
      status: anime.status,
      aired: anime.aired?.string || 'Unknown'
    });
  } catch (error) {
    console.error('[ANIME] Error:', error.message);
    res.status(500).json({ error: 'Failed to get anime details' });
  }
});

// Get episodes (generate list based on total)
app.get('/api/episodes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${JIKAN_API}/anime/${id}`);
    const totalEpisodes = response.data.data.episodes || 1;

    // Generate episode array
    const episodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

    res.json({ episodes });
  } catch (error) {
    console.error('[EPISODES] Error:', error.message);
    res.status(500).json({ error: 'Failed to get episodes', episodes: ['1'] });
  }
});

// Get episode info
app.get('/api/episode/:id/:ep', async (req, res) => {
  try {
    const { id, ep } = req.params;

    const response = await axios.get(`${JIKAN_API}/anime/${id}/episodes/${ep}`);
    const episode = response.data.data;

    res.json({
      episode: ep,
      title: episode.title || `Episode ${ep}`,
      aired: episode.aired || 'Unknown',
      score: episode.score || 0,
      filler: episode.filler || false,
      recap: episode.recap || false
    });
  } catch (error) {
    console.error('[EPISODE] Error:', error.message);
    res.status(500).json({ 
      episode: ep,
      title: `Episode ${ep}`,
      note: 'Episode details not available'
    });
  }
});

// Search streaming sites (returns links to watch)
app.get('/api/watch/:id/:ep', async (req, res) => {
  try {
    const { id, ep } = req.params;

    // Get anime info for search
    const animeRes = await axios.get(`${JIKAN_API}/anime/${id}`);
    const anime = animeRes.data.data;
    const title = anime.title.replace(/[^a-zA-Z0-9\s]/g, '').trim();

    // Return links to popular anime streaming sites
    const links = [
      {
        source: 'Search on 9anime',
        url: `https://9anime.id/search?keyword=${encodeURIComponent(title)}`
      },
      {
        source: 'Search on AnimixPlay',
        url: `https://animixplay.to/?q=${encodeURIComponent(title)}`
      },
      {
        source: 'MAL Link',
        url: `https://myanimelist.net/anime/${id}`
      },
      {
        source: 'AniList',
        url: `https://anilist.co/search/anime?search=${encodeURIComponent(title)}`
      }
    ];

    res.json({ 
      episode: ep,
      anime: title,
      links,
      note: 'Visit any of these sites and search for the anime to watch'
    });
  } catch (error) {
    console.error('[WATCH] Error:', error.message);
    res.status(500).json({ error: 'Failed to get watch links' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Anime Web Server',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔍 Try: http://localhost:${PORT}/api/search?q=naruto`);
});

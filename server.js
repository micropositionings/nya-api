const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// AllAnime API Configuration
const ALLANIME_API = 'https://api.allanime.day';
const ALLANIME_BASE = 'allanime.day';
const ALLANIME_REFR = 'https://allmanga.to';
const AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

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

    const searchGql = `query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { edges { _id name availableEpisodes __typename } }}}`;

    const response = await axios.post(`${ALLANIME_API}/api`, {
      variables: {
        search: { allowAdult: false, allowUnknown: false, query },
        limit: 40,
        page: 1,
        translationType: 'sub',
        countryOrigin: 'ALL'
      },
      query: searchGql
    }, {
      headers: {
        'User-Agent': AGENT,
        'Content-Type': 'application/json',
        'Referer': ALLANIME_REFR
      }
    });

    const results = [];
    const data = JSON.stringify(response.data);
    const shows = data.split('Show');
    
    for (let i = 1; i < shows.length && results.length < 40; i++) {
      const match = shows[i].match(/"_id":"([^"]+)","name":"([^"]+)".*?"sub":(\d+)/);
      if (match) {
        results.push({
          id: match[1],
          name: match[2].replace(/\\"/g, '"'),
          episodes: parseInt(match[3])
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed' });
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

    const episodesGql = `query ($showId: String!) { show(_id: $showId) { _id availableEpisodesDetail } }`;
    const response = await axios.post(`${ALLANIME_API}/api`, {
      variables: { showId: id },
      query: episodesGql
    }, {
      headers: {
        'User-Agent': AGENT,
        'Content-Type': 'application/json',
        'Referer': ALLANIME_REFR
      }
    });

    const data = JSON.stringify(response.data);
    const match = data.match(/"sub":\[([^\]]+)\]/);
    let episodes = [];

    if (match) {
      episodes = match[1].split(',').map(ep => {
        const num = ep.replace(/["\s]/g, '');
        return num ? parseFloat(num) : null;
      }).filter(ep => ep !== null).sort((a, b) => a - b);
    }

    res.json({ episodes: episodes.length > 0 ? episodes : ['1'] });
  } catch (error) {
    console.error('Episodes error:', error.message);
    res.status(500).json({ error: 'Failed to get episodes', episodes: ['1'] });
  }
});

// Get episode streaming links
app.get('/api/episode/:id/:ep', async (req, res) => {
  try {
    const { id, ep } = req.params;

    const episodeGql = `query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) { episodeString sourceUrls } }`;

    const response = await axios.post(`${ALLANIME_API}/api`, {
      variables: {
        showId: id,
        translationType: 'sub',
        episodeString: ep
      },
      query: episodeGql
    }, {
      headers: {
        'User-Agent': AGENT,
        'Content-Type': 'application/json',
        'Referer': ALLANIME_REFR
      }
    });

    const data = response.data;
    const links = [];

    // Parse source URLs from response
    const responseStr = JSON.stringify(data);
    const sourceMatches = responseStr.match(/"sourceName":"([^"]+)"[^}]*"sourceUrl":"--([^"]+)"/g) || [];
    
    sourceMatches.forEach(match => {
      const nameMatch = match.match(/"sourceName":"([^"]+)"/);
      const urlMatch = match.match(/"sourceUrl":"--([^"]+)"/);
      if (nameMatch && urlMatch) {
        links.push({
          source: nameMatch[1],
          url: decodeURIComponent(urlMatch[1])
        });
      }
    });

    res.json({ 
      episode: ep,
      links: links.length > 0 ? links : [{ source: 'Default', url: '#' }]
    });
  } catch (error) {
    console.error('Episode link error:', error.message);
    res.status(500).json({ error: 'Failed to get episode links' });
  }
});

app.listen(PORT, () => {
  console.log(`🎬 Ani-CLI API Server running on http://localhost:${PORT}`);
  console.log(`📺 Anime search available at http://localhost:${PORT}/api/search?q=naruto`);
});

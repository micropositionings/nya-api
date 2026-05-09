# NYA - Anime Streaming Platform

A modern anime streaming platform with built-in search, episode selection, and streaming links via AllAnime API.

## Features

✨ Anime Search - Search millions of anime titles
🎬 Episode Selection - Choose specific episodes
🔗 Multiple Streaming Sources - Find working links
🎨 Modern UI - Clean, responsive interface
📱 Mobile Friendly - Works on all devices

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Open browser to http://localhost:3000
```

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Render (Free, recommended)
- Railway
- GitHub Pages
- DigitalOcean

## File Structure

```
nyaa/
├── main.html           # Frontend UI
├── server.js           # Node.js backend API
├── package.json        # Dependencies
├── DEPLOYMENT.md       # Hosting guide
├── animes.txt          # Local anime list
├── movies.txt          # Local movies list
└── images/             # Poster images
```

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/search?q=naruto` | Search anime |
| `GET /api/anime/:id` | Get anime details |
| `GET /api/episodes/:id` | List episodes |
| `GET /api/episode/:id/:ep` | Get streaming links |

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express, Axios
- **API:** AllAnime GraphQL API
- **Hosting:** Render, Railway, GitHub Pages, DigitalOcean

## Environment Variables

Create `.env` file:
```
PORT=3000
NODE_ENV=production
```

## Browser Support

- Chrome/Chromium (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)

## Legal Notice

This project is for educational purposes. Always respect copyright laws and terms of service of streaming providers.

## License

MIT

---

**Ready to deploy?** → [See DEPLOYMENT.md](DEPLOYMENT.md)

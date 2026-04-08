const axios = require('axios');

async function getNews() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) throw new Error('NEWS_API_KEY not set');

  const country  = process.env.NEWS_COUNTRY || 'ca';
  const category = process.env.NEWS_CATEGORY || 'general';

  const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=10&apiKey=${apiKey}`;
  const { data } = await axios.get(url);

  if (data.status !== 'ok') throw new Error(data.message || 'NewsAPI error');

  return (data.articles || [])
    .filter(a => a.title && a.title !== '[Removed]')
    .map(a => ({
      title: a.title,
      url: a.url,
      source: a.source?.name || 'Unknown',
    }));
}

module.exports = { getNews };

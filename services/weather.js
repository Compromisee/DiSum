const axios = require('axios');

async function getWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const city   = process.env.WEATHER_CITY || 'Toronto';

  if (!apiKey) throw new Error('OPENWEATHER_API_KEY not set');

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const { data } = await axios.get(url);

  const toTime = (unix) =>
    new Date(unix * 1000).toLocaleTimeString('en-CA', {
      hour: '2-digit', minute: '2-digit', timeZone: process.env.TIMEZONE || 'America/Toronto',
    });

  return {
    city: data.name,
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    wind: Math.round(data.wind.speed * 3.6), // m/s → km/h
    description: data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1),
    summary: weatherEmoji(data.weather[0].id) + '  ' + data.weather[0].main,
    sunrise: toTime(data.sys.sunrise),
    sunset: toTime(data.sys.sunset),
  };
}

function weatherEmoji(code) {
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌦️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800) return '☀️';
  if (code > 800) return '⛅';
  return '🌤️';
}

module.exports = { getWeather };

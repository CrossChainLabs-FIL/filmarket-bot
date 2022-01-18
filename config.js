module.exports = {
    bot: {
      lotus_api: process.env.LOTUS_API || '',
      lotus_api_rps: process.env.LOTUS_API_RPS || 10,
      miners_api_fg: process.env.MINERS_API_FG || '',
      miners_api_rs: process.env.MINERS_API_RS || '',
      maxmind_id: process.env.MAXMIND_ID || '',
      maxmind_token: process.env.MAXMIND_TOKEN || '',
      coinmarketcap_apikey: process.env.COINMARKETCAP_APIKEY || '',
    }
  }; 
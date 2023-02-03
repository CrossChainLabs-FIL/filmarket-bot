const config = require('./config');
const WebServiceClient = require('@maxmind/geoip2-node').WebServiceClient; 
const client = new WebServiceClient(config.bot.maxmind_account, config.bot.maxmind_key);

function getCity(ip) {
  return client.city(ip);
};

module.exports = {
    getCity
}
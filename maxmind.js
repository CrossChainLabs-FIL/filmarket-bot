const config = require('./config');
const WebServiceClient = require('@maxmind/geoip2-node').WebServiceClient; 
const client = new WebServiceClient(config.bot.maxmind_id, config.bot.maxmind_token);

function GetLocation(ip) {
  return client.city(ip);
};

module.exports = {
    GetLocation
}
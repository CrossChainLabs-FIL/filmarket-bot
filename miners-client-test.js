const config = require('./config');
const { MinersClient } = require("./miners-client");

(async () => {
    let minersClient = new MinersClient(config.bot.miners_api_rs);
    const miners = await minersClient.GetMiners();
    console.log(miners.length);
}
)();



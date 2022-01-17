const config = require('./config');
const { INFO, ERROR, WARNING } = require('./logs');
const { FormatSize, TimeDeltaH } = require('./utils');
const { Lotus } = require("./lotus");
const { MinersClient } = require("./miners-client");
const { ISOCodeToRegion } = require("./location");
const CoinMarketCap = require('coinmarketcap-api')

const coinMarketCap = new CoinMarketCap(config.bot.coinmarketcap_apikey);

let stop = false;
let lotus = new Lotus(config.bot.lotus_api);
let locationMap = new Map();
let minersSet = new Set();


async function RefreshMinersList() {
    let minersClient_FG = new MinersClient(config.bot.miners_api_fg);
    let minersClient_RS = new MinersClient(config.bot.miners_api_rs);

    const miners_fg = await minersClient_FG.GetMiners();

    for (const m_fg of miners_fg) {
        minersSet.add(m_fg.miner);
    }

    const miners_rs = await minersClient_RS.GetMiners();

    for (const m_rs of miners_rs) {
        if (m_rs.isoCode) {
            locationMap.set(m_rs.address, m_rs.isoCode);
        }
        
        minersSet.add(m_rs.address);
    }
}

async function GetFILPrice() {
    let price = undefined;

    try {
        const response = await coinMarketCap.getQuotes({symbol: 'FIL', convert: 'USD'});
        if (response?.data?.FIL?.quote?.USD?.price) {
            price = response?.data?.FIL?.quote?.USD?.price;
            INFO(`GetFILPrice ${price} USD`);
        } else {
            WARNING(`GetFILPrice response : ${JSON.stringify(response)}`);
        }
    } catch (e) {
        INFO(`GetFILPrice -> ${e}`);
    }

    return price;
}

async function GetMinersPriceInfo() {
    let result = [];

    const miners = Array.from(minersSet);

    /*const miners = [
       'f0152747',
        'f0673645',
       'f01033857',
       'f0143858',
        'f021255',
        'f0700033',
       'f042558',
       'f023198',
       'f0151366',
        'f01016198',
        'f0112087',
        'f01072221',
        'f0110567',
        'f01035680',
        'f01027268',
        'f02665',
        'f0734051',
        'f0828066',
    ];*/

    INFO(`GetMinersPriceInfo for ${miners?.length} miners`);

    if (miners?.length) {
        var minersSlice = miners;
        while (minersSlice.length) {
            await Promise.all(minersSlice.splice(0, config.bot.lotus_api_rps).map(async (miner) => {
                try {
                    let peerId = (await lotus.StateMinerInfo(miner))?.data?.result?.PeerId;
                    let power = (await lotus.StateMinerPower(miner))?.data?.result?.MinerPower?.QualityAdjPower;

                    if (!power || !peerId) {
                        WARNING(`GetMinersPriceInfo[${miner}] power: ${power}, peerId: ${peerId}`);
                    } else {
                        let ask = await lotus.ClientQueryAsk(peerId, miner);
                        if (ask?.data?.result?.Price) {
                            let price = ask?.data?.result?.Price;
                            let region = ISOCodeToRegion(locationMap.get(miner));

                            result.push({
                                miner: miner,
                                power: power,
                                price: price,
                                region: region,
                            });


                            INFO(`GetMinersPriceInfo[${miner} power: ${power}, peerId: ${peerId}, price: ${price}`);
                        } else {
                            INFO(`GetMinersPriceInfo[${miner} power: ${power}, peerId: ${peerId} no price info`);
                        }
                    }

                } catch (e) {
                    INFO(`GetMinersPriceInfo[${miner}] -> ${e}`);
                }
            }));

            if (stop) {
                break;
            }

        }
    }

    return result;
}

const pause = (timeout) => new Promise(res => setTimeout(res, timeout * 1000));

const mainLoop = async _ => {
    try {
        INFO('FilMarket Bot start');

        while (!stop) {
            await RefreshMinersList();
    
            let data = await GetMinersPriceInfo();
            console.log(data);

            await GetFILPrice();

            stop = true;

            INFO(`Pause for 60 seconds`);
            await pause(60);
        }
        
    } catch (error) {
        ERROR(`[MainLoop] error :`);
        console.error(error);
        ERROR(`Shutting down`);
        process.exit(1);
    }
}

mainLoop();

function shutdown(exitCode = 0) {
    stop = true;
    setTimeout(() => {
        INFO(`Shutdown`);
        process.exit(exitCode);
    }, 3000);
}
//listen for TERM signal .e.g. kill
process.on('SIGTERM', shutdown);
// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', shutdown); 
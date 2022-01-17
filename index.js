const config = require('./config');
const { INFO, ERROR, WARNING } = require('./logs');
const { FormatSize, TimeDeltaH } = require('./utils');
const { GetLocation } = require('./maxmind');
const { Lotus } = require("./lotus");
const { MinersClient } = require("./miners-client");
const CoinMarketCap = require('coinmarketcap-api')

let stop= false;
let minersClient = new MinersClient(config.bot.miners_api);
let lotus = new Lotus(config.bot.lotus_api);
let locationMap = new Map();
const coinMarketCap = new CoinMarketCap(config.bot.coinmarketcap_apikey);

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

async function GetMinerLocation(miner, addrs) {
    if (addrs) {
        let isoCode = undefined;
        let city = undefined;

        for (let rawAddr of addrs) {
            let addr = rawAddr.substr(5);
            let pos = addr.indexOf('/');
            const response = await GetLocation(addr.substr(0, pos)).catch(() => undefined);
            isoCode = response?.country?.isoCode;
            city = response?.city?.names.en;

            if (isoCode) {
                break;
            }
        };

        if (!isoCode) {
            ERROR(`GetMinerLocation isoCode undefined for ${addrs}`);
            return undefined;
        }

        INFO(`ActiveMiners::getMinerLocation ${miner} -> ${isoCode},${city}`);
        return {
            isoCode: isoCode,
            city: city,
        };
    }
}

async function GetMinersPriceInfo() {
    let result = [];
    const miners = await minersClient.GetMiners();

    /*const miners = [
        {miner:'f0152747'},
        {miner:'f0673645'},
        {miner:'f01033857'},
        {miner:'f0143858'},
        {miner:'f021255'},
        {miner:'f0700033'},
        {miner:'f042558'},
        {miner:'f023198'},
        {miner:'f0151366'},
        {miner:'f01016198'},
        {miner:'f0112087'},
        {miner:'f01072221'},
        {miner:'f0110567'},
        {miner:'f01035680'},
        {miner:'f01027268'},
        {miner:'f02665'},
        {miner:'f0734051'},
        {miner:'f0828066'},
    ];*/

    if (miners?.length) {
        for (const miner of miners) {
            try {
                let peerId = (await lotus.StateMinerInfo(miner.miner))?.data?.result?.PeerId;
                let power = (await lotus.StateMinerPower(miner.miner))?.data?.result?.MinerPower?.QualityAdjPower;

                if (!power || !peerId) {
                    WARNING(`GetMinersPriceInfo[${miner.miner}] power: ${power}, peerId: ${peerId}`);
                } else {
                    let ask = await lotus.ClientQueryAsk(peerId, miner.miner);
                    if (ask?.data?.result?.Price) {
                        let price = ask?.data?.result?.Price;
                        let location = undefined;

                        location = locationMap.get(miner.miner);

                        if (!location) {
                            const peerInfoResponse = (await lotus.NetFindPeer(peerId).catch(() => undefined))?.data;
                            console.log(peerInfoResponse);
                            const addrs = peerInfoResponse?.result?.Addrs;

                            if (addrs) {
                                location = await GetMinerLocation(miner.miner, addrs);
                                if (location) {
                                    locationMap.set(miner.miner, location);
                                }
                            }

                        }

                        result.push({
                            miner: miner.miner,
                            power: miner.power,
                            price: price,
                            isoCode: location?.isoCode,
                        });

                        
                        INFO(`GetMinersPriceInfo[${miner.miner} power: ${power}, peerId: ${peerId}, price: ${price}`);
                    } else {
                        INFO(`GetMinersPriceInfo[${miner.miner} power: ${power}, peerId: ${peerId} no price info`);
                    }
                }

            } catch (e) {
                INFO(`GetMinersPriceInfo[${miner.miner}] -> ${e}`);
            }

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

        await GetFILPrice();

        while (!stop) {
            let data = await GetMinersPriceInfo();
            console.log(data);

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
const config = require('./config');
const { INFO, ERROR, WARNING } = require('./logs');
const {
    FormatSize,
    TimeDeltaH,
    FormatPriceFIL,
    FormatPriceUSD,
    ToFIL,
    ToUSD,
    IsValidPriceFIL,
    ConvertToTBPricePerYear,
    ConvertBytesToGiB,
    FormatValue
} = require('./utils');
const { Lotus } = require("./lotus");
const { MinersClient } = require("./miners-client");
const { Regions, ISOCodeToRegion } = require("./location");
const { Near } = require('./near');
const CoinMarketCap = require('coinmarketcap-api')

var BigNumber = require('bignumber.js');

const coinMarketCap = new CoinMarketCap(config.bot.coinmarketcap_apikey);

let stop = false;
let lotus = new Lotus(config.bot.lotus_api);
let locationMap = new Map();
let minersSet = new Set();
let near = new Near();

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

    //const miners = Array.from(minersSet);

    const miners = [
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
    ];

    INFO(`GetMinersPriceInfo for ${miners?.length} miners`);
    let asia = 0;
    let north_america = 0;
    let other = 0;
    let europe = 0;

    if (miners?.length) {
        var minersSlice = miners;
        while (minersSlice.length) {
            await Promise.all(minersSlice.splice(0, config.bot.lotus_api_rps).map(async (miner) => {
                try {
                    let peerId = (await lotus.StateMinerInfo(miner))?.data?.result?.PeerId;
                    let power_response = (await lotus.StateMinerPower(miner))?.data?.result;

                    let power = power_response?.MinerPower?.QualityAdjPower;

                    if (!power || !peerId) {
                        INFO(`GetMinersPriceInfo[${miner}] power: ${power}, peerId: ${peerId} skip, invalid power or peerId`);
                    } else {
                        let region = ISOCodeToRegion(locationMap.get(miner));

                        switch (region) {
                            case Regions['Other']:
                                other++;
                                break;
                            case Regions['Europe']:
                                europe++;
                                break;
                            case Regions['Asia']:
                                asia++;
                                break;
                            case Regions['North America']:
                                north_america++
                                break;
                            default:
                                ERROR(`CalculateAverages[${miner}] invalid region ${region}`);
                        }

                        let ask = await lotus.ClientQueryAsk(peerId, miner);
                        let price = ask?.data?.result?.Price;
                        if (price && IsValidPriceFIL(price)) {
                            let miner_data = {
                                miner: miner,
                                power: power,
                                price: ConvertToTBPricePerYear(price),
                                region: region,
                            }
                            
                            result.push(miner_data);

                            INFO(`GetMinersPriceInfo[${miner}] power: ${power}, peerId: ${peerId}, price: ${price}`);
                        } else {
                            INFO(`GetMinersPriceInfo[${miner}] power: ${power}, peerId: ${peerId} skip, no price info`);
                        }
                    }

                } catch (e) {
                    if (e?.code != 'ECONNABORTED') {
                        INFO(`GetMinersPriceInfo[${miner}] -> ${e}`);
                    } else {
                        INFO(`GetMinersPriceInfo[${miner}] skip, no price info`);
                    }
                }
            }));

            if (stop) {
                break;
            }

        }
    }

    return {
        active_per_region: {
            europe: europe,
            asia: asia,
            north_america: north_america,
            other: other,
        },
        miners: result
    };
}

async function CalculateAverages(miners) {
    let result = [];
    let filPrice = await GetFILPrice();
    let filPriceBN = new BigNumber(filPrice);

    let globalPrice = new BigNumber(0);
    let asiaPrice = new BigNumber(0);
    let northAmericaPrice = new BigNumber(0);
    let otherPrice = new BigNumber(0);
    let europePrice = new BigNumber(0);

    let globalCount = 0;
    let asiaCount = 0;
    let northAmericaCount = 0;
    let otherCount = 0;
    let europeCount = 0;

    if (!filPrice || filPriceBN.isNaN()) {
        ERROR(`CalculateAverages[${m.miner}] invalid FIL price ${filPrice}`);
        return result;
    }

    for (const m of miners) {
        let priceUSD = ToUSD(ToFIL(m.price), filPrice);
        let priceUSD_BN = new BigNumber(priceUSD);

        if (!priceUSD_BN.isNaN()) {
            switch (m.region) {
                case Regions['Other']:
                    globalPrice = globalPrice.plus(priceUSD_BN);
                    otherPrice = otherPrice.plus(priceUSD_BN);
                    globalCount++;
                    otherCount++;
                    break;
                case Regions['Europe']:
                    globalPrice = globalPrice.plus(priceUSD_BN);
                    europePrice = europePrice.plus(priceUSD_BN);
                    globalCount++;
                    europeCount++;
                    break;
                case Regions['Asia']:
                    globalPrice = globalPrice.plus(priceUSD_BN);
                    asiaPrice = asiaPrice.plus(priceUSD_BN);
                    globalCount++;
                    asiaCount++;
                    break;
                case Regions['North America']:
                    globalPrice = globalPrice.plus(priceUSD_BN);
                    northAmericaPrice = northAmericaPrice.plus(priceUSD_BN);
                    globalCount++;
                    northAmericaCount++
                    break;
                default:
                    ERROR(`CalculateAverages[${m.miner}] invalid region ${m.region}`);
            }

            result.push({
                id: m.miner,
                region: m.region,
                power: ConvertBytesToGiB(m.power),
                price: parseFloat(ToFIL(m.price)),
            });
        }
    }

    return {
        FIL_price: parseFloat(filPriceBN),
        global_price: parseFloat(globalPrice.dividedBy(globalCount)),
        price_per_region: {
            europe: europePrice.dividedBy(europeCount).decimalPlaces(4).toFixed(),
            asia: asiaPrice.dividedBy(asiaCount).decimalPlaces(4).toFixed(),
            north_america: northAmericaPrice.dividedBy(northAmericaCount).decimalPlaces(4).toFixed(),
            other: otherPrice.dividedBy(otherCount).decimalPlaces(4).toFixed(),
        },
        storage_providers: result
    };
}

const pause = (timeout) => new Promise(res => setTimeout(res, timeout * 1000));

const mainLoop = async _ => {
    try {
        INFO('FilMarket Bot start');
        INFO('NEAR Init');
        await near.Init();

        while (!stop) {
            await RefreshMinersList();
    
            let miners_data = await GetMinersPriceInfo();
            let data = await CalculateAverages(miners_data.miners);

            await near.SetActivePerRegion(miners_data.active_per_region);
            await near.UpdateStorageProviders(data.storage_providers);
            await near.SetGlobalPrice(data.global_price);
            await near.SetFILPrice(data.FIL_price);
            await near.SetPricePerRegion(data.price_per_region);

            INFO(`Average global price: ${JSON.stringify(data.price_per_region)}`);
            INFO(`Average price per region: ${JSON.stringify(data.price_per_region)}`);
            INFO(`Active per region: ${JSON.stringify(miners_data.active_per_region)}`);

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
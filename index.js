const config = require('./config');
const { INFO, ERROR, WARNING } = require('./logs');
const {
    ToFIL,
    ToUSD,
    IsValidPriceFIL,
    ConvertToTiBPricePerYear,
    ConvertBytesToGiB,
    FormatFloatValue,
    FormatIntValue
} = require('./utils');
const { Lotus } = require("./lotus");
const { MinersClient } = require("./miners-client");
const { Regions, ISOCodeToRegion } = require("./location");
const { Near } = require('./near');
const CoinMarketCap = require('coinmarketcap-api');

const sp_list = require('./sp-list.json');

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

    const miners = Array.from(minersSet);
    //const miners = sp_list.miners;

    INFO(`GetMinersPriceInfo for ${miners?.length} miners`);
    let asia = 0;
    let north_america = 0;
    let other = 0;
    let europe = 0;
    let total_power = 0;

    if (miners?.length) {
        var minersSlice = miners;
        while (minersSlice.length) {
            await Promise.all(minersSlice.splice(0, config.bot.lotus_api_rps).map(async (miner) => {
                try {
                    let peerId = (await lotus.StateMinerInfo(miner))?.data?.result?.PeerId;
                    let power_response = (await lotus.StateMinerPower(miner))?.data?.result;

                    if (!total_power) {
                        let total_powerBN = new BigNumber(power_response?.TotalPower?.QualityAdjPower);
                        total_power = parseInt(total_powerBN.dividedBy(Math.pow(1024, 4)));
                    }

                    let power = power_response?.MinerPower?.QualityAdjPower;
                    let powerValue = parseInt(power);

                    if (isNaN(powerValue) ||  powerValue <= 0 || !peerId) {
                        INFO(`GetMinersPriceInfo[${miner}] power: ${power}, peerId: ${peerId} skip, invalid power or peerId`);
                    } else {
                        let region = ISOCodeToRegion(locationMap.get(miner));

                        switch (region) {
                            case 'Other':
                                other++;
                                break;
                            case'Europe':
                                europe++;
                                break;
                            case 'Asia':
                                asia++;
                                break;
                            case 'North America':
                                north_america++
                                break;
                            default:
                                ERROR(`CalculateAverages[${miner}] invalid region ${region}`);
                        }

                        let ask = await lotus.ClientQueryAsk(peerId, miner);
                        let price = ask?.data?.result?.Price;
                        let priceTiBPPerYear = ToFIL(ConvertToTiBPricePerYear(price));

                        if (price && IsValidPriceFIL(price) && (parseFloat(priceTiBPPerYear) < parseFloat(config.bot.max_TiB_price_per_year))) {

                            let miner_data = {
                                miner: miner,
                                power: power,
                                price: priceTiBPPerYear,
                                region: Regions[region],
                            }
                            
                            result.push(miner_data);

                            INFO(`GetMinersPriceInfo[${miner}] power: ${power}, price: ${price} , priceTiBPPerYear: ${priceTiBPPerYear}`);
                        } else {
                            INFO(`GetMinersPriceInfo[${miner}] power: ${power}, price: ${price} , priceTiBPPerYear: ${priceTiBPPerYear}, skip, invalid price`);
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
        total_power: total_power,
        miners: result
    };
}

async function CalculateAverages(miners, total_power) {
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
        let priceUSD = ToUSD(m.price, filPrice);
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
                price: parseFloat(m.price),
            });
        }
    }

    let valueEurope = parseFloat(europePrice.dividedBy(europeCount));
    let valueAsia = parseFloat(asiaPrice.dividedBy(asiaCount));
    let valueNorthAmerica = parseFloat(northAmericaPrice.dividedBy(northAmericaCount));
    let valueOther = parseFloat(otherPrice.dividedBy(otherCount));
    let valueGlobal = parseFloat(globalPrice.dividedBy(globalCount));
    let valueFILPrice = parseFloat(filPriceBN);
    let valueTimestamp = parseInt(Math.floor(Date.now() / 1000));

    return {
        price_per_region: {
            europe: FormatFloatValue(valueEurope),
            asia: FormatFloatValue(valueAsia),
            north_america: FormatFloatValue(valueNorthAmerica),
            other: FormatFloatValue(valueOther),
            global: FormatFloatValue(valueGlobal),
            fil_price: FormatFloatValue(valueFILPrice),
            power: total_power,
            timestamp: FormatIntValue(valueTimestamp),
        },
        storage_providers: result
    };
}

async function FilterStorageProviders(storage_providers) {
    const spsSet = new Set();
    const spsFromContractMap = new Map();
    let storage_providers_update = [];
    let storage_providers_delete = [];
    let update_reason_price = 0;
    let update_reason_region = 0;
    let update_reason_power = 0;
    let update_reason_new = 0;

    if (storage_providers?.length) {
        storage_providers.forEach(sp => {
            spsSet.add(sp.id);
        });
    }

    let storage_providers_from_contract = await near.GetStorageProviders();
    if (storage_providers_from_contract?.length) {
        storage_providers_from_contract.forEach(sp => {
            spsFromContractMap.set(sp.id, sp);
        });
    }

    storage_providers.forEach(sp => {
        if (!spsFromContractMap.has(sp.id)) {
            update_reason_new++;
            storage_providers_update.push(sp);
        } else {
            let spFromContract = spsFromContractMap.get(sp.id);
            if ((spFromContract.price != sp.price) && (sp.timestamp - spFromContract.timestamp > 7*24*3600)) {
                update_reason_price++;
                storage_providers_update.push(sp);
            } else if ((spFromContract.power != sp.power) && (sp.timestamp - spFromContract.timestamp > 7*24*3600)) {
                update_reason_power++;
                storage_providers_update.push(sp);
            }
        }
    });

    storage_providers_from_contract.forEach(sp => { 
        if (!spsSet.has(sp.id)) {
            storage_providers_delete.push(sp.id);
        }
    });

    INFO(`FilterStorageProviders total [${storage_providers.length}] , update [${storage_providers_update.length}] , delete [${storage_providers_delete.length}]`);
    INFO(`FilterStorageProviders update_reason_price : ${update_reason_price} `);
    INFO(`FilterStorageProviders update_reason_power : ${update_reason_power} `);
    INFO(`FilterStorageProviders update_reason_region : ${update_reason_region} `);
    INFO(`FilterStorageProviders update_reason_new : ${update_reason_new} `);

    //Remove max 10 storage providers per cycle
    if (storage_providers_delete.length > 10) {
        WARNING(`FilterStorageProviders delete [${storage_providers_delete.length}] exceeds maximum of 10`);
        storage_providers_delete = storage_providers_delete.splice(0, 10);
    }

    return { storage_providers_update: storage_providers_update, storage_providers_delete: storage_providers_delete };

}

const pause = (timeout) => new Promise(res => setTimeout(res, timeout * 1000));

const mainLoop = async _ => {
    try {
        INFO('FilMarket Bot start');
        INFO('NEAR Init');
        await near.Init();

        while (!stop) {
            const start = Date.now();

            await RefreshMinersList();
    
            let miners_data = await GetMinersPriceInfo();
            let data = await CalculateAverages(miners_data.miners, miners_data.total_power);

            await near.SetActivePerRegion(miners_data.active_per_region);
            await near.SetPricePerRegion(data.price_per_region);

            let filter = await FilterStorageProviders(data.storage_providers);

            if (filter.storage_providers_update?.length > 0) {
                await near.UpdateStorageProviders(filter.storage_providers_update);
            }

            // Disable
            /*
            if (filter.storage_providers_delete?.length > 0) {
                await near.DeleteStorageProviders(filter.storage_providers_delete);
            }
            */

            INFO(`Average price per region: ${JSON.stringify(data.price_per_region)}`);
            INFO(`Active per region: ${JSON.stringify(miners_data.active_per_region)}`);

            const duration = Math.round((Date.now() - start) / 1000);

            const sleep = (duration < 24 * 3600) ? (24 * 3600 - duration) : 30;

            INFO(`Pause for ${sleep} seconds`);
            await pause(sleep);
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
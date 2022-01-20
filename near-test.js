const { Near } = require('./near');

(async () => {
    let near = new Near();
    await near.Init();

    let active_per_region = {
        europe: 4,
        asia: 5,
        north_america: 6,
        other: 7,
    };

    let price_per_region = {
        europe: '0.00013 USD',
        asia: '0.0004 USD',
        north_america: '0.0002 USD',
        other: '0.00005 USD',
    };

    let storage_providers = [
        {
            id: "id3",
            region: "europe",
            power: "500000",
            price: "0.001 USD",
            price_fil: "20 nanoFIL"
        },
        {
            id: "id4",
            region: "asia",
            power: "600000",
            price: "0.003 USD",
            price_fil: "30 nanoFIL"
        },
    ];

    await near.UpdateStorageProviders(storage_providers);
    await near.SetActivePerRegion(active_per_region);
    await near.SetPricePerRegion(price_per_region);

    console.log(await near.GetStorageProviders());
    console.log(await near.GetActivePerRegion());
    console.log(await near.GetPricePerRegion());
}
)();
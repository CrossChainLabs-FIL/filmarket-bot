const { Regions } = require("./location");
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
        europe: 0.00013,
        asia: 0.0004,
        north_america: 0.0002,
        other: 0.00005,
        global: 0.00034,
        fil_price: 64.245,
        timestamp: 1,
    };

    let storage_providers = [
        {
            id: "id1",
            region: Regions['Europe'],
            power: 64,
            price: 0.001,
        },
        {
            id: "id2",
            region: Regions['Asia'],
            power: 128,
            price: 0.003
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
const { Regions } = require("./location");
const { Near } = require('./near');

(async () => {
  let near = new Near();
  await near.Init();

  ////////////////////////////////////////////////////
  /// DeletePricePerRegion ///
  ////////////////////////////////////////////////////
  // NOTE : don't delete the latest datapoint -> affects top cards

  const timestamps = [
    1675610083
  ];

  //console.log('DeletePricePerRegion');
  console.log(await near.DeletePricePerRegion(timestamps));

  let prices = await near.GetPricePerRegionList();

  for (const p of prices) {
    //console.log(p);

    var options = { day: 'numeric', month: 'short' };
    console.log(p.timestamp, new Date(p.timestamp * 1000).toLocaleDateString('en-US', options));
  }


  ////////////////////////////////////////////////////
  /// DeletePricePerRegion ///
  ////////////////////////////////////////////////////


  /*await near.UpdateStorageProviders(storage_providers);
  await near.SetActivePerRegion(active_per_region);
  await near.SetPricePerRegion(price_per_region);

  console.log(await near.GetStorageProviders());
  console.log(await near.GetActivePerRegion());
  console.log(await near.GetPricePerRegion());*/
}
)();
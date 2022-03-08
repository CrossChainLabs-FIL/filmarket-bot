const { Regions } = require("./location");
const { Near } = require('./near');

(async () => {
    let near = new Near();
    await near.Init();

    let storage_providers = await near.GetStorageProviders();
    let sps = {
        miners: []
    };

    storage_providers.forEach(sp => {
        sps.miners.push(sp.id);
        
    });

    var jsonData = JSON.stringify(sps);

    var fs = require('fs');
    fs.writeFile("sp-list.json", jsonData, function (err) {
        if (err) {
            console.log(err);
        }
    });
}
)();
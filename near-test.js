const { Near } = require('./near');

(async () => {
    let near = new Near();
    await near.Init();
}
)();
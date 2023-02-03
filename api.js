const config = require('./config');
var express = require("express");

const timestamp = require('time-stamp');
var fs = require('fs');

const { INFO, ERROR, WARNING } = require('./logs');

let sps_data = {};
let api_calls = 0;

const app = express();

async function RefreshStorageProvidersData() {
    try {
        fs.readFile(config.bot.sps_info, (err, raw_data) => {
            let data = JSON.parse(raw_data);

            if (err) {
                ERROR(`[RefreshStorageProvidersData] error : ${err}`);
            } else if (data) {
                sps_data = data;
                INFO(`[RefreshStorageProvidersData] successful`);
            }
        })

    } catch (error) {
        ERROR(`[RefreshStorageProvidersData] error : ${error}`);
    }
}

async function SaveAccessLogs() {
    try {
        fs.appendFile(config.bot.access_logs, `${timestamp.utc('YYYY/MM/DD-HH:mm:ss:ms')} - ${api_calls} last 24 hours\n`, (err) => {
            if (err) {
                ERROR(`[SaveAccessLogs] error : ${err}`);
            } else {
                INFO(`[SaveAccessLogs] successful`);
                api_calls = 0;
            }
        });
    } catch (error) {
        ERROR(`[SaveAccessLogs] error : ${error}`);
    }
}

RefreshStorageProvidersData();
setInterval(RefreshStorageProvidersData, 24 * 3600 * 1000);
setInterval(SaveAccessLogs,24 * 3600 * 1000);

function error_response(code, msg, res) {
    res.status(code).send(msg);
}

app.get('/storage-providers', (req, res, next) => {
    INFO(`GET[/storage-providers]`);
    console.log(req.connection.remoteAddress);
    try {
     
        if (sps_data) {
            INFO(`GET[/storage-providers] succesful`);

            api_calls++;
            res.json(sps_data);
        } else {
            error_response(404, ``, res);
        }

    } catch (e) {
        ERROR(`GET[/storage-providers]: error: ${e}`);
        error_response(404, ``, res);
    }
});

app.listen(config.bot.port, () =>
  console.log(`Server listening on port ${config.bot.port}`),
);
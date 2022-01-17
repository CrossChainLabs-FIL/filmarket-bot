function FormatSize(bytes, decimals = 2) {
    if (0 === bytes) return "0 Bytes";
    const c = 0 > decimals ? 0 : decimals;
    const d = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, d)).toFixed(c)) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d];
}

function TimeDeltaH(timestamp) {
    return (Math.abs(Date.now() - timestamp) / (1000 * 3600)).toFixed();
}

module.exports = {
    FormatSize,
    TimeDeltaH,
};
var BigNumber = require('bignumber.js');

const TB = 931.32257461548 //GiB

function FormatSize(bytes, decimals = 2) {
    if (0 === bytes) return "0 Bytes";
    const c = 0 > decimals ? 0 : decimals;
    const d = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, d)).toFixed(c)) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d];
}

function TimeDeltaH(timestamp) {
    return (Math.abs(Date.now() - timestamp) / (1000 * 3600)).toFixed();
}

function ToUSD(fil, filPriceUSD) {
    let f = new BigNumber(fil);
    let p = new BigNumber(filPriceUSD);

    if (f.isNaN() || p.isNaN()) {
        return 'N/A';
    }

    if (f.isZero() || p.isZero()) {
        return '0';
    }

    return `${f.multipliedBy(p).decimalPlaces(18).toFixed()}`;
}

function ToFIL(attoFil) {
    let atto = new BigNumber(attoFil);

    if (atto.isNaN()) {
        return 'N/A';
    }

    if (atto.isZero()) {
        return '0';
    }

    return `${atto.shiftedBy(-18).decimalPlaces(18).toFixed()}`;
}

function FormatPriceFIL(attoFil) {
  let atto = new BigNumber(attoFil);

  if (atto.isNaN()) {
    return 'N/A';
  }

  if (atto.isZero()) {
    return '0 FIL';
  }

  if (atto.isGreaterThanOrEqualTo(BigNumber(10).pow(14))) {
    return `${atto.shiftedBy(-18).decimalPlaces(4).toFixed()} FIL`;
  }

  if (atto.isGreaterThanOrEqualTo(BigNumber(10).pow(5))) {
    return `${atto.shiftedBy(-9).decimalPlaces(4).toFixed()} nanoFIL`;
  }

  return `${atto.toFixed()} attoFIL`;
}

function IsValidPriceFIL(attoFil) {
    let valid = true;
    let atto = new BigNumber(attoFil);

    if (atto.isNaN()) {
      return false;
    }
  
    if (atto.isGreaterThanOrEqualTo(BigNumber(10).pow(12))) {
        valid = false;
    }

    return valid;
}

function FormatPriceUSD(priceUSD) {
    let price = new BigNumber(priceUSD);

    if (price.isNaN()) {
        return 'N/A';
    }

    if (price.isZero()) {
        return '0 USD';
    }

    return `${price.decimalPlaces(8).toFixed()} USD`;
}

function ConvertToTBPrice(priceGiB) {
    let price = new BigNumber(priceGiB);

    if (price.isNaN()) {
        return 'N/A';
    }

    if (price.isZero()) {
        return '0 USD';
    }

    return `${price.multipliedBy(TB).decimalPlaces(8).toFixed()}`;

}

module.exports = {
    FormatSize,
    TimeDeltaH,
    FormatPriceFIL,
    FormatPriceUSD,
    ToFIL,
    ToUSD,
    IsValidPriceFIL,
    ConvertToTBPrice,
};
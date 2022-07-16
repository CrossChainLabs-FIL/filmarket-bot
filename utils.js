var BigNumber = require('bignumber.js');

const TB = 931.32257461548; //GiB
const TiB = 1024; //GiB
const EPOCHS = 1051200; //epochs per year

function FormatSize(bytes, decimals = 2) {
    if (0 === bytes) return "0 Bytes";
    const c = 0 > decimals ? 0 : decimals;
    const d = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, d)).toFixed(c)) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d];
}

function ConvertBytesToGiB(bytes) {
    if (0 === bytes) return 0;
    return (bytes / ( Math.pow(1024, 3) ));
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

function FormatValue(value, decimals) {
    let valueBN = new BigNumber(value);

    if (valueBN.isNaN()) {
        return 'N/A';
    }

    if (valueBN.isZero()) {
        return '0';
    }

    return `${valueBN.decimalPlaces(decimals).toFixed()}`;
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

    if (atto.isLessThan(BigNumber(0))) {
        valid = false;
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

    return `${price.decimalPlaces(4).toFixed()} USD`;
}

function ConvertToTiBPricePerYear(askPrice) {    
    let epochPriceGiB = new BigNumber(askPrice);
    let yearPriceGiB = epochPriceGiB.multipliedBy(EPOCHS);
  
    return `${yearPriceGiB.multipliedBy(TiB).decimalPlaces(8).toFixed()}`;
}

function FormatFloatValue(value) {
    if (isNaN(value)) {
        return 0.0;
    }

    return value;
}

function FormatIntValue(value) {
    if (isNaN(value)) {
        return 0.0;
    }

    return value;
}

module.exports = {
    FormatSize,
    TimeDeltaH,
    FormatPriceFIL,
    FormatPriceUSD,
    ToFIL,
    ToUSD,
    IsValidPriceFIL,
    ConvertToTiBPricePerYear,
    ConvertBytesToGiB,
    FormatValue,
    FormatFloatValue,
    FormatIntValue
};
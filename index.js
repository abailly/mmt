/*
  From https://comtrade.un.org/data/doc/api/#DataAvailabilityRequests

  Returns a JSON structure that looks like the following:

  {
  "validation": {
    "status": {
    ...
    },
    "message": null,
    "count": {
    ...
    },
    "datasetTimer": {
    ...
    }
  },
  "dataset": [
    {
      "pfCode": "H5",
      "yr": 2018,
      "period": 2018,
      "periodDesc": "2018",
      "rgCode": 1,
      "rgDesc": "Import",
      "rtCode": 251,
      "rtTitle": "France",
      "ptCode": 0,
      "ptTitle": "World",
      "cmdCode": "TOTAL",
      "cmdDescE": "All Commodities",
      "TradeValue": 659374522338,
    },
    {
      "yr": 2018,
      "period": 2018,
      "periodDesc": "2018",
      "rgDesc": "Export",
      "rtCode": 251,
      "rtTitle": "France",
      "ptCode": 0,
      "ptTitle": "World",
      "cmdCode": "TOTAL",
      "cmdDescE": "All Commodities",
      "TradeValue": 568535879844,
    },
    {
      "pfCode": "H5",
      "yr": 2018,
      "period": 2018,
      "periodDesc": "2018",
      "rgCode": 1,
      "rgDesc": "Import",
      "rtCode": 276,
      "rtTitle": "Germany",
      "ptCode": 0,
      "cmdCode": "TOTAL",
      "cmdDescE": "All Commodities",
      "TradeValue": 1292726052270,
    },
    {
      "pfCode": "H5",
      "yr": 2018,
      "period": 2018,
      "periodDesc": "2018",
      "rgCode": 2,
      "rgDesc": "Export",
      "rtCode": 276,
      "rtTitle": "Germany",
      "cmdCode": "TOTAL",
      "cmdDescE": "All Commodities",
      "TradeValue": 1562418816337,

    }
  ]
}

*/
const tradeUrl = "https://comtrade.un.org/api/get?r=276,251,826,842\&p=0\&px=HS\&ps=2018\&cc=TOTAL\&fmt=json\&rg=1,2";

const initialData = {fr: {imports: 0,
                        exports:0},
                     de: {imports: 0,
                          exports:0},
                     uk: {imports: 0,
                          exports:0},
                     us: {imports: 0,
                          exports:0},
                    };

/* Populate global `initialData` object with content from the
   raw data
*/
function populateTradeData(rawData, initialData) {
    rawData.dataset.forEach((rawTrade) => {
        var country = null;
        switch(rawTrade.rtCode) {
        case 276: // Germany
            country = "de";
            break;
        case 251: // France
            country = "fr";
            break;
        case 826: // United Kingdom
            country = "uk";
            break;
        case 842: // USA
            country = "us";
            break;
        default:
            // do nothing
        }

        // value is in billions (of USD?)
        if(rawTrade.rgCode == 1) {
            initialData[country].imports = rawTrade.TradeValue / 1000000000;
        } else {
            initialData[country].exports = rawTrade.TradeValue / 1000000000;
        }
    });
}

function initialiseTradeData() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', tradeUrl);
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                populateTradeData(JSON.parse(xhr.responseText), initialData);
            } catch(e) {
                // JSON.parse can throw a SyntaxError
                if (e instanceof SyntaxError) {
                    alert("invalid JSON payload" + xhr.responseText);
                }
                throw e;
            }
        } else {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };
    xhr.send();
};


var model = { taxes: 0,
              expenses:0,
              consumption:0,
              savings:0,
              investments:0,
              exports:0,
              imports:0,
              fni:0,
              gdp:0,
              gni:0 };

var formulas =
    { taxes: (model) => (model.gni - model.consumption - model.savings - model.fni),
      expenses: (model) => (model.gdp - model.consumption - model.investments - model.exports + model.imports),
      consumption: (model) => (model.gdp - model.investments - model.expenses - model.exports + model.imports),
      savings: (model) => (model.gni - model.consumption - model.taxes - model.fni),
      investments: (model) => (model.gdp - model.consumption - model.expenses - model.exports + model.imports),
      exports: (model) => (model.gdp - model.consumption - model.investments - model.expenses + model.imports),
      imports: (model) => (model.consumption + model.investments + model.expenses + model.exports - model.gdp),
      fni: (model) => (model.gni - model.consumption - model.taxes - model.savings),
      gdp: (model) => (model.gni),
      gni: (model) => (model.gdp)
    };

function updateModel(model, keys) {
    const newModel = clone(model);
    for(var k of Object.keys(model)) {
        if(keys.indexOf(k) == -1) {
            newModel[k] = formulas[k](model);
        }
    }
    return newModel;
}

function updateModelData(model, country) {
    const trade = initialData[country];
    for(var k of Object.keys(trade)) {
        model[k] = trade[k];
    }

    return updateModel(model, Object.keys(trade));
}

function clone(obj) {
    const copy = {};
    for(var k of Object.keys(obj)) {
        copy[k] = obj[k];
    }
    return obj;
}

function updateView(fromModel) {
    console.log(fromModel);
    for(var k of Object.keys(fromModel)) {
        document.getElementById(k).value = fromModel[k].toFixed(3);
    }
}

function setInputHandler(key) {
    const elem = document.getElementById(key);
    elem.addEventListener('change', handleChange);

    function handleChange(e) {
        const v = parseInt(elem.value);
        if(!isNaN(v)) {
            model[key] = v;
            model = updateModel(model, [key]);
        }
        updateView(model);
    }

}

// update from initial model
updateView(model);

// initialise trade data from external site
initialiseTradeData();

// load data from OECD
const oecdData = oecd().initialiseOECDData();

// handle changes in value for textual inputs
for(var k of Object.keys(model)) {
    setInputHandler(k);
}

// handle changes in selected country
function setCountryChangeHandler() {
    var rad = document.getElementsByName("country");
    console.log(rad);
    var prev = null; // selected radio
    for (var i = 0; i < rad.length; i++) {
        rad[i].addEventListener('click', function() {
            console.log(this);
            if (this !== prev) {
                prev = this;
                oecdData.updateData(initialData[prev.value], prev.value);
                model = updateModelData(model, prev.value);
                updateView(model);
            }
        });
    }
}

setCountryChangeHandler();

const oecdUrl = "https://stats.oecd.org/SDMX-JSON/data/SNA_TABLE2/__COUNTRIES__.AGG+B1_GS1+GDIS1+D1_D4NFRS2+K1MS1+P3S1+B8NS1.C/all?startTime=2018&endTime=2018&dimensionAtObservation=allDimensions";

const countries = { fr: "FRA",
                    de: "DEU",
                    uk: "GBR",
                    us: "USA" };

const measures = { gdp: "B1_GS1",
                   gni: "GDIS1",
                   fni: "D1_D4NFRS2",
                   savings: "B8NS1",
                   investments: "K1MS1",
                   consumption: "P3S1" };

/*
gdi = gni - fni
consumption = gdi - investment - savings + fni
 */

function listOfCountries(){
    const selectedCountries = [];
    for (var cty of Object.keys(countries)) {
        selectedCountries.push(countries[cty]);
    }

    return selectedCountries;
}

/* create a new object containing data for the given countries */
export default function oecd() {
    const obj = {};
    function initialiseOECDData() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', oecdUrl.replace("__COUNTRIES__", listOfCountries().join("+")));
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    obj.raw = JSON.parse(xhr.responseText);
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
        return obj;
    };

    function getCountryData(country) {
        const obsCty = obj.raw.structure.dimensions.observation.find(obs => obs.id === "LOCATION");
        const posOfCty = obsCty.keyPosition;
        const indexOfCty = obsCty.values.findIndex(cty => cty.id === countries[country]);

        const obsMeasures = obj.raw.structure.dimensions.observation.find(obs => obs.id === "TRANSACT");
        const posOfMeasures = obsMeasures.keyPosition;
        const indicesOfMeasures = {};
        for(var measure of Object.keys(measures)) {
            indicesOfMeasures[measure] = obsMeasures.values.findIndex(cty => cty.id === measures[measure]) ;
        }

        const countryData = {};
        for(var i of Object.keys(indicesOfMeasures)) {
            const key = [indexOfCty, indicesOfMeasures[i], "0", "0"].join(":");
            const obs = obj.raw.dataSets[0].observations[key];
            countryData[i] = obs ? obs[0] / 1000 : 0;
        }

        return countryData;
    };

    obj.initialiseOECDData = initialiseOECDData;
    obj.getCountryData = getCountryData;
    obj.updateData = function(model, country){
        const ctyData = obj.getCountryData(country);
        console.log(ctyData);
        for (var k of Object.keys(ctyData)) {
            model[k] = ctyData[k];
        }
        console.log(model);
    };

    return obj;
};

const proxyurl = "https://cors-anywhere.herokuapp.com/"; //some apis do not return the correct headers, this prox adds them at a small cost of speed
const covidBaseUrl = "https://api.covid19api.com";
const colourBaseUrl = "https://www.colourlovers.com/api";

var chartTotalConfirmed;
var chartDailyNewCases;
var error = {
    errObj: null,
    message: "Unknown error occurred",
    origin: null,
};
var sortedCountries = [];

var virusStatus = {
    confirmed: "confirmed",
    deaths: "deaths",
    recovered: "recovered",
    active: "active",
}

var multipleCountries = [];
var colourList = [];

$(document).ready(function () { 
    //TODO: Maybe a limit to how many countries you can compare at once.
    //can be moved into a setupUI function if things get messy    
    fillColourList();
    getListAllCountries(function () {
        fillCountrySelect($("#selCountry1"));  
        //set to start with South Africa and fire the change event
        $("#selCountry1").val("south-africa").change();
        
    });
    
    $("#selCountry1").change(function () {
        var countrySlug = $("#selCountry1").val();
        if(countrySlug != null){
            getCountryAllStatus(countrySlug, drawMultiCountryChart);
        }
    });
    $("#clear-graph").click(function(){
        clearChart();
    });
    $("#remove-country").click(function(){
        removeLastCountry();
    });    

});

function fillColourList() {    
    //Call a colour api to get back a list of colours to be used in the chart
    $.ajax({
        url: proxyurl + colourBaseUrl + "/colors?format=json",
        dataType: "json",
    })
        .done(function (response) {
            $.each(response, function (key, item) {
                if(item.hex != "FFFFFF"){//don't add white as it's too difficult to see 
                    colourList.push("#" + item.hex);
                }
            });            
            
        })
        .fail(function (err) {
            error.errObj = err;
            showError();
        })
        .always(function () {
            console.log("complete");
        });
}

function showLoading(status){
    if(status){
        $("#loading").removeClass("d-none");
    }else{
        $("#loading").addClass("d-none");
    }
}

function drawMultiCountryChart(multiCountryStatus) {
    $("#txtCountryCount").empty();      
    var ctx = $("#chartTotalConfirmed");
    //destroy any previous chart data before refilling
    if (chartTotalConfirmed) chartTotalConfirmed.destroy();
    if (multiCountryStatus.length > 0) {   
    chartTotalConfirmed = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',
        data: {
            labels: multiCountryStatus[0].days,
        },
        // Configuration options go here
        options: {

        }
    });
        $.each(multiCountryStatus, function (key, item) {
            var colour = setInitialColour(key);
            updateCountryCountLabel(key, item);
            chartTotalConfirmed.data.datasets.push({
                label: item.name,
                data: item.confirmed,
                borderColor: colour,
            });
            chartTotalConfirmed.update();
        });
        drawMultiCountryDailyCasesChart(multiCountryStatus);
    }
}
function setInitialColour(key){
    return (colourList.length === 0) ? "#000000" : colourList[key];
}
function drawMultiCountryDailyCasesChart(multiCountryStatus) {
    var ctx = $("#chartDailyNewCases");
    //destroy any previous chart data before refilling
    if (chartDailyNewCases) chartDailyNewCases.destroy();
    chartDailyNewCases = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',
        data: {
            labels: multiCountryStatus[0].days,
        },
        // Configuration options go here
        options: {

        }
    });

    if (multiCountryStatus.length > 0) {            
        $.each(multiCountryStatus, function (key, item) {    
            var colour = setInitialColour(key);
            var daily = []; 
            $.each(item.confirmed, function(ar, conf){
                var result = parseInt(item.confirmed[ar] - item.confirmed[ar - 1] || 0);
                daily.push(result);     
            })
            
            chartDailyNewCases.data.datasets.push({
                label: item.name,
                data: daily,
                borderColor: colour,
            });
            chartDailyNewCases.update();
        });
    }
}

function updateCountryCountLabel(key, country){
    $("#txtCountryCount").append("<tr><td>"+ country.name + "</td><td>"+ country.latestCount + "</td></tr>");    
}

function clearChart(){
    if (chartTotalConfirmed) chartTotalConfirmed.destroy();
    if (chartDailyNewCases) chartDailyNewCases.destroy();    
    multipleCountries = [];
    $("#txtCountryCount").empty();     
}
function removeLastCountry(){
    multipleCountries.pop();
    drawMultiCountryChart(multipleCountries);
}

function getCountryAllStatus(countrySlug, callback) {
    //Get all virus statuses for a particular country identified by the countrySlug
    var endPoint = covidBaseUrl + "/country/" + countrySlug;
    var country = {
        name: "",
        latestCount: 0,
        confirmed: [],
        deaths: [],
        recovered: [],
        active: [],
        days: []
    }
    showLoading(true);
    $.getJSON(endPoint, function (response) {
        if (response.length !== 0) {
            var latest = response[response.length - 1];
            country.name = latest.Country;
            country.latestCount = latest.Confirmed;
            //loop through the response and add all cases to the cases array
            //add all days to days array                    
            $.each(response, function (key, item) {
                if (item.Confirmed !== 0) {
                    country.confirmed.push(item.Confirmed);
                    country.deaths.push(item.Deaths);
                    country.recovered.push(item.Recovered);
                    country.active.push(item.Active);
                    country.days.push(item.Date);
                }
            });
        } else {
            error.message = "No data returned for this country";
        }
    })
        .done(function () {
            multipleCountries.push(country);
            callback(multipleCountries);
            showLoading(false);
        })
        .fail(function (err) {
            error.errObj = err;
            showError();
        })
        .always(function () {
            console.log("complete");
        });
}

function getStatusCountByCountry(cntry, vstatus, callback) {
    //Get all status counts for a particular country 
    var endPoint = covidBaseUrl + "/country/" + cntry + "/status/" + vstatus;

    var cases = [];
    var days = [];

    $.getJSON(endPoint, function (response) {
        if (response.length !== 0) {
            var lastOne = response.length - 1;
            var resp = response[lastOne];

            $("#txtCountry").text(resp.Country);
            $("#txtConfirmedCount").text(resp.Cases);

            //loop through the response and add all cases to the cases array
            //add all days to days array        
            $.each(response, function (key, item) {
                if (item.Cases !== 0) {
                    cases.push(item.Cases);
                    days.push(item.Date);
                }
            });
        } else {
            error.message = "No data returned for this country";
            showError(error);
        }
    })
        .done(function () {
            //call drawChart and pass in both arrays
            if (callback) callback(chart, days, data);
        })
        .fail(function () {
            error.message = "Error: ";
        })
        .always(function () {
            console.log("complete");
        });
}

function getListAllCountries(callback) {
    //Get a list of all countries that the api has available
    var endPoint = covidBaseUrl + "/countries";
    $.getJSON(endPoint, function (response) {
        //sort the returned response into a sorted array
        sortedCountries = response.sort(compareCountry);
    })
        .done(function () {
            callback();
        })
        .fail(function (err) {
            error.errObj = err;
            showError();
        })
        .always(function () {
            console.log("complete");
        });
}
function compareCountry(itemA, itemB) {
    //compare the country property of each object in order to sort alphabetically
    const countryA = itemA.Country.toUpperCase();
    const countryB = itemB.Country.toUpperCase();

    if (countryA > countryB) {
        return 1;
    } else if (countryA < countryB) {
        return -1;
    }
    return 0;
}
function fillCountrySelect(element) {
    if (sortedCountries.length !== 0) {
        $.each(sortedCountries, function (key, item) {
            //fill the country selects from the sorted array
            element.append("<option value='" + item.Slug + "'>" + item.Country + "</option>");
        });
    } else {
        error.message = "No countries in list";
    }
}

function showError() {
    if (error.errObj.responseJSON !== undefined) {
        var errText = (error.errObj.responseJSON.message === null) ? "No returned error" : error.errObj.responseJSON.message; 
        $("#error").html("Error Status: " + error.errObj.status + "<br/>" + errText);
    } else {
        $("#error").html("Error: <br/>" + error.message);
    }

    $('#errorModal').modal();
}


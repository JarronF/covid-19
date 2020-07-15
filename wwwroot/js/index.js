const proxyurl = "https://cors-anywhere.herokuapp.com/";
const covidBaseUrl = "https://api.covid19api.com";
const colourBaseUrl = "https://www.colourlovers.com/api";


var chart;
var error = {
    errObj: null,
    message: "",
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
    //can be moved into a setupUI function if things get messy    
    fillColourList();

    getListAllCountries(function () {
        fillCountrySelect($("#selCountry1"));
        fillCountrySelect($("#selCountry2"));
        //getCountryAllStatus("south-africa", function (multiCountry) {
        //    drawChart(multiCountry);
        //});
    });


    $("#selCountry1").change(function () {
        var countrySlug = $("#selCountry1").val();
        //getStatusCountByCountry(countrySlug, virusStatus.confirmed, drawChart);
        getCountryAllStatus(countrySlug, drawMultiCountryChart);
    });
    $("#selCountry2").change(function () {
        var countrySlug = $("#selCountry2").val();
        //getStatusCountByCountry(countrySlug, virusStatus.confirmed, addData);
        getCountryAllStatus(countrySlug, addData);
    });
});

function fillColourList() {
    $.ajax({
        url: proxyurl + colourBaseUrl + "/colors?format=json",
        dataType: "json",
    })
        .done(function (response) {
            $.each(response, function (key, item) {
                colourList.push("#" + item.hex);
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

function drawChart(multiCountryStatus) {
    if (multiCountryStatus.length === 1) {
        var countryStatus = multiCountryStatus[0];
        $("#txtCountry").text(countryStatus.name);
        $("#txtConfirmedCount").text(countryStatus.latestCount);

        var ctx = $("#chart1");
        //destroy any previous chart data before refilling
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            // The type of chart we want to create
            type: 'line',
            // The data for our dataset
            data: {
                labels: countryStatus.days,
                datasets: [
                    {
                        label: 'Confirmed',
                        borderColor: 'rgb(255,140,0)',
                        data: countryStatus.confirmed,
                    },
                    {
                        label: 'Deaths',
                        borderColor: 'rgb(255,0,0)',
                        data: countryStatus.deaths,
                    },
                    {
                        label: 'Recovered',
                        borderColor: 'rgb(50,205,50)',
                        data: countryStatus.recovered,
                    },
                    {
                        label: 'Active',
                        borderColor: 'rgb(0,0,255)',
                        data: countryStatus.active,
                    }
                ]
            },
            // Configuration options go here
            options: {

            }
        });
    } else {
        error.message = "Please use drawMultiCountryChart instead";
        showError();
    }
}

function drawMultiCountryChart(multiCountryStatus) {
    //$("#txtCountry").text(countryStatus.name);
    //$("#txtConfirmedCount").text(countryStatus.latestCount);
    var ctx = $("#chart1");
    //destroy any previous chart data before refilling
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
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
            chart.data.datasets.push({
                label: item.name,
                data: item.confirmed,
                borderColor: colourList[key],
            });
            chart.update();
        });
    }
}

function getCountryAllStatus(countrySlug, callback) {
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
    //compare the country property of each object
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
    if (error.errObj !== null) {
        $("#error").html("Error Status: " + error.errObj.status + "<br/>" + error.errObj.responseJSON.message);
    } else {
        $("#error").html("Error: <br/>" + error.message);
    }

    $('#errorModal').modal();
}


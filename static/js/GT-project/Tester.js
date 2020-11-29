// added url restriction to allow API key to work with Heroku only
var API_KEY = "pk.eyJ1IjoiYXBpenpvMSIsImEiOiJja2Z1NHg4OXkwZnU5MnVzOW84bGFjd3drIn0.BjLNMe6XzDecA7hN8NEgGg"
// add light tile layer 
var light = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: API_KEY
});

// grayscale layer
var grayscale = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/dark-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: API_KEY
});

// map boundary styling
// source: https://leafletjs.com/examples/choropleth/
function style(feature) {
    return {
        fillColor: "white",
        weight: 2,
        color: 'black',
        dashArray: '3',
        fillOpacity: 0.1
    };
}

// variable initialize
var datetoPass;
var contained_fires = [];
var active_fires = [];
var previously_active_fires = [];
var total_active_fires = [];
var protestMarkers_heat = [];
var protest_icons = [];
var slider_div = d3.select("#slider-date");
var dateSlider = document.getElementById('slider-date');
slider_div.attr("current_time", 1577854861000);
d3.select("#date_select").text(`Date selected: January 1, 2020`);
var stategeoJson;
var map_component = d3.select('#map');
map_component.attr("state_name", "None");
var contained_fires_counter = 0;
var active_fires_counter = 0;
var protest_counter = 0;
var state = null;
var compare_coords = [];
var compare_coords_active_fire = [];
var compare_coords_prev_active_fire = [];
var compare_coords_protests = [];
var containedFireLayer = new L.LayerGroup();
var activeFireLayer = new L.LayerGroup();
var protestIconLayer = new L.LayerGroup();
var heat = new L.LayerGroup();

// set basemaps
var baseMaps = {
    Light: light,
    Dark: grayscale
};

// set overlay maps
var overlayMaps = {
    "Active Fires": activeFireLayer,
    "Fires Contained": containedFireLayer,
    Protests: protestIconLayer,
    "Protests heat map": heat
};

// / create map object
var myMap = L.map("map", {
    // center of the United States
    center: [39.8, -98.6],
    zoom: 4,
    layers: [light, containedFireLayer]
});

// adding layer control to map
var layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(myMap);;

// contained fire icon
var contained_fire_icon = L.divIcon({
    html: '<i class="fas fa-fire-extinguisher fa-lg"></i>',
    iconSize: [20, 20],
    className: 'containedFireIcon'
});

// active fire icon
var fire_icon = L.divIcon({
    html: '<i class="fas fa-fire fa-lg"></i>',
    iconSize: [20, 20],
    className: 'fireIcon'
});

// protest icon
var protest_icon = L.divIcon({
    html: '<i class="fas fa-bullhorn fa-lg"></i>',
    iconSize: [20, 20],
    className: 'protestIcon'
});

// call init function when page loads with 1/1/20
init(1577923200000);

function init(date) {
    // set date to pass to other functions (from slider handle read)
    datetoPass = date;

    // clear existing layers
    containedFireLayer.clearLayers();
    activeFireLayer.clearLayers();
    heat.clearLayers();
    protestIconLayer.clearLayers();

    // clearing previous contained fire data
    contained_fires.length = 0;
    compare_coords.length = 0;
    // clearing active fire and previously active fire data
    compare_coords_active_fire.length = 0;
    compare_coords_prev_active_fire.length = 0;
    // clearing protest data
    compare_coords_protests.length = 0;

    // convert date for use in contained fire API call
    date_start = moment.unix(date / 1000).format('YYYY-MM-DD');

    // add one day to handle slider for use in contained fire API call
    var plus_one_day = parseInt(date) + (60 * 60 * 24 * 1000);
    date_end = moment.unix(plus_one_day / 1000).format('YYYY-MM-DD');

    // active fires API call

    // clearing active fire data
    active_fires.length = 0;
    var active_fire_url = `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Public_Wildfire_Perimeters_View/FeatureServer/0/query?where=CreateDate%20%3E%3D%20TIMESTAMP%20'2020-01-01%2000%3A00%3A00'%20AND%20CreateDate%20%3C%3D%20TIMESTAMP%20'${date_end}%2000%3A00%3A00'&outFields=*&outSR=4326&f=json`;
    d3.json(active_fire_url).then(function (response) {
        console.log(response.features.length);
        var active_fire_markers;
        for (var i = 0; i < response.features.length; i++) {
            try {
                // get coordinates from first polygon ring for each fire
                var polygon_array_active_fire = response.features[i].geometry.rings[0];

                // switching lat and lng positions for plotting
                var new_poly_array_active_fire = [];
                for (var j = 0; j < polygon_array_active_fire.length; j++) {
                    var latlng_active_fire = [polygon_array_active_fire[j][1], polygon_array_active_fire[j][0]];
                    new_poly_array_active_fire.push(latlng_active_fire);
                }

                // create polygon for each fire's first geometry ring
                var polygon_active_fire = L.polygon(new_poly_array_active_fire);

                // get center of polygon ring for plotting
                var polygon_center_active_fire = polygon_active_fire.getBounds().getCenter();

                // create string arrays to identify duplicate fires
                var string_unique_active_fires = JSON.stringify(compare_coords_active_fire);
                var string_poly_center_active_fire = JSON.stringify([polygon_center_active_fire.lat, polygon_center_active_fire.lng]);
                // if fire is unique, add to active fires array, which will be plotted
                if (string_unique_active_fires.indexOf(string_poly_center_active_fire) == -1) {
                    compare_coords_active_fire.push([polygon_center_active_fire.lat, polygon_center_active_fire.lng]);
                    // create popup for active fires
                    var popup_active_fires = '';
                    // if acres value is null, set to "unknown"
                    if (response.features[i].attributes["GISAcres"] == null) {
                        popup_active_fires = `Fire Name: ${response.features[i].attributes["IncidentName"]}<br>Acres: Unknown`;
                    }
                    else {
                        popup_active_fires = `Fire Name: ${response.features[i].attributes["IncidentName"]}<br>Acres: ${(response.features[i].attributes["GISAcres"]).toFixed(2)}`
                    }
                    // push all active fire points to array active fire layer
                    active_fires.push(L.marker([polygon_center_active_fire.lat, polygon_center_active_fire.lng], { icon: fire_icon }).bindPopup(popup_active_fires));
                    active_fire_markers = L.marker([polygon_center_active_fire.lat, polygon_center_active_fire.lng], { icon: fire_icon }).bindPopup(popup_active_fires);
                    activeFireLayer.addLayer(active_fire_markers);
                }

            }
            // if no active fires, catch error
            catch (err) {
                console.log("no active fires_active page");
            }
        }

        // clearing previously active fire data
        previously_active_fires.length = 0;

        // previously active fires API call
        var previously_active_fire_url = `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Archived_Wildfire_Perimeters2/FeatureServer/0/query?where=CreateDate%20%3E%3D%20TIMESTAMP%20'2020-01-01%2000%3A00%3A00'%20AND%20CreateDate%20%3C%3D%20TIMESTAMP%20'${date_end}%2000%3A00%3A00'%20AND%20GDB_TO_DATE%20%3E%3D%20TIMESTAMP%20'${date_end}%2000%3A00%3A00'%20AND%20GDB_TO_DATE%20%3C%3D%20TIMESTAMP%20'2021-01-01%2000%3A00%3A00'&outFields=*&outSR=4326&f=json`;
        d3.json(previously_active_fire_url).then(function (data2) {
            console.log(data2.features.length);
            var prev_active_fire_marker;
            for (var i = 0; i < data2.features.length; i++) {
                try {
                    // get coordinates from first polygon ring for each fire
                    var polygon_array_prev_active_fire = data2.features[i].geometry.rings[0];

                    // switching lat and lng positions for plotting
                    var new_poly_array_prev_active_fire = [];
                    for (var j = 0; j < polygon_array_prev_active_fire.length; j++) {
                        var latlng_prev_active_fire = [polygon_array_prev_active_fire[j][1], polygon_array_prev_active_fire[j][0]];
                        new_poly_array_prev_active_fire.push(latlng_prev_active_fire);
                    }

                    // create polygon for each fire's first geometry ring
                    var polygon_array_prev_active_fire = L.polygon(new_poly_array_prev_active_fire);

                    // get center of polygon ring for plotting
                    var polygon_center_prev_active_fire = polygon_array_prev_active_fire.getBounds().getCenter();

                    // create string arrays to identify duplicate fires
                    var string_unique_prev_active_fires = JSON.stringify(compare_coords_prev_active_fire);
                    var string_poly_center_prev_active_fire = JSON.stringify([polygon_center_prev_active_fire.lat, polygon_center_prev_active_fire.lng]);
                    // if fire is unique, add to previously active fires array, which will be plotted
                    if (string_unique_prev_active_fires.indexOf(string_poly_center_prev_active_fire) == -1) {
                        compare_coords_prev_active_fire.push([polygon_center_prev_active_fire.lat, polygon_center_prev_active_fire.lng]);
                        // create popup for previously active fires
                        var popup_prev_active_fires = '';
                        // if acres value is null, set to "unknown"
                        if (data2.features[i].attributes["GISAcres"] == null) {
                            popup_prev_active_fires = `Fire Name: ${data2.features[i].attributes["IncidentName"]}<br>Acres: Unknown`;
                        }
                        else {
                            popup_prev_active_fires = `Fire Name: ${data2.features[i].attributes["IncidentName"]}<br>Acres: ${(data2.features[i].attributes["GISAcres"]).toFixed(2)}`
                        }
                        // push all previously active fire points to array and active fire array
                        previously_active_fires.push(L.marker([polygon_center_prev_active_fire.lat, polygon_center_prev_active_fire.lng], { icon: fire_icon }).bindPopup(popup_prev_active_fires));
                        prev_active_fire_marker = L.marker([polygon_center_prev_active_fire.lat, polygon_center_prev_active_fire.lng], { icon: fire_icon }).bindPopup(popup_prev_active_fires);
                        activeFireLayer.addLayer(prev_active_fire_marker);
                    }

                }
                // if no previously active fires, catch error
                catch (err) {
                    console.log("no previously active fires_archive page");
                }
            }

            // clearing previous total fire data
            total_active_fires.length = 0;
            //    concat active fire and previously active fire arrays
            total_active_fires = active_fires.concat(previously_active_fires);
            // update index.html with total active fires for selected date
            d3.select(".total_active_fires").text(total_active_fires.length);

            // contained fire data API call
            var contained_fire_url = `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Archived_Wildfire_Perimeters2/FeatureServer/0/query?where=GDB_TO_DATE%20%3E%3D%20TIMESTAMP%20'${date_start}%2000%3A00%3A00'%20AND%20GDB_TO_DATE%20%3C%3D%20TIMESTAMP%20'${date_end}%2000%3A00%3A00'&outFields=*&outSR=4326&f=json`;
            d3.json(contained_fire_url).then(function (data) {
                console.log(data.features.length);
                var contained_fire_markers;
                for (var i = 0; i < data.features.length; i++) {
                    try {
                        // get coordinates from first polygon ring for each fire
                        var polygon_array = data.features[i].geometry.rings[0];

                        // switching lat and lng positions for plotting
                        var new_poly_array = [];
                        for (var j = 0; j < polygon_array.length; j++) {
                            var latlng = [polygon_array[j][1], polygon_array[j][0]];
                            new_poly_array.push(latlng);
                        }

                        // create polygon for each fire's first geometry ring
                        var polygon = L.polygon(new_poly_array);

                        // get center of polygon ring for plotting
                        var polygon_center = polygon.getBounds().getCenter();

                        // create string arrays to identify duplicate fires
                        // https://stackoverflow.com/questions/19543514/check-whether-an-array-exists-in-an-array-of-arrays
                        var string_unique_contained_fires = JSON.stringify(compare_coords);
                        var string_poly_center = JSON.stringify([polygon_center.lat, polygon_center.lng]);
                        // if fire is unique, add to contained fires array, which will be plotted
                        // also verifying that contained fire does not match any active fire locations
                        if ((string_unique_contained_fires.indexOf(string_poly_center) == -1) && (string_unique_prev_active_fires.indexOf(string_poly_center) == -1)) {
                            compare_coords.push([polygon_center.lat, polygon_center.lng]);
                            // create popup for contained fires
                            var popup_contained_fires = '';
                            // if acres value is null, set to "unknown"
                            if (data.features[i].attributes["GISAcres"] == null) {
                                popup_contained_fires = `Fire Name: ${data.features[i].attributes["IncidentName"]}<br>Acres: Unknown`;
                            }
                            else {
                                popup_contained_fires = `Fire Name: ${data.features[i].attributes["IncidentName"]}<br>Acres: ${(data.features[i].attributes["GISAcres"]).toFixed(2)}`
                            }
                            // push all contained fire points to array and contained fire layer
                            contained_fires.push(L.marker([polygon_center.lat, polygon_center.lng], { icon: contained_fire_icon }).bindPopup(popup_contained_fires));
                            contained_fire_markers = L.marker([polygon_center.lat, polygon_center.lng], { icon: contained_fire_icon }).bindPopup(popup_contained_fires);
                            containedFireLayer.addLayer(contained_fire_markers);
                        }

                    }
                    // if no contained fires, catch error
                    catch (err) {
                        console.log("no contained fires");
                    }

                }

                // update index.html with total contained fires for selected date
                d3.select(".total_containted_fires").text(contained_fires.length);

                // protest data

                // clearing previous protest data
                protestMarkers_heat.length = 0;
                protest_icons.length = 0;

                // convert date into csv date format
                var csv_date = moment.unix(date / 1000).format('DD-MMM-YYYY');

                //  Bring in protest data
                d3.csv("../static/Resources/USA_2020_Sep19.csv").then(function (data) {
                    // filter for user selected date
                    var protest_marker;

                    // source: https://stackoverflow.com/questions/23156864/d3-js-filter-from-csv-file-using-multiple-columns
                    var filteredData = data.filter(function (d) {
                        if (d["EVENT_DATE"] == csv_date) {
                            return d;
                        }
                    })

                    for (var i = 0; i < filteredData.length; i++) {

                        // create string arrays to identify duplicate protests
                        var string_unique_protests = JSON.stringify(compare_coords_protests);
                        var string_protests_locations = JSON.stringify([filteredData[i]["LATITUDE"], filteredData[i]["LONGITUDE"]]);
                        // if protest is unique, add to protest array, which will be plotted
                        if (string_unique_protests.indexOf(string_protests_locations) == -1) {
                            compare_coords_protests.push([filteredData[i]["LATITUDE"], filteredData[i]["LONGITUDE"]]);

                            // push protest markers to arrays (one for heat map, one for counting protests, and one for plotting layer)
                            protestMarkers_heat.push(
                                ([filteredData[i]["LATITUDE"], filteredData[i]["LONGITUDE"]]));

                            protest_icons.push(
                                L.marker([filteredData[i]["LATITUDE"], filteredData[i]["LONGITUDE"]], { icon: protest_icon }).bindPopup(`Protest Location: ${filteredData[i]["LOCATION"]}<br>Event Type: ${filteredData[i]["EVENT_TYPE"]}`));
                            protest_marker = L.marker([filteredData[i]["LATITUDE"], filteredData[i]["LONGITUDE"]], { icon: protest_icon }).bindPopup(`Protest Location: ${filteredData[i]["LOCATION"]}<br>Event Type: ${filteredData[i]["EVENT_TYPE"]}`);
                            protestIconLayer.addLayer(protest_marker);
                        }

                    }

                    // heat map information
                    var heat_layer = L.heatLayer(protestMarkers_heat, {
                        radius: 35,
                        blur: 15,
                    });

                    // add heat layer to map
                    heat.addLayer(heat_layer);

                    // update index.html with total protests for selected date
                    d3.select(".total_protests").text(protestMarkers_heat.length);

                    // call function to update state info row when new date is selected
                    if (d3.select(".state")._groups[0][0].innerText != "State") {
                        dateUpdate(d3.select(".state")._groups[0][0].innerText);
                    }

                    // make map interactive 
                    // source: https://leafletjs.com/examples/choropleth/

                    // function to zoom into a state when the user clicks the state
                    function zoomToFeature(e) {

                        // reset counters;
                        contained_fires_counter = 0;
                        active_fires_counter = 0;
                        protest_counter = 0;
                        // zoom to map
                        myMap.fitBounds(e.target.getBounds());
                        // update html state name
                        state = e.target.feature.properties.name;
                        map_component.attr("state_name", state);

                        // call state functions

                        stateUnemployment(state, datetoPass);
                        single_state_fxn(state, datetoPass);
                        optionChanged(state, datetoPass);

                        // getting state polygon coordinates using state dictionary
                        var state_index = state_dict[state];
                        var polygon_coords = statesData.features[state_index].geometry.coordinates;
                        var final_coords = [];
                        // switching lat and long for final coords
                        for (i = 0; i < polygon_coords[0].length; i++) {
                            var update_coord = [polygon_coords[0][i][1], polygon_coords[0][i][0]];
                            final_coords.push(update_coord);
                        }

                        var state_check = L.polygon(final_coords);

                        // find markers within clicked state 
                        // contained fires
                        for (var i = 0; i < contained_fires.length; i++) {
                            // special requirements for Alaska (multipolygon)
                            if (state_index == 1) {
                                if (contained_fires[i]._latlng.lat > 52) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                            // special requirements for Hawaii (multipolygon)
                            if (state_index == 11) {
                                if ((contained_fires._latlng.lng < -126) && (contained_fires._latlng.lat < 50)) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                            // special requirements for Michigan (multipolygon)
                            if (state_index == 22) {
                                if ((contained_fires[i]._latlng.lng > -87) && (contained_fires[i]._latlng.lat > 41.8) && (contained_fires[i]._latlng.lng < -82.5)) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                            // all other states check
                            else {
                                var marker_inside_polygon = state_check.contains(contained_fires[i].getLatLng());

                                if (marker_inside_polygon) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                        }

                        // active fires
                        for (var i = 0; i < total_active_fires.length; i++) {
                            if (state_index == 1) {
                                if (total_active_fires[i]._latlng.lat > 52) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }
                            if (state_index == 11) {
                                if ((total_active_fires._latlng.lng < -126) && (total_active_fires._latlng.lat < 50)) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }

                            if (state_index == 22) {
                                if ((total_active_fires[i]._latlng.lng > -87) && (total_active_fires[i]._latlng.lat > 41.8) && (total_active_fires[i]._latlng.lng < -82.5)) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }

                            else {
                                var marker_inside_polygon1 = state_check.contains(total_active_fires[i].getLatLng());
                                if (marker_inside_polygon1) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }
                        }

                        // protest data
                        for (var i = 0; i < protest_icons.length; i++) {
                            if (state_index == 1) {
                                if (protest_icons[i]._latlng.lat > 52) {
                                    protest_counter = protest_counter + 1;
                                }
                            }
                            if (state_index == 11) {
                                if ((protest_icons._latlng.lng < -126) && (protest_icons._latlng.lat < 50)) {
                                    protest_counter = protest_counter + 1;
                                }
                            }

                            if (state_index == 22) {
                                if ((protest_icons[i]._latlng.lng > -87) && (protest_icons[i]._latlng.lat > 41.8) && (protest_icons[i]._latlng.lng < -82.5)) {
                                    protest_counter = protest_counter + 1;
                                }
                            }

                            else {
                                var marker_inside_polygon2 = state_check.contains(protest_icons[i].getLatLng());
                                if (marker_inside_polygon2) {
                                    protest_counter = protest_counter + 1;
                                }
                            }
                        }

                        // update the state information on html when state is clicked
                        d3.select(".contained_fires").text(contained_fires_counter);
                        d3.select(".active_fires").text(active_fires_counter);
                        d3.select(".protests").text(protest_counter);
                        d3.select(".state").text(state);
                    }

                    // function to update state information when new date is clicked
                    function dateUpdate(state) {

                        // reset counters;
                        contained_fires_counter = 0;
                        active_fires_counter = 0;
                        protest_counter = 0;

                        // getting state polygon coordinates using state dictionary
                        var state_index = state_dict[state];

                        var polygon_coords = statesData.features[state_index].geometry.coordinates;
                        var final_coords = [];
                        // switching lat and long for final coords
                        for (i = 0; i < polygon_coords[0].length; i++) {
                            var update_coord = [polygon_coords[0][i][1], polygon_coords[0][i][0]];
                            final_coords.push(update_coord);
                        }

                        var state_check = L.polygon(final_coords);

                        // find markers within clicked state 
                        // contained fires
                        for (var i = 0; i < contained_fires.length; i++) {
                            // special requirements for Alaska (multipolygon)
                            if (state_index == 1) {
                                if (contained_fires[i]._latlng.lat > 52) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                            // special requirements for Hawaii (multipolygon)
                            if (state_index == 11) {
                                if ((contained_fires._latlng.lng < -126) && (contained_fires._latlng.lat < 50)) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                            // special requirements for Michigan (multipolygon)
                            if (state_index == 22) {
                                if ((contained_fires[i]._latlng.lng > -87) && (contained_fires[i]._latlng.lat > 41.8) && (contained_fires[i]._latlng.lng < -82.5)) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                            // all other states check
                            else {
                                var marker_inside_polygon = state_check.contains(contained_fires[i].getLatLng());

                                if (marker_inside_polygon) {
                                    contained_fires_counter = contained_fires_counter + 1;
                                }
                            }
                        }

                        // active fires
                        for (var i = 0; i < total_active_fires.length; i++) {
                            if (state_index == 1) {
                                if (total_active_fires[i]._latlng.lat > 52) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }
                            if (state_index == 11) {
                                if ((total_active_fires._latlng.lng < -126) && (total_active_fires._latlng.lat < 50)) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }

                            if (state_index == 22) {
                                if ((total_active_fires[i]._latlng.lng > -87) && (total_active_fires[i]._latlng.lat > 41.8) && (total_active_fires[i]._latlng.lng < -82.5)) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }

                            else {
                                var marker_inside_polygon1 = state_check.contains(total_active_fires[i].getLatLng());
                                if (marker_inside_polygon1) {
                                    active_fires_counter = active_fires_counter + 1;
                                }
                            }
                        }

                        // protest data
                        for (var i = 0; i < protest_icons.length; i++) {
                            if (state_index == 1) {
                                if (protest_icons[i]._latlng.lat > 52) {
                                    protest_counter = protest_counter + 1;
                                }
                            }
                            if (state_index == 11) {
                                if ((protest_icons._latlng.lng < -126) && (protest_icons._latlng.lat < 50)) {
                                    protest_counter = protest_counter + 1;
                                }
                            }

                            if (state_index == 22) {
                                if ((protest_icons[i]._latlng.lng > -87) && (protest_icons[i]._latlng.lat > 41.8) && (protest_icons[i]._latlng.lng < -82.5)) {
                                    protest_counter = protest_counter + 1;
                                }
                            }

                            else {
                                var marker_inside_polygon2 = state_check.contains(protest_icons[i].getLatLng());
                                if (marker_inside_polygon2) {
                                    protest_counter = protest_counter + 1;
                                }
                            }
                        }

                        // update the national and state information on html when state is clicked
                        d3.select(".contained_fires").text(contained_fires_counter);
                        d3.select(".active_fires").text(active_fires_counter);
                        d3.select(".protests").text(protest_counter);
                    }


                    // function when user mouses over feature
                    // source:  https://leafletjs.com/examples/choropleth/
                    function highlightFeature(e) {
                        var layer = e.target;

                        layer.setStyle({
                            weight: 5,
                            color: 'black',
                            dashArray: '',
                            fillOpacity: 0.3
                        });

                        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                            layer.bringToFront();
                        }
                    }

                    // function when user mouses out of a feature
                    // source: https://leafletjs.com/examples/choropleth/
                    function resetHighlight(e) {
                        stategeoJson.resetStyle(e.target);
                    }


                    // use onEachFeature function to call event functions
                    // source: https://leafletjs.com/examples/choropleth/
                    function onEachFeature(feature, layer) {

                        layer.on({
                            mouseover: highlightFeature,
                            mouseout: resetHighlight,
                            click: zoomToFeature,

                        });
                    }

                    // add state boundaries
                    // source: https://leafletjs.com/examples/choropleth/
                    stategeoJson = L.geoJson(statesData, {
                        style: style,
                        onEachFeature: onEachFeature
                    }).addTo(myMap);


                })
            })
        })
    })
}
console.log(heat);

// slider
// =======================================================================

// Create a new date from a string, return as a timestamp.
// source: https://refreshless.com/nouislider/examples/
function timestamp(str) {
    return new Date(str).getTime();
}

// create slider
noUiSlider.create(dateSlider, {
    // Create two timestamps to define a range.
    range: {
        min: timestamp('2020-01-02'),
        max: timestamp('2020-09-12')
    },

    // Steps of one day
    step: 24 * 60 * 60 * 1000,

    //  indicate the handle starting positions.
    start: timestamp('2020-01-02'),

    // No decimals
    format: wNumb({
        decimals: 0
    })
});


// after user selects date with mouse, return date
dateSlider.noUiSlider.on('end', function (values, handle) {

    // using Moment.js for date display
    var date_select = values[handle];
    var display_date_main_page = moment.unix(date_select / 1000).format('MMMM D, YYYY');
    // update date shown on index.html (user date in human readable format)
    d3.select("#date_select").text(`Date selected: ${display_date_main_page}`);
    slider_div.attr("current_time", date_select);

});

// allowing user to use keyboard to change slider
dateSlider.noUiSlider.on('change', function (values, handle) {
    // using Moment.js for date display
    var date_select = values[handle];
    var display_date_main_page = moment.unix(date_select / 1000).format('MMMM D, YYYY');
    // update date shown on index.html (user date in human readable format)
    d3.select("#date_select").text(`Date selected: ${display_date_main_page}`);
    slider_div.attr("current_time", date_select);

    // call map update
    init(date_select);

    // call state functions
    if (!(state === null)) {
        stateUnemployment(state, datetoPass);
        optionChanged(state, datetoPass);
        single_state_fxn(state, datetoPass);
    };
});

// allow dates to change when handle is dragged
dateSlider.noUiSlider.on('slide', function (values, handle) {
    // using Moment.js for date display
    var date_select = values[handle];
    var display_date_main_page = moment.unix(date_select / 1000).format('MMMM D, YYYY');
    // update date shown on index.html (user date in human readable format)
    d3.select("#date_select").text(`Date selected: ${display_date_main_page}`);

});

// create state dictionary for use when user clicks on state (zoomToFeature function)

var state_dict =

{
    "Alabama": 0,
    "Alaska": 1,
    "Arizona": 2,
    "Arkansas": 3,
    "California": 4,
    "Colorado": 5,
    "Connecticut": 6,
    "Delaware": 7,
    "District of Columbia": 8,
    "Florida": 9,
    "Georgia": 10,
    "Hawaii": 11,
    "Idaho": 12,
    "Illinois": 13,
    "Indiana": 14,
    "Iowa": 15,
    "Kansas": 16,
    "Kentucky": 17,
    "Louisiana": 18,
    "Maine": 19,
    "Maryland": 20,
    "Massachusetts": 21,
    "Michigan": 22,
    "Minnesota": 23,
    "Mississippi": 24,
    "Missouri": 25,
    "Montana": 26,
    "Nebraska": 27,
    "Nevada": 28,
    "New Hampshire": 29,
    "New Jersey": 30,
    "New Mexico": 31,
    "New York": 32,
    "North Carolina": 33,
    "North Dakota": 34,
    "Ohio": 35,
    "Oklahoma": 36,
    "Oregon": 37,
    "Pennsylvania": 38,
    "Rhode Island": 39,
    "South Carolina": 40,
    "South Dakota": 41,
    "Tennessee": 42,
    "Texas": 43,
    "Utah": 44,
    "Vermont": 45,
    "Virginia": 46,
    "Washington": 47,
    "West Virginia": 48,
    "Wisconsin": 49,
    "Wyoming": 50,
    "Puerto Rico": 51
};
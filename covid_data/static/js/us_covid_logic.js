// fxn for finding avg
function find_avg (array) {
    var sum = 0;
    for (var x = 0; x < array.length; x++) {
        sum += array[x];
    }

    var avg = Math.round (sum / array.length);
    return avg;
}

// fxn to output US data that takes date input
function us_fxn (date) {

    // format date; end result should be yyyymmdd for API calls
    var moment_date = moment(date, 'YYYY-MM-DD');
    var plotly_date = moment_date.format ('M/DD');
    var api_date = moment_date.format ('YYYYMMDD');

    var us_url = 'https://api.covidtracking.com/v1/us/daily.json';
    var us_dates = [];
    var us_cases_all = [];
    var us_cases1 = [];
    var us_cases2 = [];
    // var us_deaths = [];

    d3.json (us_url).then ((response) => {
        for (var x = 0; x < response.length; x++) {
            var date = moment(response[x].date, 'YYYY-MM-DD').format ('M/DD');
            var cases = response[x].positive;
            // var deaths = response[x].death;

            us_dates.push (date);
            us_cases_all.push (cases);
            // us_deaths.push (deaths);
            
            if (response[x].date > api_date) {
                us_cases1.push (cases);
                us_cases2.push (null);
            }

            else if (response[x].date == api_date) {
                var date_index = x;
                var select_cases = response[x].positive;
                var select_deaths = response[x].death;

                us_cases1.push (cases);
                us_cases2.push (null);

                // can probably push to a bootstrap card: https://getbootstrap.com/docs/4.5/components/card/
                // or a jumbotron https://getbootstrap.com/docs/4.5/components/jumbotron/ 
                d3.select ('#us_total_cases').text (select_cases);
                d3.select ('#us_total_deaths').text (select_deaths);
            }

            else {
                us_cases2.push (cases);
                us_cases1.push (null);
            }
        }

        // create arrays for daily increases in cases/deaths
        var all_new_cases = [0];
        var us_new_cases1 = [0];
        var us_new_cases2 = [null];
        // var us_new_deaths = [0];

        for (var x = (us_cases_all.length - 2); x > -1; x--) {
            var case_inc = us_cases_all[x] - us_cases_all[x + 1];
            // var death_inc = us_deaths[x] - us_deaths[x + 1];

            all_new_cases.push (case_inc);
            // us_new_deaths.push (death_inc);

            if (x >= date_index) {
                us_new_cases1.push (case_inc);
                us_new_cases2.push (null);
            }

            else {
                us_new_cases2.push (case_inc);
                us_new_cases1.push (null);
            }
        }

        // create arrays for 7d moving avg for cases/deaths
        var new_cases_avg1 = [];
        var new_cases_avg2 = [];
        // var new_deaths_avg = [];
        var reverse_new_cases = all_new_cases.reverse();

        for (var x = (reverse_new_cases.length - 1); x > -1; x--) {
            var avg_array = [];

            if (x > (reverse_new_cases.length - 8)) {
                avg_array.push (reverse_new_cases[x]); // they all equal 0, so downstream avg calcs are moot
            }
            else {
                for (var y = 0; y < 7; y++) {
                    avg_array.push (reverse_new_cases[x + y]);
                }
            }
            var avg = find_avg (avg_array);

            if (x >= date_index) {
                new_cases_avg1.push (avg);
                new_cases_avg2.push (null);
            }

            else {
                new_cases_avg2.push (avg);
                new_cases_avg1.push (null);
            }
        }

        var reverse_dates = us_dates.reverse();

        var trace1 = {
            x: reverse_dates,
            y: us_new_cases1,
            type: 'bar',
            // mode: 'lines',
            name: 'new cases',
            marker: {
                color: 'rgba(245, 127, 23, 0.9)'
            }
        };

        var trace2 = {
            x: reverse_dates,
            y: us_new_cases2,
            type: 'bar',
            // mode: 'lines',
            name: 'new cases',
            showlegend: false,
            marker: {
                color: 'rgba(97, 97, 97, 0.4)'
            }
        };

        var trace3 = {
            x: reverse_dates,
            y: new_cases_avg1,
            type: 'scatter',
            mode: 'lines',
            name: '7-day moving average',
            line: {
                shape: 'spline',
                color: 'rgba(26, 35, 126, 1)'
            }
        };

        var trace4 = {
            x: reverse_dates,
            y: new_cases_avg2,
            type: 'scatter',
            mode: 'lines',
            name: '7-day moving average',
            showlegend: false,
            line: {
                shape: 'spline',
                color: 'rgba(97, 97, 97, 0.4)'
            }
        };

        var trace5 = {
            x: [plotly_date, plotly_date],
            y: [-30, 100000],
            type: 'scatter',
            hoverinfo: 'name',
            mode: 'lines',
            name: 'selected date',
            showlegend: false,
            line: {
                dash: 'dash',
                color: 'grey'
            },
        };

        var us_plot_data = [trace1, trace2, trace3, trace4, trace5];

        var us_plot_layout = {
            title: "daily increase of COVID cases in the US",
            height: '600',
            // legend/annotation config
            legend: {
                // 'orientation': 'h',
                x: 0.3,
                xanchor: 'right',
                y: 0.95
            },
            // showlegend: false,
            hovermode: 'x unified',
            hoverlabel: {bgcolor: 'rgba (255, 255, 255, 0.7'},
            // annotations: [
            //     {
            //       x: "1/18",
            //       y: "55",
            //       text: '% disapproval',
            //       font: {color: 'red'},
            //       showarrow: false
            //     },
            //     {
            //       x: "1/18",
            //       y: "44",
            //       text: '% approval',
            //       font: {color: 'green'},
            //       showarrow: false
            //     }
            //   ],
            xaxis: {
              title: 'date',
              showgrid: false,
              // spikeline config
              showspikes: true,
              spikemode: 'across',
              spikecolor: 'grey',
              spikedistance: -1,
              spikethickness: 1,
              spikedash: 'dot',
              // tick config
              tickmode: 'auto',
              nticks: 10
            },
            yaxis: {
                range: [0, 80000],
                autorange: false,
                title: '# of cases'
            }
          }

        Plotly.newPlot('us_plot', us_plot_data, us_plot_layout);
    })
}

us_fxn ('2020-08-05');
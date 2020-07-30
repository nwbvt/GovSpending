const categories = ["Defense", "Education", "General Government", "Health Care", "Interest", "Other Spending", "Pensions",
                    "Protection", "Transportation", "Welfare"];
const margin = 125;
const playDelay = 500;

const moneyUnits = 1000000000
const popUnits = 1000000

var events = []

d3.json("data/events.json", resp => {
    events = resp.events
})

const keepEvents = 20;

function formatNumber(num, currency) {
    var string = "";
    var negated = false;
    if (num < 0) {
        negated = true;
        num = -num;
    }
    if (num === 0) {
        string = "0";
    }
    while (num > 0) {
        const part = Math.round(num % 1000);
        string = part + string;
        num = Math.round((num-part) / 1000);
        if (num > 0) {
            if (part < 10) {
                string = "0" + string;
            }
            if (part < 100) {
                string = "0" + string;
            }
            string = "," + string;
        }
    }
    if (currency) {
        string = "$" + string;
    }
    if (negated) {
        string = "-" + string;
    }
    return string;
}

function govChart() {

    const svg = d3.select("svg")
    const eventFeed = d3.select("#eventFeed")
    const height = 600;
    const width = 1000;
    svg.attr("height", height + 2*margin)
    svg.attr("width", width + 2*margin)
    const xScale = d3.scaleBand().domain(categories).range([0,width]);
    const yScale = d3.scaleLinear().domain([0, 1000]).range([height, 0]);
    const chartbox = svg.append("g").attr("transform", `translate(${margin},${margin})`)
        .attr("height", height).attr("width", width)
        .attr("viewbox", [0,0,width,height])
    chartbox.selectAll("rect.bar").data(categories).enter().append("rect").attr("class", "bar").attr("fill", "#880F3F")
        .attr("width", xScale.bandwidth() - 2).attr("height", 0)
        .attr("x", function(d) {return xScale(d)}).attr("y", height);
    chartbox.selectAll("rect.hoverzone").data(categories).enter().append("rect").attr("class", "hoverzone")
        .attr("width", xScale.bandwidth() - 2).attr("height", margin)
        .attr("x", function(d) {return xScale(d)}).attr("y", height-margin);
    function xAxis(g) {
        return g.attr("transform", `translate(${margin}, ${height + margin})`).attr("class", "axis").call(d3.axisBottom(xScale));
    }
    function yAxis(g) {
        return g.attr("transform", `translate(${margin},${margin})`).attr("class", "axis")
            .call(d3.axisLeft(yScale).tickFormat(n => formatNumber(n, true)));
    }
    const gx = svg.append("g")
    const gy = svg.append("g")
    gx.call(xAxis)
    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    const chart = {
        perCapita: false,
        playing: false
    }
    const yearInput = $("#year")[0]
    d3.json("data/data.json",
        data => {
            chart.years = Object.keys(data);
            yearInput.min = chart.years[0];
            yearInput.max = chart.years[chart.years.length - 1];
            function totalSpending(cat, year) {
                year = year || chart.year
                var total = data[year][cat]["Total"][0] * moneyUnits;
                if (chart.perCapita) {
                    return total/(data[year]["Population"] * popUnits);
                } else {
                    return total;
                }
            }
            chart.setYear = year => {
                chart.year = Number(year);
                if (yearInput.value != year) {
                    yearInput.value = year;
                }
                chart.refresh();
            }
            chart.refresh = _ => {
                var maxSpending = d3.max(chart.years, year => d3.max(categories, cat => totalSpending(cat, year)))
                yScale.domain([0, maxSpending]);
                svg.selectAll("rect.bar").data(categories)
                    .transition().duration(500)
                    .attr("height", cat => height - yScale(totalSpending(cat)))
                    .attr("y", cat => yScale(totalSpending(cat)));
                // Give a little extra space to register mouseovers on tooltips in case the bar is too small
                 svg.selectAll("rect.hoverzone").data(categories)
                    .on("mouseover", cat => {
                        const category = data[chart.year][cat]
                        tooltip.transition(100).style("opacity", .9);
                        tooltip.html(`${cat}<br/>` +
                                     `Total:    ${formatNumber(category["Total"][0]*moneyUnits, true)}<br/>` +
                                     `Federal:  ${formatNumber(category["Federal"][0]*moneyUnits, true)}<br/>` +
                                     `State:    ${formatNumber(category["State"][0]*moneyUnits, true)}<br/>` +
                                     `Local:    ${formatNumber(category["Local"][0]*moneyUnits, true)}<br/>` +
                                     `Transfer: ${formatNumber(category["Transfer"][0]*moneyUnits, true)}<br/>`)
                                .style("left", `${d3.event.pageX}px`)
                                .style("top", `${d3.event.pageY}px`)})
                    .on("mouseout", _ => {
                        tooltip.transition().duration(100).style("opacity", 0)
                    })
                    .attr("height", cat => height - yScale(totalSpending(cat)) + margin)
                    .attr("y", cat => yScale(totalSpending(cat)) - margin);
               
                gy.call(yAxis);
                chart.updateEvents()
                chart.updateExternal()
            },
            chart.updateEvents = _ => {
                const displayedEvents = events.filter(e => {
                    return e.year <= chart.year && e.year > chart.year - keepEvents;
                }).sort(e => -chart.year);
                const join = eventFeed.selectAll("div").data(displayedEvents);
                join.enter().append("div").merge(join)
                    .attr("class", "card")
                    .text(e => `${e.year}: ${e.message}`);
                join.exit().remove();
            };
            chart.updateExternal = _ => {
                //Update fields external to the chart
                $("#year-label").text(chart.year);
                $("#population")[0].value = formatNumber(data[chart.year]["Population"] * popUnits );
                if (data[chart.year]["GDP"]) {
                    $("#gdp")[0].value = formatNumber(data[chart.year]["GDP"] * moneyUnits, true);
                } else {
                    $("#gdp")[0].value = "NA";
                }
                $("#total-spending")[0].value = formatNumber(data[chart.year]["Total"]["Total"][0] * moneyUnits, true);
                $("#total-federal")[0].value = formatNumber(data[chart.year]["Total"]["Federal"][0] * moneyUnits, true);
                $("#total-state")[0].value = formatNumber(data[chart.year]["Total"]["State"][0] * moneyUnits, true);
                $("#total-local")[0].value = formatNumber(data[chart.year]["Total"]["Local"][0] * moneyUnits, true);
                $("#total-transfer")[0].value = formatNumber(data[chart.year]["Total"]["Transfer"][0] * moneyUnits, true);
            }
            chart.setYear(chart.years[0]);
            yearInput.addEventListener('change', event => {chart.setYear(event.target.value)});
            $("#percapita")[0].addEventListener('change', event => {
                if (event.target.checked) {
                    chart.perCapita = true;
                } else {
                    chart.perCapita = false;
                }
                chart.refresh();
            })
        })
    const playButton = $("#playButton")
    chart.play = _ => {
        if (chart.playing) {
            chart.playing = false;
            playButton.text("Play")
        } else {
            chart.playing = true;
            setTimeout(chart.iter, playDelay)
            playButton.text("Pause")
        }
    }
    chart.iter = _ => {
        if (chart.year === Number(chart.years[chart.years.length-1])) {
            // Reached the end
            chart.playing = false;
            playButton.text("Play")
        }
        if (chart.playing) {
            chart.setYear(chart.year + 1);
            setTimeout(chart.iter, playDelay)
        }
    }
    playButton[0].addEventListener("click", chart.play);
    return chart;
}

const chart = govChart()
const categories = ["Defense", "Education", "General Government", "Health Care", "Interest", "Other Spending", "Pensions",
                    "Protection", "Transportation", "Welfare"];
const margin = 100;
const playDelay = 500;

const events = [{year: 1917, cat: "Defense", message: "US Enters WW1"},
                {year: 1935, cat: "Pensions", message: "Social Security Established"},
                {year: 1941, cat: "Defense", message: "US Enters WW2"},
                {year: 1966, cat: "Health Care", message: "Medicare Established"},
                {year: 1991, cat: "Defense", message: "USSR Breaks Up"},
                {year: 2001, cat: "Defense", message: "9-11 Terrorist Attacks"},
                {year: 2001, cat: "Education", message: "No Child Left Behind Act"},
                {year: 2010, cat: "Health Care", message: "Affordable Care Act Passed"},
                {year: 2012, cat: "Pensions", message: "Baby Boomers Begin Becoming Social Security Eligible"}]

const keepEvents = 10;

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
        num = Math.round(num / 1000);
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
    const height = 600;
    const width = 1000;
    svg.attr("height", height + 2*margin)
    svg.attr("width", width + 2*margin)
    const xScale = d3.scaleBand().domain(categories).range([0,width]);
    const yScale = d3.scaleLinear().domain([0, 1000]).range([height, 0]);
    const chartbox = svg.append("g").attr("transform", `translate(${margin},${margin})`)
        .attr("height", height).attr("width", width)
        .attr("viewbox", [0,0,width,height])
    chartbox.selectAll("rect").data(categories).enter().append("rect").attr("fill", "#880F3F")
        .style("mix-blend-mode", "multiply")
        .attr("width", xScale.bandwidth() - 2).attr("height", 0)
        .attr("x", function(d,i) {return xScale(d)}).attr("y", height);
    function xAxis(g) {
        return g.attr("transform", `translate(${margin}, ${height + margin})`).call(d3.axisBottom(xScale));
    }
    function yAxis(g) {
        return g.attr("transform", `translate(${margin},${margin})`).call(d3.axisLeft(yScale));
    }
    const gx = svg.append("g")
    const gy = svg.append("g")
    gx.call(xAxis)
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
                var total = data[year][cat]["Total"][0] * 1000000000;
                if (chart.perCapita) {
                    return total/(data[year]["Population"] * 1000000);
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
                svg.selectAll("rect").data(categories).transition().duration(500)
                    .attr("height", cat => height - yScale(totalSpending(cat)))
                    .attr("y", cat => yScale(totalSpending(cat)));
                gy.call(yAxis);
                chart.updateEvents()
                chart.updateExternal()
            },
            chart.updateEvents = _ => {
                const displayedEvents = events.filter(e => {
                    return e.year <= chart.year && e.year > chart.year - keepEvents;
                });
                const join = chartbox.selectAll("text").data(displayedEvents);
                join.enter().append("text").merge(join)
                    .attr("x", e => xScale(e.category))
                    .attr("y", (e, i) => i*20)
                    .text(e => `${e.year}: ${e.message}`);
                join.exit().remove();
            };
            chart.updateExternal = _ => {
                //Update fields external to the chart
                $("#year-label").text(chart.year);
                $("#population")[0].value = formatNumber(data[chart.year]["Population"] * 1000000 );
                if (data[chart.year]["GDP"]) {
                    $("#gdp")[0].value = formatNumber(data[chart.year]["GDP"] * 1000000000);
                } else {
                    $("#gdp")[0].value = "NA";
                }
                $("#total-spending")[0].value = formatNumber(data[chart.year]["Total"]["Total"][0] * 1000000000, true);
                $("#total-federal")[0].value = formatNumber(data[chart.year]["Total"]["Federal"][0] * 1000000000, true);
                $("#total-state")[0].value = formatNumber(data[chart.year]["Total"]["State"][0] * 1000000000, true);
                $("#total-local")[0].value = formatNumber(data[chart.year]["Total"]["Local"][0] * 1000000000, true);
                $("#total-transfer")[0].value = formatNumber(data[chart.year]["Total"]["Transfer"][0] * 1000000000, true);
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
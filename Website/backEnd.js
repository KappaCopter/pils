// Start by creating the svg area
const svg_width = 1000;
const svg_height = 1000;

let svg_customContent = d3.select("#div_customContent")
  .append("svg")
    .attr("width", svg_width)
    .attr("height", svg_height)

svg_customContent.append("svg:image")
    .attr('x', svg_width/2 - 320/2)
    .attr('y', 100)
    .attr('width', 320)
    .attr('height', 640)
    .attr("xlink:href", "./images/body.png")

// array containing coordinates of circles
const coordinates = [[505, 250], [480, 300], [520, 320]];

// Append circles
for (let i = 0; i < coordinates.length; i++) {
    svg_customContent.append("circle")
        .attr("id", "circleCustomTooltip" + i)
        .attr("cx", coordinates[i][0])
        .attr("cy", coordinates[i][1])
        .attr("r", 20)
        .attr("fill", "#4D76F9")
}

let bodyPartTextLiverSet = new Set(),
    bodyPartTextLungsSet = new Set(),
    bodyPartTextStomachSet = new Set();




const query = `SELECT DISTINCT ?bodypartLabel ?diseaseLabel ?drugLabel ?numLang
WHERE {

{ SELECT ?disease ?bodypart ?drug (count(?lang) as ?numLang) WHERE {
?disease wdt:P31 wd:Q12136. #Is an instance of a disease.
?disease wdt:P927 ?bodypart;
   wdt:P2176 ?drug.
?disease rdfs:label ?label
filter(!langmatches(lang(?label), 'en')) bind(lang(?label) as ?lang)
} GROUP BY ?disease ?bodypart ?drug
}
FILTER (?numLang > 10).
SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" }
}`;

const url = wdk.sparqlQuery(query)

async function wrapper() {
    const fetching = await fetch(url);
    let results = await fetching.json();
    results = await wdk.simplify.sparqlResults(results);

    for (let i = 0; i < results.length; i++) {
        if (results[i].bodypartLabel === 'liver') {
            bodyPartTextLiverSet.add(results[i].diseaseLabel);
        }
        else if (results[i].bodypartLabel === 'lung' || results[i].bodypartLabel === 'human lung') {
            bodyPartTextLungsSet.add(results[i].diseaseLabel);
        }
        else if (results[i].bodypartLabel === 'stomach') {
            bodyPartTextStomachSet.add(results[i].diseaseLabel);
        }
    }

    console.log(results);

    let bodyPartTextLiver = Array.from(bodyPartTextLiverSet).join('<br>'),
        bodyPartTextLungs = Array.from(bodyPartTextLungsSet).join('<br>'),
        bodyPartTextStomach = Array.from(bodyPartTextStomachSet).join('<br>');

    // create a tooltip
    let tooltipLiver = d3.select("#div_customContent")
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .html(bodyPartTextLiver);

    let tooltipLungs = d3.select("#div_customContent")
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .html(bodyPartTextLungs);

    let tooltipStomach = d3.select("#div_customContent")
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .html(bodyPartTextStomach);


    d3.select("#circleCustomTooltip1")
        .on("mouseover", function(){return tooltipLiver.style("visibility", "visible");})
        .on("mousemove", function(){return tooltipLiver.style("top", (event.pageY-100)+"px").style("left",(event.pageX-100)+"px");})
        .on("mouseout", function(){return tooltipLiver.style("visibility", "hidden");});

    d3.select("#circleCustomTooltip0")
        .on("mouseover", function(){return tooltipLungs.style("visibility", "visible");})
        .on("mousemove", function(){return tooltipLungs.style("top", (event.pageY-100)+"px").style("left",(event.pageX-100)+"px");})
        .on("mouseout", function(){return tooltipLungs.style("visibility", "hidden");});

    d3.select("#circleCustomTooltip2")
        .on("mouseover", function(){return tooltipStomach.style("visibility", "visible");})
        .on("mousemove", function(){return tooltipStomach.style("top", (event.pageY-100)+"px").style("left",(event.pageX-100)+"px");})
        .on("mouseout", function(){return tooltipStomach.style("visibility", "hidden");});
}

wrapper();
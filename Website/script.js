// Start by creating the svg area
const svg_width = 1000;
const svg_height = 1000;

let svg_customContent = d3.select("#div_customContent")
  .append("svg")
    .attr("width", svg_width)
    .attr("height", svg_height)

// main image position coordinates
bodyX = 200;
bodyY = 100;

svg_customContent.append("svg:image")
    .attr('x', bodyX)
    .attr('y', bodyY)
    .attr('width', 320)
    .attr('height', 640)
    .attr("xlink:href", "./images/body.png")

// array containing coordinates of circles: liver, lungs, stomach (order matters!)
const coordinates = [[bodyX + 140, bodyY + 200],
    [bodyX + 165, bodyY + 150],
    [bodyX + 180, bodyY + 220]];

// Append circles
for (let i = 0; i < coordinates.length; i++) {
    svg_customContent.append("circle")
        .attr("id", "circleCustomTooltip" + i)
        .attr("cx", coordinates[i][0])
        .attr("cy", coordinates[i][1])
        .attr("r", 20)
        .attr("fill", "#4b85ff")
}

let bodyPartTextLiverSet = new Set(),
    bodyPartTextLungsSet = new Set(),
    bodyPartTextStomachSet = new Set(),
    diseaseInformationLiverSet = new Set(),
    diseaseInformationLungsSet = new Set(),
    diseaseInformationStomachSet = new Set();

const query = `SELECT DISTINCT ?bodypartLabel ?diseaseLabel ?drugLabel ?numLang ?article
WHERE { 

    { SELECT ?disease ?bodypart ?drug (count(?lang) as ?numLang) WHERE { 
      ?disease wdt:P31 wd:Q12136. #Is an instance of a disease.
      ?disease wdt:P927 ?bodypart.
      OPTIONAL {?disease wdt:P2176 ?drug.}
      ?disease rdfs:label ?label
      filter(!langmatches(lang(?label), 'en')) bind(lang(?label) as ?lang)
    } GROUP BY ?disease ?bodypart ?drug
     }
    FILTER (?numLang > 4).
    OPTIONAL{ 
      ?article schema:about ?disease .
      ?article schema:inLanguage "en" .
      FILTER (SUBSTR(str(?article), 1, 25) = "https://en.wikipedia.org/")
    }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" }
    } ORDER BY (?numLang)`;

const url = wdk.sparqlQuery(query)

async function wrapper() {
    const fetching = await fetch(url);
    let results = await fetching.json();
    results = await wdk.simplify.sparqlResults(results);

    // finding unique diseases and their treatment for each organ
    for (let i = 0; i < results.length; i++) {
        if (results[i].bodypartLabel === 'liver') {
            bodyPartTextLiverSet.add(results[i].diseaseLabel);
            diseaseInformationLiverSet.add(results[i].drugLabel);
        }
        else if (results[i].bodypartLabel === 'lung' || results[i].bodypartLabel === 'human lung') {
            bodyPartTextLungsSet.add(results[i].diseaseLabel);
            diseaseInformationLungsSet.add(results[i].drugLabel);
        }
        else if (results[i].bodypartLabel === 'stomach') {
            bodyPartTextStomachSet.add(results[i].diseaseLabel);
            diseaseInformationStomachSet.add(results[i].drugLabel);
        }
    }

    console.log(results);
  
    // create tooltips
    let bodyPartTextLiver = Array.from(bodyPartTextLiverSet).join('<br>'),
        bodyPartTextLungs = Array.from(bodyPartTextLungsSet).join('<br>'),
        bodyPartTextStomach = Array.from(bodyPartTextStomachSet).join('<br>'),
        diseaseInformationLiver = Array.from(diseaseInformationLiverSet).join('<br>'),
        diseaseInformationLungs = Array.from(diseaseInformationLungsSet).join('<br>'),
        diseaseInformationStomach = Array.from(diseaseInformationStomachSet).join('<br>');

    let bodyPartArray = [bodyPartTextLiver, bodyPartTextLungs, bodyPartTextStomach],
        diseaseInformation = [diseaseInformationLiver, diseaseInformationLungs, diseaseInformationStomach],
        tooltips = [];

    for (let i = 0; i < bodyPartArray.length; i++) {
        tooltips[i] = d3.select("#div_customContent")
            .append("div")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "10px")
            .html(bodyPartArray[i]);
    }

    //create popups
    let popups = [];

    for (let i = 0; i < bodyPartArray.length; i++) {
        popups[i] = d3.select("#div_customContent")
            .append("div")
            .style("width", "210px")
            .style("height", "400px")
            .style("top", "100px")
            .style("left", bodyX + 300 + "px")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "5px")
            .style("border-radius", "5px")
            .style("padding", "50px")
            .html(diseaseInformation[i]);
    }

    // create a close button for popups
    svg_customContent.append("rect")
        .attr("id", "closeButton")
        .attr("x", bodyX + 570)
        .attr("y", bodyY - 50)
        .attr("width", 40)
        .attr("height", 40)
        .attr("fill", "red")
        .attr("visibility", "hidden")

    // visualize tooltips and popups
    for (let i = 0; i < bodyPartArray.length; i++) {
        d3.select("#circleCustomTooltip" + i)
            .on("click", function(){return [d3.select("#closeButton").style("visibility", "visible"), popups[i].style("visibility", "visible")];})
            .on("mouseover", function(){return tooltips[i].style("visibility", "visible");})
            .on("mousemove", function(){return tooltips[i].style("top", (event.pageY-60)+"px").style("left",(event.pageX-100)+"px");})
            .on("mouseout", function(){return tooltips[i].style("visibility", "hidden");});
    }

    // close button functionality
    d3.select("#closeButton")
        .on("click", function() {
            d3.select("#closeButton").style("visibility", "hidden");
            for (let i = 0; i < popups.length; i++)
                popups[i].style("visibility", "hidden");
            })

}

wrapper();

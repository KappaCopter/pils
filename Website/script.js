// create the svg area
const svg_width = 1000;
const svg_height = 1000;

let svg_customContent = d3.select("#div_customContent")
  .append("svg")
    .attr("width", svg_width)
    .attr("height", svg_height)

// main image position coordinates
bodyX = 100;
bodyY = 100;

svg_customContent.append("svg:image")
    .attr('x', bodyX)
    .attr('y', bodyY)
    .attr('width', 320)
    .attr('height', 640)
    .attr("xlink:href", "./images/body.png")

// array containing coordinates of circles: liver, lungs, stomach (order matters!)
const coordinates = [
    [bodyX + 140, bodyY + 200],     // liver
    [bodyX + 165, bodyY + 150],     // lungs
    [bodyX + 180, bodyY + 220]      // stomach
];

// Append circles
for (let i = 0; i < coordinates.length; i++) {
    svg_customContent.append("circle")
        .attr("id", "circleCustomTooltip" + i)
        .attr("cx", coordinates[i][0])
        .attr("cy", coordinates[i][1])
        .attr("r", 15)
        .attr("fill", "blue")
}

let bodyPartTextLiverSet = new Set(),
    bodyPartTextLungsSet = new Set(),
    bodyPartTextStomachSet = new Set(),
    diseaseInformationLiverSet = new Set(),
    diseaseInformationLungsSet = new Set(),
    diseaseInformationStomachSet = new Set();

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
    
    // List with all the data 
    // ordered as such [[BodyPart, [[disease, drugLst], ..]], [BodyPart, [[disease, drugLst], ..]],...]
    dataLst = [];
    // Set of the bodyParts
    myBodyParts= new Set();
    for (el in results){
            myBodyParts.add(results[el].bodypartLabel);
    }

    // Make a list out of it
    bodyPartLst = [];
    myBodyParts.forEach(function(value){
        bodyPartLst.push(value);
    })
    
    diseaseSet = new Set();
    drugSet = new Set();

    for (el in bodyPartLst){
        // find all the diseases associated to the body part
        for (i=0; i<results.length; i++){
            if (results[i].bodypartLabel == bodyPartLst[el]){
                diseaseSet.add(results[i].diseaseLabel);
            }   
        }
        diseaseLst = [];
        diseaseSet.forEach(function(value){
            diseaseLst.push(value);
        })
        diseaseSet.clear();

        // find all the drugs associated to the disease
        myDiseaseLst = [];
        for (el2 in diseaseLst){
            for (i=0; i<results.length; i++){
                if (results[i].diseaseLabel == diseaseLst[el2]){
                    drugSet.add(results[i].drugLabel);
                }   
            }
            drugLst = [];
            drugSet.forEach(function(value){
                drugLst.push(value);
            })
            myDiseaseLst.push([diseaseLst[el2], drugLst]);
            drugSet.clear();
        }
        dataLst.push([bodyPartLst[el], myDiseaseLst]);
    }   

    console.log(dataLst);
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
    // svg_customContent.append("rect")
    //     .attr("id", "closeButton")
    //     .attr("x", bodyX + 570)
    //     .attr("y", bodyY - 50)
    //     .attr("width", 40)
    //     .attr("height", 40)
    //     .attr("fill", "red")
    //     .attr("visibility", "hidden")

    // boolean for correct popups closing
    let letClose = false;

    // function to close all popups and remove button highlight
    function closePopups() {
        d3.select("#closeButton").style("visibility", "hidden");
        for (let i = 0; i < popups.length; i++)
            popups[i].style("visibility", "hidden");
        for (let i = 0; i < tooltips.length; i++) {
            dehighlightCircle(i);
        }
        letClose = false;
    }

    function highlightCircle(i) {
        d3.select("#circleCustomTooltip" + i).attr("fill", "red");
        d3.select("#circleCustomTooltip" + i).attr("r", 20);
    }

    function dehighlightCircle(i) {
        d3.select("#circleCustomTooltip" + i).attr("fill", "blue");
        d3.select("#circleCustomTooltip" + i).attr("r", 15);
    }

    // visualize tooltips and popups
    for (let i = 0; i < bodyPartArray.length; i++) {
        d3.select("#circleCustomTooltip" + i)
            .on("click", function() {
                closePopups();
                d3.select("#closeButton").style("visibility", "visible");
                popups[i].style("visibility", "visible");
                highlightCircle(i);
            })
            .on("mouseover", function() {
                tooltips[i].style("visibility", "visible");
                highlightCircle(i);
            })
            .on("mousemove", function() {
                tooltips[i].style("top", (event.pageY-70)+"px").style("left",(event.pageX-100)+"px");
            })
            .on("mouseout", function() {
                if (popups[i].style("visibility") === "visible") {
                    tooltips[i].style("visibility", "hidden");
                } else {
                    tooltips[i].style("visibility", "hidden");
                    dehighlightCircle(i);
                }
                letClose = true;
            });
    }

    // popups close when clicked anywhere but the circle
    d3.select("#div_customContent")
        .on("click", function() { if (letClose) closePopups(); })
}

wrapper();

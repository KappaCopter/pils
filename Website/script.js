// create the svg area
const svg_width = 1000;
const svg_height = 2000;

let svg_customContent = d3.select("#div_customContent")
  .append("svg")
    .attr("width", svg_width)
    .attr("height", svg_height)

// main image position coordinates
bodyX = 50;
bodyY = 100;
bodySizeX = 320;
bodySizeY = 640;
// bodySizeX = 640;
// bodySizeY = 1280;

// add body image
svg_customContent.append("svg:image")
    .attr('x', bodyX)
    .attr('y', bodyY)
    .attr('width', bodySizeX)
    .attr('height', bodySizeY)
    .attr("xlink:href", "./images/body.png")

// add liver highlighted image
svg_customContent.append("svg:image")
    .attr("id", "highlightedImage0")
    .attr('x', bodyX + bodySizeX / 2.8)
    .attr('y', bodyY + bodySizeY / 3.48)
    .attr('width', bodySizeX / 4)
    .attr("xlink:href", "./images/liver.png")
    .attr("visibility", "hidden")

// add lungs highlighted image
svg_customContent.append("svg:image")
    .attr("id", "highlightedImage1")
    .attr('x', bodyX + bodySizeX / 2.85)
    .attr('y', bodyY + bodySizeY / 5.5)
    .attr('width', bodySizeX / 3.1)
    .attr("xlink:href", "./images/lungs.png")
    .attr("visibility", "hidden")

// add stomach highlighted image
svg_customContent.append("svg:image")
    .attr("id", "highlightedImage2")
    .attr('x', bodyX + bodySizeX / 2.5)
    .attr('y', bodyY + bodySizeY / 3.3)
    .attr('width', bodySizeX / 4.5)
    .attr("xlink:href", "./images/stomach.png")
    .attr("visibility", "hidden")

// add brain highlighted image
svg_customContent.append("svg:image")
    .attr("id", "highlightedImage3")
    .attr('x', bodyX + bodySizeX / 2.4)
    .attr('y', bodyY)
    .attr('width', bodySizeX / 5.2)
    .attr("xlink:href", "./images/brain.png")
    .attr("visibility", "hidden")

// array containing coordinates of circles: liver, lungs, stomach, brain (order matters!)
const coordinates = [
    [bodyX + bodySizeX / 2.3, bodyY + bodySizeY / 3.1],     // liver
    [bodyX + bodySizeX / 1.95, bodyY + bodySizeY / 3.9],    // lungs
    [bodyX + bodySizeX / 1.8, bodyY + bodySizeY / 2.9],     // stomach
    [bodyX + bodySizeX / 1.95, bodyY + bodySizeY / 30]      // brain
];

// Append circles
for (let i = 0; i < coordinates.length; i++) {
    svg_customContent.append("circle")
        .attr("id", "circleCustomTooltip" + i)
        .attr("cx", coordinates[i][0])
        .attr("cy", coordinates[i][1])
        .attr("r", bodySizeX / 16)
        .attr("fill", "transparent")
}

let bodyPartTextLiverSet = new Set(),
    bodyPartTextLungsSet = new Set(),
    bodyPartTextStomachSet = new Set(),
    bodyPartTextBrainSet = new Set(),
    diseaseInformationLiverSet = new Set(),
    diseaseInformationLungsSet = new Set(),
    diseaseInformationStomachSet = new Set(),
    diseaseInformationBrainSet = new Set(),
    bodyPartLinkLiverSet = new Set(),
    bodyPartLinkLungsSet = new Set(),
    bodyPartLinkStomachSet = new Set(),
    bodyPartLinkBrainSet = new Set();

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
            bodyPartLinkLiverSet.add(results[i].article);
            diseaseInformationLiverSet.add(results[i].drugLabel);
        }
        else if (results[i].bodypartLabel === 'lung'
            || results[i].bodypartLabel === 'human lung') {
            bodyPartTextLungsSet.add(results[i].diseaseLabel);
            bodyPartLinkLungsSet.add(results[i].article);
            diseaseInformationLungsSet.add(results[i].drugLabel);
        }
        else if (results[i].bodypartLabel === 'stomach') {
            bodyPartTextStomachSet.add(results[i].diseaseLabel);
            bodyPartLinkStomachSet.add(results[i].article);
            diseaseInformationStomachSet.add(results[i].drugLabel);
        }
        else if (results[i].bodypartLabel === 'brain'
            || results[i].bodypartLabel === 'meninges'
            || results[i].bodypartLabel === 'brain stem'
            || results[i].bodypartLabel === 'corpus callosum') {
            bodyPartTextBrainSet.add(results[i].diseaseLabel);
            bodyPartLinkBrainSet.add(results[i].article);
            diseaseInformationBrainSet.add(results[i].drugLabel);
        }
    }
    
    // List with all the data 
    // ordered as such [[BodyPart, [[disease, drugLst], ..]], [BodyPart, [[disease, drugLst], ..]],...]
    let dataLst = [];
    // Set of the bodyParts
    let myBodyParts= new Set();
    for (let el in results){
            myBodyParts.add(results[el].bodypartLabel);
    }

    // Make a list out of it
    let bodyPartLst = [];
    myBodyParts.forEach(function(value){
        bodyPartLst.push(value);
    })
    
    let diseaseSet = new Set();
    let drugSet = new Set();

    for (let el in bodyPartLst){
        // find all the diseases associated to the body part
        for (let i = 0; i < results.length; i++){
            if (results[i].bodypartLabel === bodyPartLst[el]){
                diseaseSet.add(results[i].diseaseLabel);
            }   
        }
        let diseaseLst = [];
        diseaseSet.forEach(function(value){
            diseaseLst.push(value);
        })
        diseaseSet.clear();

        // find all the drugs associated to the disease
        let myDiseaseLst = [];
        for (let el2 in diseaseLst){
            for (i=0; i<results.length; i++){
                if (results[i].diseaseLabel === diseaseLst[el2]){
                    drugSet.add(results[i].drugLabel);
                }   
            }
            let drugLst = [];
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
  
    // Wikepedia Links function
    function links_for_set(Set1, Set2) {
        let str = new String();
        console.log(Set2.size)
        for (let i = 0; i < Set2.size; i++) {
            if (Array.from(Set1)[i] !== undefined) {
                str += '<a href = "' + Array.from(Set1)[i] + '" target = "_blank">' + Array.from(Set2)[i] + '</a> <br>';
            }
            else {
                str += Array.from(Set2)[i] + "<br>"
            }
        }
        return str
    }

    console.log("links_for_set is defined")

    // create tooltips
    let bodyPartTextLiver = links_for_set(bodyPartLinkLiverSet, bodyPartTextLiverSet),
        bodyPartTextLungs = links_for_set(bodyPartLinkLungsSet, bodyPartTextLungsSet),
        bodyPartTextStomach = links_for_set(bodyPartLinkStomachSet, bodyPartTextStomachSet),
        bodyPartTextBrain = links_for_set(bodyPartLinkBrainSet, bodyPartTextBrainSet),
        tooltipAdjustment = [bodyPartTextLiverSet, bodyPartTextLungsSet, bodyPartTextStomachSet, bodyPartTextBrainSet],
        diseaseInformationLiver = Array.from(diseaseInformationLiverSet).join('<br>'),
        diseaseInformationLungs = Array.from(diseaseInformationLungsSet).join('<br>'),
        diseaseInformationStomach = Array.from(diseaseInformationStomachSet).join('<br>'),
        diseaseInformationBrain = Array.from(diseaseInformationBrainSet).join('<br>');

    let bodyPartArray = [bodyPartTextLiver, bodyPartTextLungs, bodyPartTextStomach, bodyPartTextBrain],
        diseaseInformation = [diseaseInformationLiver, diseaseInformationLungs, diseaseInformationStomach, diseaseInformationBrain],
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
  
    // boolean for correct popups closing
    let letClose = false;

    for (let i = 0; i < bodyPartArray.length; i++) {
        popups[i] = d3.select("#div_customContent")
            .append("div")
            .style("width", "210px")
            .style("height", "400px")
            .style("top", "100px")
            .style("left", bodyX + bodySizeX + "px")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "5px")
            .style("border-radius", "5px")
            .style("padding", "50px")
            .on("mouseover", function() {letClose = false;})
            .on("mouseout", function() {letClose = true;})
            .html(bodyPartArray[i]);
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

    // function to close all popups and remove button highlight
    function closePopups() {
        d3.select("#closeButton").style("visibility", "hidden");
        for (let i = 0; i < popups.length; i++)
            popups[i].style("visibility", "hidden");
        for (let i = 0; i < tooltips.length; i++) {
            d3.select("#highlightedImage"  + i).attr("visibility", "hidden");
        }
        letClose = false;
    }

    // visualize tooltips and popups
    for (let i = 0; i < bodyPartArray.length; i++) {
        d3.select("#circleCustomTooltip" + i)
            .on("click", function() {
                closePopups();
                d3.select("#highlightedImage"  + i).attr("visibility", "visible");
                popups[i].style("visibility", "visible");
            })
            .on("mouseover", function() {
                if (popups[i].style("visibility") === "hidden")
                    tooltips[i].style("visibility", "visible");
                d3.select("#highlightedImage"  + i).attr("visibility", "visible");
            })
            .on("mousemove", function() {
                tooltips[i].style("top", (event.pageY- 30 - tooltipAdjustment[i].size * 20)+"px").style("left",(event.pageX-100)+"px");
            })
            .on("mouseout", function() {
                if (popups[i].style("visibility") === "visible") {
                    tooltips[i].style("visibility", "hidden");
                } else {
                    tooltips[i].style("visibility", "hidden");
                    d3.select("#highlightedImage"  + i).attr("visibility", "hidden");
                }
                letClose = true;
            });
    }

    // popups close when clicked anywhere but the circle
    d3.select("#div_customContent")
        .on("click", function() { if (letClose) closePopups(); })
}

wrapper();

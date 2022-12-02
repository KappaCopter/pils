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
    // ordered as such [[BodyPart, [[disease,  wikipediaLink, drugLst], ..]], [BodyPart, [[disease,  wikipediaLink, drugLst], ..]],...]
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
    let testSet = new Set();

    for (let el in bodyPartLst){
        // find all the diseases associated to the body part
        for (let i = 0; i < results.length; i++){
            if (results[i].bodypartLabel === bodyPartLst[el]){
                if (!testSet.has(results[i].diseaseLabel)){
                    diseaseSet.add([results[i].diseaseLabel, results[i].article]);
                }
                testSet.add(results[i].diseaseLabel);
            }   
        }
        let diseaseLst = [];
        diseaseSet.forEach(function(value){
            diseaseLst.push(value);
        })
        diseaseSet.clear();
        testSet.clear();
        // find all the drugs associated to the disease
        let myDiseaseLst = [];
        for (let el2 in diseaseLst){
            for (i=0; i<results.length; i++){
                if (results[i].diseaseLabel === diseaseLst[el2][0]){
                    drugSet.add(results[i].drugLabel);
                }   
            }
            let drugLst = [];
            drugSet.forEach(function(value){
                drugLst.push(value);
            })
            if (drugLst[0] === undefined)
                myDiseaseLst.push([diseaseLst[el2][0], diseaseLst[el2][1], ["no data"]]);
            else
                myDiseaseLst.push([diseaseLst[el2][0], diseaseLst[el2][1], drugLst]);
            drugSet.clear();
        }
        dataLst.push([bodyPartLst[el], myDiseaseLst]);
    }   

    console.log(dataLst);
    //console.log(results);
  
    // Texts for the pop-up
    const textDict = Object.create(null);
    
    for (el in dataLst){
        myText = "";
        bodyPart = dataLst[el][0];
        theDiseaseLst = dataLst[el][1];
        myTitle = "<h1>" + bodyPart + "</h1> \n";
        for (el2 in theDiseaseLst){
            disease = theDiseaseLst[el2][0];
            diseaseWiki = theDiseaseLst[el2][1];
            theDrugLst = theDiseaseLst[el2][2];
            myText += "<details>";
            if (diseaseWiki !== undefined){
                myText += "<summary>" + disease + " <a href = '" + diseaseWiki + "' target = '_blank'>[Wiki]</a>";
            }else{
                myText += "<summary>" + disease;
            }
            myText += "</summary> <ol>";
            for (el3 in theDrugLst){
                myText += "<li>" + theDrugLst[el3] + "</li>";
            }
            myText += "</ol></details>";
        }
        textDict[bodyPart] = [myTitle, myText];
    }
    console.log(textDict);

    
    // create tooltips
    let bodyPartArray = [["liver"], ["human lung"], ["stomach"], ["brain", "meninges", 'corpus callosum', "brain stem"]],
        tooltips = [];

    // Create objects which contain unique diseases and number of languages for them
    let diseasesLangs = {0: {}, 1: {}, 2: {}, 3: {}},
        liverDiseasesArray = Array.from(bodyPartTextLiverSet),
        lungsDiseasesArray = Array.from(bodyPartTextLungsSet),
        stomachDiseasesArray = Array.from(bodyPartTextStomachSet),
        brainDiseasesArray = Array.from(bodyPartTextBrainSet);

    for (let i = 0, key; i < liverDiseasesArray.length; i++) {
        key = liverDiseasesArray[i];
        for (let j = 0; j < results.length; j++) {
            if (results[j].diseaseLabel === key) {
                diseasesLangs[0][key] = results[j].numLang;
            }
        }
    }

    for (let i = 0, key; i < lungsDiseasesArray.length; i++) {
        key = lungsDiseasesArray[i];
        for (let j = 0; j < results.length; j++) {
            if (results[j].diseaseLabel === key) {
                diseasesLangs[1][key] = results[j].numLang;
            }
        }
    }

    for (let i = 0, key; i < stomachDiseasesArray.length; i++) {
        key = stomachDiseasesArray[i];
        for (let j = 0; j < results.length; j++) {
            if (results[j].diseaseLabel === key) {
                diseasesLangs[2][key] = results[j].numLang;
            }
        }
    }

    for (let i = 0, key; i < brainDiseasesArray.length; i++) {
        key = brainDiseasesArray[i];
        for (let j = 0; j < results.length; j++) {
            if (results[j].diseaseLabel === key) {
                diseasesLangs[3][key] = results[j].numLang;
            }
        }
    }

    //console.log(diseasesLangs);

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
            .html(bodyPartArray[i][0]);
    }

    //create popups
    let popups = [];
  
    // boolean for correct popups closing
    let letClose = false;

    for (let i = 0; i < bodyPartArray.length; i++) {
        popUpText = "";
        for (let el = 0; el < bodyPartArray[i].length; el++){
            if (el ==0){
                popUpText += textDict[bodyPartArray[i][el]][0];
            }
            popUpText += textDict[bodyPartArray[i][el]][1];
        } 
        popups[i] = d3.select("#div_customContent")
            .append("div")
            .style("width", "400px")
            .style("height", "600px")
            .style("top", "100px")
            .style("left", bodyX + bodySizeX + "px")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "5px")
            .style("border-radius", "5px")
            .style("padding", "50px")
            .style("overflow", "scroll")
            .attr('class', 'popUp')
            .on("mouseover", function() {letClose = false;})
            .on("mouseout", function() {letClose = true;})
            .html(popUpText);
        }

    box = d3.selectAll(".popUp")
        .style("padding-top", "10px")
        .style("padding-left", "30px");

    title = d3.selectAll(".popUp")
        .selectAll("h1")
        .style("text-decoration", "underline double")
        .style("margin-bottom", "10px")
        .style("margin-top", "10px");

    subtitle = d3.selectAll(".popUp")
        .selectAll("h2")
        .style("border-bottom", "1px solid black");

    dropDown = d3.selectAll(".popUp")
        .selectAll("summary")  
        .style("cursor", "pointer")
        .style("border-bottom", "1px solid black")
        .style("padding-bottom", "2px")
        .style("margin-bottom", "8px")
        .style("font-weight", "bold");

    // create visualizing graphs

    // set the dimensions and margins of the graph
    var margin = {top: 20, right: 30, bottom: 40, left: 100},
        width = 450 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    for (let i = 0; i < bodyPartArray.length; i++) {
        var svg = popups[i]
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Add X axis
        var x = d3.scaleLinear()
            .domain([0, 120])
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        // Y axis
        var y = d3.scaleBand()
            .range([0, height])
            .domain(Object.keys(diseasesLangs[i]))
            .padding(.1);
        svg.append("g")
            .call(d3.axisLeft(y))

        //Bars
        svg.selectAll("myRect")
            .data(Object.keys(diseasesLangs[i]))
            .enter()
            .append("rect")
            .attr("x", x(0))
            .attr("y", function (d) {
                return y(d);
            })
            .attr("width", function (d) {
                return x(diseasesLangs[i][d]);
            })
            .attr("height", y.bandwidth())
            .attr("fill", "#69b3a2")
    }

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
                tooltips[i].style("top", (event.pageY- 50)+"px").style("left",(event.pageX-60)+"px");
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

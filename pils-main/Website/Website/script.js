// create the svg area
const svg_width = 1000;
const svg_height = 800;

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

// add loading image
svg_customContent.append("svg:image")
    .attr("id", "loadingImage")
    .attr('x', bodyX + bodySizeX / 20)
    .attr('y', bodyY)
    .attr('width', 300)
    .attr("xlink:href", "./images/loading_image.png")

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

//This query finds all wikidata entries with more than 4 languages that are an instance of a disease and
//have an anatomical location. It also returns the anatomical location and the drugs that physically interact with the disease.
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
    
    // Create a list and dictionnary with all the data
    // To access data more easily
    // ordered as such [[BodyPart, [[disease,  wikipediaLink, numLang, drugLst], ..]], [BodyPart, [[disease,  wikipediaLink, numLang, drugLst], ..]],...]
    let dataLst = [];
    let dataDic = {};
    
    // Set of the bodyParts
    // Gathers all the bodyPart without any repeats
    let myBodyParts= new Set();
    for (let el in results){
            myBodyParts.add(results[el].bodypartLabel);
    }
    // Make a list out of it (easier to work with because of indexes)
    let bodyPartLst = Array.from(myBodyParts);
    
    // Sets to uniquely store all the values of diseases and drugs
    // testSet is used as comparison set
    let diseaseSet = new Set();
    let drugSet = new Set();
    let testSet = new Set();

    for (let el in bodyPartLst){
        // find all the diseases and associated data (wiki and number of Language) for each body part
        for (let i = 0; i < results.length; i++){
            if (results[i].bodypartLabel === bodyPartLst[el]){
                if (!testSet.has(results[i].diseaseLabel)){
                    diseaseSet.add([results[i].diseaseLabel, results[i].article, results[i].numLang]);
                }
                testSet.add(results[i].diseaseLabel);
            }   
        }
        // Create a list of out it (easier to work with because of indexes)
        let diseaseLst = Array.from(diseaseSet);
        // Resets sets for next bodypart
        diseaseSet.clear();
        testSet.clear();

        // Go through all the disease and find all the associated drugs
        let myDiseaseLst = [];
        for (let el2 in diseaseLst){
            for (i=0; i<results.length; i++){
                // diseaseLst[el2][0] only selects the disease out of the disease information
                if (results[i].diseaseLabel === diseaseLst[el2][0]){
                    drugSet.add(results[i].drugLabel);
                }   
            }
            let drugLst = [];
            drugSet.forEach(function(value){
                if (value == undefined){
                    drugLst.push("no data");
                } else{
                    drugLst.push(value);
                }  
            })
            myDiseaseLst.push([diseaseLst[el2][0], diseaseLst[el2][1], diseaseLst[el2][2], drugLst]);
            drugSet.clear();
        }
        // Add all the disease and related information next to the bodypart
        dataLst.push([bodyPartLst[el], myDiseaseLst]);
        dataDic[bodyPartLst[el]] = myDiseaseLst;
    }   

    //Stolen wholesale from https://stackoverflow.com/questions/17267329/converting-unicode-character-to-string-format

    function unicodeToChar(text) {
        return text.replace(/\\u[\dA-F]{4}/gi, 
               function (match) {
                    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
               });
     }
  
    //generates a wikipedia api call to get the first sentence of the associated wikipedia article
    async function wikipedia_intro(str1) {
        
        //The very braindead method of finding the title from the wikipedia url by removing everything before the page name
        let str = String();
        str = str1.replace("https://en.wikipedia.org/wiki/", "")

        var url = "https://en.wikipedia.org/w/api.php"; 

        var params = {
            action: "query",
            prop: "extracts",
            exsentences: "1",
            explaintext: "1",
            format: "json",
            titles: str
        };

        url = url + "?origin=*";
        Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

        let res = await fetch(url);
        let wiki =  await res.text();
        wik = wiki.split('"extract":"').pop().split('"}}}}')[0]
        // ^ removes everything but the extract itself. Again, not the best execution, but functional
        return unicodeToChar(wik)

    }

    // Text for the pop-up
    const textDict = Object.create(null);
    
    // Go through the data list and makes a text with html tags out of it
    for (el in dataLst){
        myText = "";
        bodyPart = dataLst[el][0]; // Name of the bodyPart
        theDiseaseLst = dataLst[el][1]; // All the information about the bodyPart
        myTitle = "<h1>" + bodyPart + "</h1> \n";
        // Go through all the associated information
        for (el2 in theDiseaseLst){
            disease = theDiseaseLst[el2][0]; // Name of the disease
            diseaseWiki = theDiseaseLst[el2][1]; // WikiLink
            theDrugLst = theDiseaseLst[el2][3]; // List of drugs associated with the disease
            myText += "<details>";
            if (diseaseWiki !== undefined){
                // This is where we get the Wikipedia extract for every disease where it's applicable.
                // Makes the pop-up take a while to load as it's getting a bunch of articles that don't show up in the website
                // As it retrieves information from all the data of the wikidata query
                wik = await wikipedia_intro(diseaseWiki);
                myText += "<summary class='summary'>" + disease + " <a href = '" + diseaseWiki + "' target = '_blank'>[Wiki]</a></summary>" + wik;
            }else{
                myText += "<summary class='summary'>" + disease + "</summary>";
            }
            
            myText += "<ul><details><summary class='subTitle'> List of drugs that physically interact with the disease.</summary>";
            for (el3 in theDrugLst){
                myText += "<li>" + theDrugLst[el3] + "</li>";
            }
            myText += "</ul></details></details>";
        }
        // Create a dictionnary with the title separated from the text
        // Allows to only display the title of only one bodyPart
        textDict[bodyPart] = [myTitle, myText];
    }

    
    // create tooltips and Array with the bodyParts (contains array with all bodyParts related to a single bodyPart)
    let bodyPartArray = [["liver"], ["human lung"], ["stomach"], ["brain", "meninges", 'corpus callosum', "brain stem"]],
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
            .html(bodyPartArray[i][0]);
    }

    //create popups
    let popups = [];
    // boolean for correct popups closing
    let letClose = false;

    for (let i = 0; i < bodyPartArray.length; i++) {
        // Only display the title of the first bodyPart, but the text of all related bodyParts
        popUpText = "";
        for (let el = 0; el < bodyPartArray[i].length; el++){
            if (el == 0){
                popUpText += textDict[bodyPartArray[i][el]][0];
            }
            popUpText += textDict[bodyPartArray[i][el]][1];
        } 
        popups[i] = d3.select("#div_customContent")
            .append("div")
            .style("width", "400px")
            .style("height", "600px")
            .style("top", "800px")
            .style("left", "50%")
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
        
    dropDown = d3.selectAll(".popUp")
        .selectAll(".summary")  
        .style("cursor", "pointer")
        .style("border-bottom", "1px solid black")
        .style("padding-bottom", "2px")
        .style("margin-bottom", "8px")
        .style("margin-top", "8px")
        .style("font-weight", "bold");

    dropDownSubtitle = d3.selectAll(".popUp")
        .selectAll(".subTitle")
        .style("cursor", "pointer")
        .style("margin-top", "10px")
        .style("margin-bottom","2px")
        .style("font-weight", "bold")
        .style("padding-left", "0px");

    dropDownLst = d3.selectAll(".popUp")
        .selectAll("ul")
        .style("margin-top", "10px")
        .style("padding-left", "15px");
    
    dropDownPoints = d3.selectAll(".popUp")
        .selectAll("li")
        .style("margin-left", "25px");

    // create visualizing graphs
    // set the dimensions and margins of the graph
    let margin = {top: 30, right: 30, bottom: 40, left: 100},
        width = 450 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // function for labels wrapping adapted from https://bl.ocks.org/mbostock/7555321
    function wrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", -10).attr("y", y - 1).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", -10).attr("y", y - 1).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }

    // append the svg object to the body of the page
    for (let i = 0; i < bodyPartArray.length; i++) {
        // Create a dictionnary linking the name of disease to the number of languages
        let disease = {};
        for (el in bodyPartArray[i]){
            // bodyPartArray[i][el] selects the bodyPart
            // dataDic[bodyPartArray[i][el]] gets the information related to the bodyPart
            // dataDic[bodyPartArray[i][el]][el2][0] selects the bodyPart name out of these informations
            for (el2 in dataDic[bodyPartArray[i][el]]){
                disease[dataDic[bodyPartArray[i][el]][el2][0]] = dataDic[bodyPartArray[i][el]][el2][2];
            }
        }

        var svg = popups[i]
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // add title
        svg.append("text")
            .attr("x", width / 3)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("Number of Pages in Different Languages on WikiData");

        // find max value in the data to scale the X axis
        let max = 0
        for (let j = 0; j < Object.values(disease).length; j++) {
            if (Object.values(disease)[j] > max)
                max = Object.values(disease)[j];
        }

        // Add X axis
        let x = d3.scaleLinear()
            .domain([0, max + max / 10])
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        //console.log(Object.keys(diseasesLangs[i]))
        // Y axis
        let y = d3.scaleBand()
            .range([0, height])
            .domain(Object.keys(disease))
            .padding(.1);
        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll(".tick text")
            .call(wrap, margin.left - 10);

        //Bars
        svg.selectAll("myRect")
            .data(Object.keys(disease))
            .enter()
            .append("rect")
            .attr("x", x(0))
            .attr("y", function (d) {
                return y(d);
            })
            .attr("width", function (d) {
                return x(disease[d]);
            })
            .attr("height", y.bandwidth())
            .attr("fill", "#69b3a2")
    }

    d3.select("#loadingImage").attr("visibility", "hidden");

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

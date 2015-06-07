var express = require("express");
var app = express();
var htmlparser = require("htmlparser");
var select = require('soupselect').select;
var request = require('request');
var fs = require('fs');


request("https://www.uber.com/cities", function(err, response, body){
	if( err ) throw err;
	new htmlparser.Parser(new htmlparser.DefaultHandler(function (error, dom) {
		if( error ) throw err;

		var cityCollection = null;

		// Search for the listing of USA cities
		select(dom, "nav.yui3-u-1").forEach(function(article){
			select(article, "p.title").forEach(function(title){
				if(title.children[0].raw == "North America"){
					cityCollection = select(article, "li.yui3-u-1-3.yui3-u-s-1-2 a");
				}
			});
		});

		// Set increment to 0; we'll use this to know when we've pulled
		// down all city info.
		var i = 0;

		// Initialize main cities variable, this is where 
		// everything will be stuffed eventually
		var cities = [];

		// Loop through cities and get fare information
		cityCollection.forEach(function(city){
			
			// Grab proper city name
			var name = city.children[0].raw.trim();
			
			request("https://www.uber.com" + city.attribs.href, function(err, response, body){
				if( err ) throw err;
				new htmlparser.Parser(new htmlparser.DefaultHandler(function (error, dom) {
					if( error ) throw err;

					// Get array of different options in city
					var results = select(dom, "nav.pricing-nav a");
					console.log(name);
					
					var types = [];
					
					// If no results returned, city only has uberX
					if( results.length == 0 ) types = ["uberX"];
					else {
						results.forEach(function(car){
							type = car.children[0].raw.replace("\n", "").trim();
							if( car.children[1]) type += car.children[1].children[0].raw; 
							types.push(type);
						});
					}
					
					// Now cycle through price structure by type of car
					var carArray = []
					select(dom, "section.breakdown").forEach(function(fares, i){						
						var feeArray = [];
						// We're skipping uberTAXI because rates aren't transparent.
						if( types[i] != "uberTAXI" ){
							var pricing = select(fares, ".yui3-u-1-4");
							if(pricing.length > 0){
								
								// Push consistent fees to array
								feeArray.push({name: "base", price: parseFloat(pricing[0].children[3].children[0].raw.trim().replace("$",""))});
								feeArray.push({name: "per minute", price: parseFloat(pricing[1].children[1].children[0].raw.trim().replace("$",""))});
								feeArray.push({name: "per mile", price: parseFloat(pricing[2].children[1].children[0].raw.trim().replace("$",""))});

								// Deal with weird variable fees (safe driver, etc)
								select(pricing[3], ".fare-display").forEach(function(special_fee){
									var feeName = special_fee.children[1].children[0].raw.trim();

									// Two different HTML structures depending on which fee you're looking at, so let's account for both.
									if(select(special_fee, "span")[0]){
										feePrice = select(special_fee, "span")[0].children[1].children[0].raw;
									}
									else
										var feePrice = special_fee.children[3].children[0].raw.trim();
									
									// Add these weird fares to the fee array
									feeArray.push({name: feeName, price: parseFloat(feePrice.replace("$",""))});

								});
								
							}
							carArray.push({ type: types[i], fees: feeArray });
						}

					});
					
					// Add this city to the final array					
					cities.push({ name: name, types: carArray });
					
					// Increment city counter
					i++;
					
					// See if we're done pulling down cities.
					if( i >= cityCollection.length){
						// If we are, let's write that JSON file
						fs.writeFile("data.json", JSON.stringify(cities), function(err){
							if( err ) throw err;
						});
						
						// Loop through object and build database/spreadsheet
						// This part is pretty hardcoded. Should refactor to not be so.
						
						// csv header
						var csv = "city,type,base,per_minute,per_mile,safe_rides_fee,min_fare,cancellation_fee\n";
						
						cities.forEach(function(city){
							city.types.forEach(function(type){
								
								var base, per_minute, per_mile,safe_rides_fee,min_fare,cancellation_fee = 0;
								
								type.fees.forEach(function(fee){
									switch(fee.name){
										case "base": base = fee.price;
										case "per minute": per_minute = fee.price;
										case "per mile": per_mile = fee.price;
										case "Safe Rides Fee": safe_rides_fee = fee.price;
										case "Min fare": min_fare = fee.price;
										case "Cancellation fee": cancellation_fee = fee.price;
									}
								});
								
								csv += "\"" + city.name + "\"," + type.type + "," + base + "," + per_minute + "," + per_mile + "," + safe_rides_fee + "," + min_fare + "," + cancellation_fee + "\n";
								
							});
						});
						
						fs.writeFile("data.csv", csv, function(err){
							if( err ) throw err;
						});
						
					}
				
				})).parseComplete(response.body);
				
			});
		});

		
	})).parseComplete(response.body);
});


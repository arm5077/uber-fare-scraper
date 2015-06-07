var express = require("express");
var app = express();
var htmlparser = require("htmlparser");
var select = require('soupselect').select;
var request = require('request');

var handler = new htmlparser.DefaultHandler(function (error, dom) {
	if( error ) throw err;

	var cityCollection = null;

	// Search all "articles" for the USA city listing
	select(dom, "nav.yui3-u-1").forEach(function(article){
		select(article, "p.title").forEach(function(title){
			if(title.children[0].raw == "North America"){
				cityCollection = select(article, "li.yui3-u-1-3.yui3-u-s-1-2 a");
			}
				
		});
	});

console.log(cityCollection);
	

	
});
var parser = new htmlparser.Parser(handler);

request("https://www.uber.com/cities", function(err, response, body){
	if( err ) throw err;
	parser.parseComplete(response.body);
});
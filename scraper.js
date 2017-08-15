var request = require('request');
var fs = require('fs');
var mkdirp = require('mkdirp');
var decode = require('common-utils/base64').decode;
var JSZip = require("jszip");
var cheerio = require('cheerio');
var XRegExp = require('xregexp').XRegExp;
var settings = require('./configuration');
var moment = require('moment');
moment.locale('fr');
var program = require('commander');
var clc = require('cli-color');

var urls = [
	'http://lelscans.net/scan-fairy-tail/522',//http://m.lirescan.net/fairy-tail-lecture-en-ligne/522/
	//'http://www.japanread.net/manga/nanatsu-no-taizai/181',
	//'http://www.japanread.net/manga/hunter-x-hunter/359',
	'http://www.japanread.net/manga/magi-the-labyrinth-of-magic/335',
	//'http://www.japanread.net/manga/claymore/156',
	'http://m.lirescan.net/berserk-lecture-en-ligne/345/',
	'http://www.japanread.net/manga/One-punch-man/95',
	'http://m.lirescan.net/one-piece-lecture-en-ligne/760/',
	//'http://www.japanread.net/manga/gto-paradise-lost/1'
	'http://m.lirescan.net/detective-conan-lecture-en-ligne/986/',
	'http://m.lirescan.net/gantz-lecture-en-ligne/372/',
	'http://lelscans.co/scan-one-piece/873'
];

urls = [urls[7]];

//var mangasFolder = "K:\\Mangas"
var mangasFolder = "C:\\tmp\\mangas"

var regexURL = XRegExp(settings.regexpurl, 'x');

urls.forEach(function(url)
{
	
	var host = XRegExp.exec(url, regexURL).host;
	console.log("Host : " + host)
	search(url, host);
});

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

var oldDossier = null;

var debug = false;

var zip = new JSZip();

function search(url, host) {
	console.log("---------------------------------------------------------");
	console.log('URL : ', url);
	
	var manga = getManga(host, url);
	
    request(url, getRequestSettings(host), function (error, response, html) {

        if (error) {
            console.log(clc.red('error'), url, error);
        } else {
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

            var $ = cheerio.load(
                html,
                settings.cheerio
            );

            

            var image = getImage($, host);

			var match = XRegExp.exec(url, getRegex(host, url));
			
			if(!image || !match){
				
				//fin
				//zip
				if(!debug && oldDossier){
					zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
						.pipe(fs.createWriteStream(mangasFolder + '\\' + manga + '\\Scans ' + manga + '\\' + manga + ' ' + oldDossier + '.cbz'))
						.on('finish', function () {
							// JSZip generates a readable stream with a "end" event,
							// but is piped here in a writable stream which emits a "finish" event.
							console.log(manga + ' ' + oldDossier + '.cbz' + " written.");
						});
					
					//pour archive chapitre suivant
					zip = new JSZip();
				}
				return;
			}
			
			
			
			var dossier = match[1];
			if(dossier.indexOf('.') >= 0)
				dossier = (Array(4).join('0') + dossier.substring(0, dossier.indexOf('.'))).slice(-3) + dossier.substring(dossier.indexOf('.'));
			else if(dossier.length < 3)
				dossier = (Array(4).join('0') + dossier).slice(-3);
            console.log("Dossier : " + dossier)
			
			if(oldDossier != null && oldDossier != dossier){
				//zip
				if(!debug){
					zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
						.pipe(fs.createWriteStream(mangasFolder + '\\' + manga + '\\Scans ' + manga + '\\' + manga + ' ' + oldDossier + '.cbz'))
						.on('finish', function () {
							// JSZip generates a readable stream with a "end" event,
							// but is piped here in a writable stream which emits a "finish" event.
							console.log(manga + ' ' + oldDossier + '.cbz' + " written.");
						});
					
					//pour archive chapitre suivant
					zip = new JSZip();
				}
			}
			
			oldDossier = dossier;
			
			var page = match[2];
			if(page)
				page = (Array(3).join('0') + page).slice(-2)
			else
				page = '00';
            console.log("Page : " + page);
			
			//var ext = match[3];
			var ext = /\.(\w+)$/.exec(image)[1];
            console.log("Extension : " + ext);
			
			//stockage image
			var dl = 'http://' + host + image;
			if(image.indexOf("http:") >= 0){
				dl = image;
			}
			console.log("Downloading : " + dl);
			
			var dir = mangasFolder + '\\' + manga + '\\Scans ' + manga + '\\' + dossier;
			mkdirp(dir, function(err) { 
				console.log("mkdir error : " + err);
			});
			
			var file = dir + '\\' + page + '.' + ext;
			
			if(!debug){
				download(dl, file, function(){
					console.log(file + ' written');
					
					// read a file and add it to a zip
					fs.readFile(file, function(err, data) {
					  if (err) throw err;
					  //var zip = new JSZip();
					  zip.folder(manga + ' ' + dossier).file(page + '.' + ext, data);
					  
					  var nextPage = getPageSuivante($, host);
						if(nextPage){
							search(nextPage, host)
						}
					});
					
				});
			}else{
				var nextPage = getPageSuivante($, host);
				if(nextPage){
					search(nextPage, host)
				}
			}
			
			
        }
    });

}

page = 1;

function getRegex(host, url) {
    var regex = "regex";
	
    /*if(url.indexOf("lecture-fairy-tail") > 0){
        regex = /\/(\d+(?:\.\d+)?)\/(\d+(?:-\d+)?)\.(\w{3})\?.*$/;
    }
	
	if(host == "www.japanread.net"){
        //regex = /\/(\d+(?:\.\d+)?)\/(\d+(?:-\d+)?)\/.*?\.(\w{3})$/;
		//regex = /\/\d+(?:\.\d+)?\/(\d+(?:[.-]\d+)?)\/(?:.*?_(\d+)[^.]*|.*?(\d+))\.(\w{3})$/;
		regex = /\/\d+(?:\.\d+)?\/([^\/]*?)\/.*?(\d+)[^\d]*\.(\w{3})$/;
    }*/
	
	//regex = /[^\/]+?\/([\d._-]+?)(?:\/([^\/]+?)|)\/?$/;
	regex = new RegExp("^.+?/([\\d._-]+)(?:/([\\d._-]+)|)/?$");

	switch(host){
		case "scanonepiece.com" :
			regex = new RegExp("chapitre-(\\d+)\/(\\d+)");
			break;
	}
	
    console.log("Regex : " + regex)
    return regex;
}

function getManga(host, url) {
    var manga = "manga";
	
    if(url.indexOf("scan-fairy-tail") > 0){
        manga = "Fairy Tail";
    }
	
	if(url.indexOf("nanatsu-no-taizai") > 0){
        manga = "Seven Deadly Sins";
    }
	
	if(url.indexOf("hunter-x-hunter") > 0){
        manga = "HunterXHunter";
    }
	
	if(url.indexOf("magi-the-labyrinth-of-magic") > 0){
        manga = "Magi Labyrinth of Magic";
    }
	
	if(url.indexOf("claymore") > 0){
        manga = "Claymore";
    }
	
	if(url.indexOf("berserk") > 0){
        manga = "Berserk";
    }
	
	if(url.indexOf("One-punch-man") > 0){
        manga = "One Punch Man";
    }
	
	if(url.indexOf("one-piece") > 0){
        manga = "One Piece";
    }
	
	if(url.indexOf("gto-paradise-lost") > 0){
        manga = "GTO Paradise Lost";
    }
	

    console.log(clc.blue("Manga : ") + clc.bgGreen(manga))
    return manga;
}

/*cherche la page suivante de la recherche - sinon null*/
function getPageSuivante($, host) {
    var lienPageSuivante = null;
    switch(host){
        case "lelscans.net" :
		case "lelscans.com" :
		case "lelscans.co" :
            lienPageSuivante = $('a:contains("Suiv")');
            break;
			
		case "www.japanread.net" :
			var image = getImage($, host);
			lienPageSuivante = $('img[src="http://' + host + image + '"]').parent();
			break;
		case "m.lirescan.net" :
			var image = getImage($, host);
			lienPageSuivante = $('#imglink');
			break;
    }

    lienPageSuivante = lienPageSuivante ? (lienPageSuivante.attr ? lienPageSuivante.attr('href') : (lienPageSuivante.href ? lienPageSuivante.href : lienPageSuivante)) : null;
	
    if(lienPageSuivante && lienPageSuivante.indexOf('http://') < 0){
        lienPageSuivante = 'http://' + host + lienPageSuivante
    }
    console.log("Page suivante : " + lienPageSuivante)
    return lienPageSuivante;
}

/*annonces de la page de recherche*/
function getImage($, host) {
	var image = null;
    switch(host){
        case "lelscans.net" :
		case "lelscans.com" :
		case "lelscans.co" :
            image = $('div[id="image"] a[href^="http://' + host + '"] img').attr('src');
            break;
			
		case "www.japanread.net" :
			image = $('img#img_mng_enl').attr('src');	
			break;
		case "m.lirescan.net" :
			image = $('#image_scan').attr('src');
			break;
    }
	if(image){
		if(image.indexOf('http://') < 0){
			image = 'http://' + host + image;
		}
		console.log("Image src : " + image);
		image = XRegExp.exec(image, regexURL).path;
		image = image.trim()
		console.log(clc.blue("Image : ") + clc.bgCyan(image));
	}else{
		console.log("Plus d'image => Fin !");
	}
    return image;
}

function getRequestSettings(host) {
    switch(host){
        case "www.leboncoin.fr" :
            settings.request.encoding = 'binary';
            break;
        default :
            settings.request.encoding = 'utf8';
            break;
    }
    return settings.request;
}
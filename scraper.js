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
	'http://lelscanv.com/scan-fairy-tail/532',
	//http://m.lirescan.net/fairy-tail-lecture-en-ligne/522/
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
	'http://lelscans.co/scan-one-piece/873',
	'https://scantrad.fr/mangas/one-punch-man/96?page=1',
	'https://scantrad.fr/mangas/hunter-x-hunter/378?page=1',
	'http://lelscanv.com/scan-black-clover/174',
	'http://lelscanv.com/scan-shingeki-no-kyojin/108',
	//'http://mangapedia.fr/lel/BlackClover/47/93/1',
	'https://scantrad.fr/mangas/fairytail-100-years-quest/1?page=1',
	'https://scantrad.fr/mangas/jagaaaaaan/1?page=1',
	'http://www.scan-manga.com/lecture-en-ligne/Isekai-Mahou-wa-Okureteru-Chapitre-7-FR_74598.html#3886.74598.1822057',
	'http://lelscanv.com/scan-the-seven-deadly-sins/284',
	'https://scantrad.fr/mangas/shokuryou-jinrui-starving-anonymous/1?page=1',
	'https://www.manga-lel.com/manga/the-gamer/1/25'
];

urls = [urls[17]];

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
	if(res.headers){
		console.log('content-type:', res.headers['content-type']);
	    console.log('content-length:', res.headers['content-length']);
	}
    
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

			var match = XRegExp.exec(url, getRegex(host, url));
			

            var image = getImage($, host);
			
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
				page = (Array(3).join('0') + page).slice(-3)
			else
				page = '00';
            console.log("Page : " + page);
			
			//var ext = match[3];
			try {
				var ext = /\.(\w+)$/.exec(image)[1];
            	console.log("Extension : " + ext);
			} catch (error) {
				console.error("Error" + error);
				var nextPage = getPageSuivante($, host);
				if(nextPage){
					search(nextPage, host)
				}
				return;
			}
			
			
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
					  
					  var nextPage = getPageSuivante($, host, match[2], url);
						if(nextPage){
							search(nextPage, host)
						}
					});
					
				});
			}else{
				var nextPage = getPageSuivante($, host, match[2], url);
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
		case "scantrad.fr" :
			regex = new RegExp(".*?\/(\\d+)\\?page=(\\d+)");
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

	if(url.indexOf("fairytail-100-years-quest") > 0){
        manga = "Fairy Tail 100 years quest";
	}
	
	if(url.indexOf("nanatsu-no-taizai") > 0
		|| url.indexOf("seven-deadly-sins") > 0
	){
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
	
	if(url.indexOf("One-punch-man") > 0
		|| url.indexOf("one-punch-man") > 0){
        manga = "One Punch Man";
    }
	
	if(url.indexOf("one-piece") > 0){
        manga = "One Piece";
    }
	
	if(url.indexOf("gto-paradise-lost") > 0){
        manga = "GTO Paradise Lost";
	}
	
	if(url.indexOf("detective-conan") > 0){
        manga = "Detective Conan";
    }
	
	if(url.indexOf("gantz") > 0){
        manga = "Gantz";
	}
	
	if(url.indexOf("black-clover") > 0
		|| url.indexOf("BlackClover") > 0){
        manga = "Black Clover";
	}

	if(url.indexOf("jagaaaaaan") > 0){
        manga = "Jagaaaaaan";
	}

	if(url.indexOf("shingeki-no-kyojin") > 0){
        manga = "Attaque des Titans";
	}

	if(url.indexOf("shokuryou-jinrui") > 0){
        manga = "Starving Anonymous";
	}

	if(url.indexOf("the-gamer") > 0){
        manga = "The Gamer";
	}
	
	

    console.log(clc.blue("Manga : ") + clc.bgGreen(manga))
    return manga;
}

/*cherche la page suivante de la recherche - sinon null*/
function getPageSuivante($, host, page, url, chapter) {
    var lienPageSuivante = null;
    switch(host){
        case "lelscans.net" :
		case "lelscans.com" :
		case "lelscanv.com" :
		case "lelscans.co" :
            lienPageSuivante = $('a:contains("Suiv")');
            break;
			
		case "www.japanread.net" :
			//var image = getImage($, host);
			lienPageSuivante = $('img[src="http://' + host + image + '"]').parent();
			break;
		case "m.lirescan.net" :
			//var image = getImage($, host);
			lienPageSuivante = $('#imglink');
			break;
		case "scantrad.fr" :
			//var image = getImage($, host);
			lienPageSuivante = $('#content > div.row.image > a');
			break;
		case "mangapedia.fr" :
			lienPageSuivante = $('a:contains("Suiv")');
			break;
		case "www.manga-lel.com" :
			//lienPageSuivante = $('img[data-src*="' + image + '"]').next().attr('data-src');
			let option = $('#page-list > option')[page - 1];
			let next = $(option).next();
			if(next && next.length == 1){
				console.log("next")
				lienPageSuivante = $('<a href="' + url.substring(0, url.lastIndexOf('/') + 1) + next.attr('value') + '"></a>');
			} else {
				let chapter = $('#chapter-list > ul > li > a[href="' + url.substring(0, url.lastIndexOf('/')) + '"]')
				let prev = $(chapter).parent().prev()
				if(prev && prev.length == 1){
					console.log("prev")
					//console.log("ffffffffffffffffffffffffffffff" + $(chapter).attr('href'))
					lienPageSuivante = prev.children('a')
					lienPageSuivante.attr('href', lienPageSuivante.attr('href') + "/1")
					//console.log($(chapter).parent().next('li'));
					//let nextChapter = $(chapter).parent().next().children('a');
				}
			}
			
			break;
    }

	
	
	lienPageSuivante = lienPageSuivante ? (lienPageSuivante.attr ? lienPageSuivante.attr('href') : (lienPageSuivante.href ? lienPageSuivante.href : lienPageSuivante)) : null;
	
	if(host == "scantrad.fr" && lienPageSuivante.indexOf("page=") < 0){
		lienPageSuivante += "?page=1";
	}
	
    if(lienPageSuivante && lienPageSuivante.indexOf('http') < 0){
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
		case "lelscanv.com" :
		case "lelscans.co" :
            image = $('div[id="image"] a[href^="http://' + host + '"] img').attr('src');
            break;
			
		case "www.japanread.net" :
			image = $('img#img_mng_enl').attr('src');	
			break;
		case "m.lirescan.net" :
			image = $('#image_scan').attr('src');
			break;
		case "scantrad.fr" :
			image = $('#content > div.row.image > a > img').attr('src');
			break;
		case "mangapedia.fr" :
			
			image = $('table').css('background-image').replace(/^url\(['"]?/,'').replace(/['"]?\)$/,'');
			break;
		case "www.manga-lel.com" :
			//console.log($('html').html())
			image = $('#ppp > a > img').attr('src');
			break;
    }
	if(image){
		if(image.indexOf('http') < 0){
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
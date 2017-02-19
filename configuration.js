module.exports = {
    cheerio : {
        normalizeWhitespace: true,
        xmlMode: false,
        decodeEntities: true
    }
    , request : {timeout: 200000, encoding: null}
    , sites : {
        lelscan : {
            url : 'http://lel-scan.me',
            mangas : {
                fairytail : {
                    url : 'lecture-fairy-tail'
                }
            } 
        },
        japanread : {
            url : 'http://www.japanread.net/manga',
            mangas : {
                sevendeadlysins : {
                    url : 'nanatsu-no-taizai'
                },
                hunterxhunter : {
                    url : '/hunter-x-hunter'
                },
                magi : {
                    url : 'magi-the-labyrinth-of-magic'
                },
                claymore : {
                    url : 'claymore'
                },
                berserk : {
                    url : 'berserk'
                },
                onepunchman : {
                    url : 'One-punch-man'
                },
                onepiece : {
                    url : 'one-piece'
                },
                gtoparadiselost : {
                    url : 'gto-paradise-lost'
                }
            }
        }
    },
    regexpurl : '^(?<scheme> [^:/?]+ ) ://   # aka protocol   \n\
			      (?<host>   [^/?]+  )       # domain name/IP \n\
			      (?<path>   [^?]*   ) \\??  # optional path  \n\
			      (?<query>  .*      )       # optional query'
}

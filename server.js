// Write your package code here!

// Variables exported by this module can be imported by other packages and
// applications. See meteor-clippings-tests.js for an example of importing.

// import clippings from "meteor/clippings.js";

let nodefs = Npm.require('fs');
// let url = Npm.require('url');
let nodeurl = require('url');
let nodepath = require('path');
let pathParse = require('path-parse');
let cheerio = require('cheerio');
let chokidar = require('chokidar');
var slug = require('slug')
var mime = require('mime-types')

var debug=true;

export const name = 'clippings';

 
clippings={};
clippings.load=function() {
	try {
		nodefs.readFile(nodepath.join(process.env.CLIPPINGS_DIR,'sitemap.xml'), 'utf8', Meteor.bindEnvironment(function (err, sitemap_xml) {
			if (err) {
				console.log('Error: ' + err);
				return;
			} else {
				
				Clippings.update({}, {$set:{status:'pending'}},{multi:true});
				
				if (debug) console.log('Parsing Data Started');
				xml2js.parseString(sitemap_xml, Meteor.bindEnvironment(function (err, sitemap) {
				    // if (debug) console.dir(result);
					if (debug) eyes(sitemap);
					
					if (sitemap.urlset && sitemap.urlset.url) {
						
						for (let u in sitemap.urlset.url) {
							if (sitemap.urlset.url[u].loc) {
								let loc=sitemap.urlset.url[u].loc[0];
								let lastmod=sitemap.urlset.url[u].lastmod[0];
								let urlparts=nodeurl.parse(loc,true);
								// if (debug) eyes({urlparts});
								let file=urlparts.path.replace(/^\/clippings/,'');
								let pathparts=pathParse.posix(urlparts.path);
								if (debug) eyes({pathparts});
								let dir=pathparts.dir;
								let dirparts=pathParse.posix(pathparts.dir);
								let folder=(dirparts.dir!='/')?dirparts.base:'';
								
								let path=nodepath.join(process.env.CLIPPINGS_DIR,file);
								let page={file};
								if (debug) eyes({page});
								(Meteor.bindEnvironment(function(folder,file,loc,lastmod) {
									if (debug) console.time(folder);
									nodefs.readFile(path, 'utf8', Meteor.bindEnvironment(function (err, html) {
										// if (debug) eyes({html});
										if (html && html.length) {
											var COMMENT_PSEUDO_COMMENT_OR_LT_BANG = new RegExp(
											    '<!--[\\s\\S]*?(?:-->)?'
											    + '<!---+>?'  // A comment with no body
											    + '|<!(?![dD][oO][cC][tT][yY][pP][eE]|\\[CDATA\\[)[^>]*>?'
											    + '|<[?][^>]*>?',  // A pseudo-comment
											    'g');
											html=html.replace(COMMENT_PSEUDO_COMMENT_OR_LT_BANG,'');
											// html=html.replace(/<!--[\s\S]*?-->/g,'');
											// if (debug) eyes({html});
										    let $ = cheerio.load(html);
											$('.navbar').remove();
										
										
											// if (debug) eyes({body:$('body').html()});
											// if (debug) eyes({head:$('head').html()});
											// if (debug) eyes({title:$('title').text()});


											[{sel:'img',attr:'src'},{sel:'script',attr:'src'},{sel:'link',attr:'href'}].forEach(function(combo) {
												$(combo.sel).each(function(index,element) {
													let src=$(element).attr(combo.attr);
													if (src) {
														let parse=nodeurl.parse(src);
														if (!parse.protocol && !parse.host) {
															let abs=nodepath.resolve(dir,src)
															$(element).attr(combo.attr,abs);
														}
													}
												});
											})
										
											let title=$('title').text();
											if (title.indexOf('|')>=0) title=title.substr(0,title.indexOf('|')-1);
											page.title=title;
											// page.html=html;

											page.head=$('head').html();
											page.body=$('body').html();
										
											// page._id=folder;
											page.folder=folder;
											if (loc && loc.length) page.loc=loc;
											if (lastmod && lastmod.length) page.lastmod=Date.parse(lastmod);
											page.status='active';
										
											if (debug) eyes(page);
										
										    // Clippings.insert(page);
										    Clippings.upsert(slug((title||folder).toLowerCase()),{$set:page});
											if (debug) console.timeEnd(folder)
										
											if (u>=(sitemap.urlset.url.length-1)) {
												Clippings.remove({status:'pending'});
											}
										}
									}))
								}))(folder,file,loc,lastmod);
								// }
							}
						}
						// if (debug) eyes({clippings})
					}
				}));
				
				// let datat=parseStringSync(sitemap_xml)
				// 			    if (debug) console.dir(data);
			}
		}));
		
	} catch(e) {
		console.error(e);
	}
}

clippings.timeoutId=null;
clippings.reload=function() {
	Meteor.clearTimeout(clippings.timeoutId);
	clippings.timeoutId=Meteor.setTimeout(function() {
		clippings.load();
	},1000);
}

Clippings = new Meteor.Collection('clippings', { connection: null });

Meteor.publish('clippings', function (query) {
	let result=Clippings.find((typeof query=='object')?query:((typeof query=='string')?{_id:query}:{}));
	if (debug) eyes({query,res:result.fetch()});
	return result;
});

Meteor.startup(function() {
	// if (debug) eyes({joris:'gek'})
	
	clippings.reload();
});

// STATIC SERVER *******************************************************
// var fs = Npm.require('fs');
WebApp.connectHandlers.use(function(req, res, next) {
	// if (debug) eyes('hi');
    var re = /^\/clippings(?:\/(.*))?$/.exec(req.url);
	// if (debug) eyes({re});
    if (re && re.length) {   // Only handle URLs that start with /clippings/*
		// if (debug) eyes(process.env.CLIPPINGS_DIR);
		var path=(re.length>1 && re[1] && re[1].length && re[1]!='/')?re[1]:'index.html';
		let urlparts=nodeurl.parse(path,true);
		if (debug) eyes({urlparts});
        var filePath = nodepath.join(process.env.CLIPPINGS_DIR,'/',urlparts.pathname);
		if (debug) eyes({filePath});
		
		let fileParts=pathParse.posix(filePath);
		if (debug) eyes({fileParts});
		
		let mimeType=mime.contentType(nodepath.extname(filePath));
		
		nodefs.readFile(filePath,Meteor.bindEnvironment(function read(err, data) {
		    if (err) {
		        throw err;
		    }
			if (data) {
				if (mimeType) {
					if (debug) eyes({mimeType});
			        res.writeHead(200, {
		                'Content-Type': mimeType
		            });
				}
		        res.write(data);
		        res.end();
			}
		}));
    } else {
        next();
    }
});


// WATCHER *****************************************************
// Initialize watcher.
var watcher = chokidar.watch(nodepath.join(process.env.CLIPPINGS_DIR)/*publicFolder() + '/clippings'*/, {
  ignored: /[\/\\]\./,
  persistent: true
});

// Something to use when events are received.
var log = console.log.bind(console);
// Add event listeners.
watcher
  .on('add', Meteor.bindEnvironment(function(path) {
	  if (debug) log(`File ${path} has been added`)
	  clippings.reload();
  }))
  .on('change', Meteor.bindEnvironment(function(path) {
	  if (debug) log(`File ${path} has been changed`)
	  clippings.reload();
  }))
  .on('unlink', Meteor.bindEnvironment(function(path) {
	  if (debug) log(`File ${path} has been removed`)
	  clippings.reload();
  }));

// More possible events.
watcher
  .on('addDir', Meteor.bindEnvironment(function(path) {
	  if (debug) log(`Directory ${path} has been added`)
	  clippings.reload();
  }))
  .on('unlinkDir', Meteor.bindEnvironment(function(path) {
	  if (debug) log(`Directory ${path} has been removed`)
	  clippings.reload();
  }))
  .on('error', Meteor.bindEnvironment(function(error) {
	  if (debug) log(`Watcher error: ${error}`)
	  clippings.reload();
  }))
  .on('ready', Meteor.bindEnvironment(function() {
	  if (debug) log('Initial scan complete. Ready for changes')
	  clippings.reload();
  }))
  .on('raw', Meteor.bindEnvironment(function(event, path, details) {
    if (debug) log('Raw event info:', event, path, details);
	clippings.reload();
  }));

// 'add', 'addDir' and 'change' events also receive stat() results as second
// argument when available: http://nodejs.org/api/fs.html#fs_class_fs_stats
watcher.on('change', Meteor.bindEnvironment(function(path, stats) {
	if (stats) if (debug) console.log(`File ${path} changed size to ${stats.size}`);
	clippings.reload();
}));


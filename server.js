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
var request = require('request')

var debug=false;

export const name = 'clippings';

clippings=clippings || {};

clippings.sources={};

clippings.setSource=function(name,config) {
	clippings.sources[name]=config;
}

clippings.addHTML=function(html,sourceKey,options,callback) 
{
	if (!options) options={};
	if (html && html.length) {
		let page={};
		if (options.file) page.file=options.file;
		if (debug) eyes({page});
	
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
		
		if (clippings.sources[sourceKey] && clippings.sources[sourceKey].process) {
			if (clippings.sources[sourceKey].process.remove) {
				if (typeof clippings.sources[sourceKey].process.remove=='string') {
					$(clippings.sources[sourceKey].process.remove).remove();
				} else if (typeof clippings.sources[sourceKey].process.remove=='object') {
					for (let r in clippings.sources[sourceKey].process.remove) {
						$(clippings.sources[sourceKey].process.remove[r]).remove();
					}
				}
			}
		}
	
	
		// if (debug) eyes({body:$('body').html()});
		// if (debug) eyes({head:$('head').html()});
		// if (debug) eyes({title:$('title').text()});


		[{sel:'img',attr:'src'},{sel:'script',attr:'src'},{sel:'link',attr:'href'}].forEach(function(combo) {
			$(combo.sel).each(function(index,element) {
				let src=$(element).attr(combo.attr);
				if (src) {
					let parse=nodeurl.parse(src);
					if (!parse.protocol && !parse.host) {
						if (options.dir) {
							let abs=nodepath.resolve(options.dir,src)
							$(element).attr(combo.attr,abs);
						}
						if (options.url) {
							let abs=nodeurl.resolve(options.url,src)
							$(element).attr(combo.attr,abs);
						}
					}
				}
			});
		})
	
		if (!clippings.sources[sourceKey].elements) clippings.sources[sourceKey].elements={
			head: 'html',
			title: 'text',
			body: 'html',
		};
		
		if (typeof clippings.sources[sourceKey].elements=='object') {
			page.elements={};
			for (let e in clippings.sources[sourceKey].elements) {
				if (clippings.sources[sourceKey].elements[e]=='html') {
					page.elements[slug(e)]=$(e).html();
				} else if (clippings.sources[sourceKey].elements[e]=='text') {
					page.elements[slug(e)]=$(e).text();
				} else if (clippings.sources[sourceKey].elements[e]=='tags') {
					page.elements[slug(e)]='';
					$(e).each(function(index,element) {
						// console.dir({element});
						let html='<'+element.name;
						for (let a in element.attribs) html+=' '+a+'="'+element.attribs[a]+'"';
						html+='>';
						page.elements[e]+=html;
					});
				}
			}
		}
		
		let title=$('title').text();
		if (title.indexOf('|')>=0) title=title.substr(0,title.indexOf('|')-1);
		page.title=title;
		
		// page.html=html;

		page.head=$('head').html();
		if (options.loc) {
			page.body='<!-- Clipping from '+options.loc+' at '+new Date()+'-->'+$('body').html();
		}
	
		// page._id=folder;
		if (options.folder) page.folder=options.folder;
		if (options.loc && options.loc.length) page.loc=options.loc;
		if (options.lastmod && options.lastmod.length) page.lastmod=new Date(Date.parse(options.lastmod));
		
		page.source=sourceKey;
		page.status='active';
		page.fetchedAt=new Date();
	
		if (debug) eyes(page);
		let id=slug((title||options.folder).toLowerCase());
	    // Clippings.insert(page);
	    Clippings.upsert(id,{$set:page});
		if (debug) console.timeEnd(sourceKey+(options.folder?('-'+options.folder):''))
	
		callback && callback(null,options.last?options.last:undefined);
	}
}


clippings.readFile=function(sourceKey,path,dir,folder,file,loc,lastmod,last,callback)
{
	// eyes({arguments})
	if (debug) console.time(sourceKey+'-'+folder);
	nodefs.readFile(path, 'utf8', Meteor.bindEnvironment(function (err, html) {
		// if (debug) eyes({html});
		clippings.addHTML(html,sourceKey,{dir,folder,file,loc,lastmod,last},callback);
	}))
}

clippings.readURL=function(sourceKey,callback)
{
	// eyes({arguments})
	if (debug) console.time(sourceKey);
	
	request(clippings.sources[sourceKey].url, Meteor.bindEnvironment(function (error, response, html) {
	  if (!error && response.statusCode == 200) {
		  clippings.addHTML(html,sourceKey,{url:clippings.sources[sourceKey].url},callback);
	  }
	}))
}


clippings.load_local=function(sourceKey) {
	if (clippings.sources[sourceKey] && clippings.sources[sourceKey].type=='local' && clippings.sources[sourceKey].sitemap) {
		try {
			nodefs.readFile(nodepath.join(clippings.sources[sourceKey].path,'sitemap.xml'), 'utf8', Meteor.bindEnvironment(function (err, sitemap_xml) {
				if (err) {
					console.log('Error: ' + err);
					return;
				} else {
				
					Clippings.update({source:sourceKey},{$set:{status:'pending'}},{multi:true});
				
					// if (debug) console.log('Parsing Data Started');
					xml2js.parseString(sitemap_xml, Meteor.bindEnvironment(function (err, sitemap) {
						if (debug) eyes(sitemap);
					
						if (sitemap.urlset && sitemap.urlset.url) {
						
							for (let u in sitemap.urlset.url) {
								if (sitemap.urlset.url[u].loc) {
									let loc=sitemap.urlset.url[u].loc[0];
									let lastmod=sitemap.urlset.url[u].lastmod[0];
									let urlparts=nodeurl.parse(loc,true);
									var pattern=new RegExp('^\\\/'+clippings.sources[sourceKey].prefix+'\\\/','')
									let file=urlparts.path.replace(pattern,'');
									let pathparts=pathParse.posix(urlparts.path);
									if (debug) eyes({pathparts});
									let dir=pathparts.dir;
									let dirparts=pathParse.posix(pathparts.dir);
									let folder=(dirparts.dir!='/')?dirparts.base:'';
								
									let path=nodepath.join(clippings.sources[sourceKey].path,file);
									clippings.readFile(sourceKey,path,dir,folder,file,loc,lastmod,u>=(sitemap.urlset.url.length-1),Meteor.bindEnvironment(function(err,last) {
										if (last) {
											Clippings.remove({source:sourceKey,status:'pending'});
										}
									}));
								}
							}
						}
					}));
				}
			}));
		} catch(e) {
			console.error(e);
		}
	}
}

clippings.load_remote=function(sourceKey) {
	if (clippings.sources[sourceKey] && clippings.sources[sourceKey].type=='remote') {
		try {
			Clippings.update({source:sourceKey},{$set:{status:'pending'}},{multi:true});
			clippings.readURL(sourceKey,Meteor.bindEnvironment(function(err) {
				Clippings.remove({source:sourceKey,status:'pending'});
			}));
		} catch(e) {
			console.error(e);
		}
	}
}

clippings.reload_local=function(sourceKey) {
	if (clippings.sources[sourceKey] && clippings.sources[sourceKey].type=='local') {
		Meteor.clearTimeout(clippings.sources[sourceKey].timeoutId);
		clippings.sources[sourceKey].timeoutId=Meteor.setTimeout(function() {
			clippings.load_local(sourceKey);
		},clippings.sources[sourceKey].waitTime || 1000);
	}
}

clippings.reload_remote=function(sourceKey) {
	if (clippings.sources[sourceKey] && clippings.sources[sourceKey].type=='remote') {
		Meteor.clearTimeout(clippings.sources[sourceKey].timeoutId);
		clippings.sources[sourceKey].timeoutId=Meteor.setTimeout(function() {
			clippings.load_remote(sourceKey);
		},clippings.sources[sourceKey].waitTime || 1000);
	}
}

clippings.reload=function() {
	for (let key in clippings.sources) {
		if (clippings.sources[key] && clippings.sources[key].type=='local') {
			clippings.reload_local(key);
		} else if (clippings.sources[key] && clippings.sources[key].type=='remote') {
			clippings.reload_remote(key);
		}
	}
}

Clippings = new Meteor.Collection('clippings', { connection: null });

Meteor.publish('clippings', function (query) {
	let result=Clippings.find((typeof query=='object')?query:((typeof query=='string')?{_id:query}:{}));
	if (debug) eyes({query,res:result.fetch()});
	return result;
});

Meteor.startup(function() {
	if (debug) eyes({clippings});
	for (let key in clippings.sources) {
		if (clippings.sources[key]) {
			if (clippings.sources[key].type=='local') {

				// WATCHER *****************************************************
				// Initialize watcher.
				var watcher = chokidar.watch(nodepath.join(clippings.sources[key].path) , {
				  ignored: /[\/\\]\./,
				  persistent: true
				});

				// Something to use when events are received.
				var log = console.log.bind(console);
				// Add event listeners.
				watcher
				  .on('add', Meteor.bindEnvironment(function(path) {
					  if (debug) log(`File ${path} has been added`)
					  clippings.reload_local(key);
				  }))
				  .on('change', Meteor.bindEnvironment(function(path) {
					  if (debug) log(`File ${path} has been changed`)
					  clippings.reload_local(key);
				  }))
				  .on('unlink', Meteor.bindEnvironment(function(path) {
					  if (debug) log(`File ${path} has been removed`)
					  clippings.reload_local(key);
				  }));

				// More possible events.
				watcher
				  .on('addDir', Meteor.bindEnvironment(function(path) {
					  if (debug) log(`Directory ${path} has been added`)
					  clippings.reload_local(key);
				  }))
				  .on('unlinkDir', Meteor.bindEnvironment(function(path) {
					  if (debug) log(`Directory ${path} has been removed`)
					  clippings.reload_local(key);
				  }))
				  .on('error', Meteor.bindEnvironment(function(error) {
					  if (debug) log(`Watcher error: ${error}`)
					  clippings.reload_local(key);
				  }))
				  .on('ready', Meteor.bindEnvironment(function() {
					  if (debug) log('Initial scan complete. Ready for changes')
					  clippings.reload_local(key);
				  }))
				  .on('raw', Meteor.bindEnvironment(function(event, path, details) {
				    if (debug) log('Raw event info:', event, path, details);
					clippings.reload_local(key);
				  }));

				// 'add', 'addDir' and 'change' events also receive stat() results as second
				// argument when available: http://nodejs.org/api/fs.html#fs_class_fs_stats
				watcher.on('change', Meteor.bindEnvironment(function(path, stats) {
					if (stats) if (debug) console.log(`File ${path} changed size to ${stats.size}`);
					clippings.reload_local(key);
				}));
			} else if (clippings.sources[key].type=='remote') {
				clippings.reload_remote(key);
			}
		}
	}
});


// STATIC SERVER *******************************************************
WebApp.connectHandlers.use(function(req, res, next) {
	for (let key in clippings.sources) {
		if (clippings.sources[key]) {
			if (clippings.sources[key].type=='local') {
				if (clippings.sources[key].prefix) {
					var pattern=new RegExp('^\\\/'+clippings.sources[key].prefix+'(?:\\\/(.*))?$','')
					// eyes({pattern});
					var re=pattern.exec(req.url);
					// if (debug) eyes({re});
				    if (re && re.length) {   // Only handle URLs that start with /clippings/*
						// if (debug) eyes(clippings.sources[sourceKey].path);
						var path=(re.length>1 && re[1] && re[1].length && re[1]!='/')?re[1]:'index.html';
						let urlparts=nodeurl.parse(path,true);
						if (debug) eyes({urlparts});
				        var filePath = nodepath.join(clippings.sources[key].path,'/',urlparts.pathname);
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
						return;
				    }
				}
			}
		}
	}
    next();
});







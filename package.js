Package.describe({
	name: 'jorisroling:meteor-clippings',
	version: '0.0.2',
	// Brief, one-line summary of the package.
	summary: 'Web Clippings with Meteor',
	// URL to the Git repository containing the source code for this package.
	git: 'https://github.com/jorisroling/meteor-clippings',
	// By default, Meteor will default to using README.md for documentation.
	// To avoid submitting documentation, set this field to null.
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.3.2.4');
	api.use([
		'meteor-platform', 
		'ecmascript',
		'jorisroling:eyes@0.0.15',
		'phambanhan:xml2js@0.0.2',
	]);
    api.addFiles('server.js', 'server');
	api.addFiles(['clipping.html','clipping.css','client.js'], 'client');
	api.export('clippings');
	
	Npm.depends({
		'path-parse': '1.0.5',
		'cheerio':'0.20.0',
		'chokidar':'1.5.1',
		'slug':'0.9.1',
		'mime-types':'2.1.11',
		'request':'2.72.0',
	});
	
});

Package.onTest(function(api) {
	api.use('ecmascript');
	api.use('tinytest');
	api.use('meteor-clippings');
	api.mainModule('tests.js');
});

Clippings = new Meteor.Collection('clippings');

Template.clipping.onCreated(function() {
	var q=(typeof this.data=='object')?(this.data.debug?JSON.parse('{"' + decodeURI(location.search.substring(1).replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}'):this.data):{_id:this.data};
	// console.log({q});
    this.subscribe('clippings',q);
});

Template.clipping.helpers({
	page() {
		var q=(typeof this=='object')?(this.debug?JSON.parse('{"' + decodeURI(location.search.substring(1).replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}'):this):{_id:this};
		return Clippings.find(q);
	}
})

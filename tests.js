// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

import { name as packageName } from "meteor/meteor-clippings";

// Write your tests here!
// Here is an example.
Tinytest.add('meteor-clippings - example', function (test) {
	test.equal(packageName, "meteor-clippings");
});

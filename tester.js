var request = require('request'),
	GtfsRealtimeBindings = require('gtfs-realtime-bindings');

var requestSettings = {
  method: 'GET',
  url: 'http://localhost:3000/positions',
  encoding: null
};

request(requestSettings, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
    feed.entity.forEach(function(entity) {
      if (entity) {
        console.log(entity);
      }
    });
  }
});

var request = require('sync-request'),
  protobuf = require("protobufjs"),
  express = require("express"),
  schedule = require('node-schedule'),
  app = express();

var apiURL = 'https://info.stbsa.ro';
//var apiURL = 'https://info.ctbus.ro';

var globCode1,gdata = request('GET', apiURL + '/rp/api/lines/'), temp=[];
gdata = JSON.parse(gdata.getBody('utf8'));

function msToHMS(ms) {
    var seconds = ms / 1000;
    var hours = parseInt(seconds / 3600);
    seconds = seconds % 3600;
    var minutes = parseInt(seconds / 60);
    seconds = seconds % 60;
    return (hours + ":" + minutes);
}

function updateFeed(){
  temp = [];console.log('Updating...');start = new Date();
  for (var i = 0; i < gdata.lines.length; i++) {
  	try{
		data = request('GET', apiURL + '/rp/api/lines/'+gdata.lines[i].id+'/vehicles/0');
		data = JSON.parse(data.getBody('utf8'));
		for (var j = 0; j < data.length; j++) {
			temp.push({
				"vehicleLat": data[j].lat,
				"vehicleLong": data[j].lng,
				"vehicleDate": new Date(),
				"vehicleName": data[j].code,
				"route_id": gdata.lines[i].id.toString()
			});
		}
		data = request('GET', apiURL + '/rp/api/lines/'+gdata.lines[i].id+'/vehicles/1');
		data = JSON.parse(data.getBody('utf8'));
		for (var j = 0; j < data.length; j++) {
			temp.push({
				"vehicleLat": data[j].lat,
				"vehicleLong": data[j].lng,
				"vehicleDate": new Date(),
				"vehicleName": data[j].code,
				"route_id": gdata.lines[i].id.toString()
			});
		}
		console.log('Updated line '+gdata.lines[i].id);
	}catch(err){ console.log('Skipped line '+gdata.lines[i].id); }
  }
  console.log('Updated all...');end = new Date();
  console.log('In: '+msToHMS(end - start));

  protobuf.load("gtfs-realtime.proto", function(err, root) {
      if (err)
          throw err;
      var FeedMessage = root.lookupType("transit_realtime.FeedMessage");
      var payload = { 
        header:{
        gtfsRealtimeVersion: "1.0",
        incrementality: 0,
        timestamp:Math.round(Date.now()/1000)
      },
      entity:[
        
      ]
    };

  	for (var i = temp.length - 1; i >= 0; i--) {
  		payload.entity.push({
        id: i.toString(),
        vehicle: {
          trip: { routeId: temp[i].route_id },
          vehicle: { label: temp[i].vehicleName },
          position: { latitude: temp[i].vehicleLat, longitude: temp[i].vehicleLong },
          timestamp: Math.round((temp[i].vehicleDate.getTime())/1000)
        }
      });
  	}

    var errMsg = FeedMessage.verify(payload);
    if (errMsg)
        throw Error(errMsg);
    var message = FeedMessage.create(payload);
    globCode1 = (FeedMessage.encode(message).finish());

  });
};

app.get('/positions', function(req, res){
  console.log('Request protobuf');
  res.send(globCode1);
});

updateFeed();

var j = schedule.scheduleJob('*/5 * * * *', function(){
  updateFeed();
});

app.listen(3000);

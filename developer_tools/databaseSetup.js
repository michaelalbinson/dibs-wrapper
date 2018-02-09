var monk = require('monk');
var db = monk('localhost:27017/roomDatabase');
var roomInfo = db.get('roomDatabase');

getAPIInfo();

function getAPIInfo() {
    var request = require('request');
    var fs = require('fs'); // file system calls, in order to see if we have a local copy of the photo on the server
    var str = "https://queensu.evanced.info/dibsAPI/rooms";

    request(str, function (err, res, body) {
            for (var json in JSON.parse(body)) {
                var data = JSON.parse(body)[json];
                if (data.Name.indexOf("BMH 111") >= 0)
                    data.Name = "BMH 111";

                var description = data.Description;
                if (description.indexOf("TV") > 0 || description.indexOf("Projector") > 0)
                    data.tv = true;
                else
                    data.tv = false;

                if (description.indexOf("Small") >= 0 || description.indexOf("small") >= 0)
                    data.size = 0;  // set 0 as small
                else if (description.indexOf("Medium") >= 0)
                    data.size = 1;    // set 1 as medium
                else if (description.indexOf("Large") >= 0)
                    data.size = 2;  // set 2 as large
                else {
                    data.size = 3; // this is room 111, or the "other" type room
                    data.special = true;
                }

                var roomNum = data.Name.match(/\d+/)[0]; // get the number from the room
                var roomPicName = "BMH" + roomNum + ".jpg";
                if (fs.existsSync("../public/IMG/" + roomPicName)) {
                    data.Picture = "IMG/" + roomPicName;
                }

                if (description.indexOf("phone") >= 0 || description.indexOf("Phone") >= 0)
                    data.phone = true;

                data.Free = createFreeArray(true, 16, 2);

                roomInfo.insert(data);
                console.log(data);
            }
        }
    );
}

function createFreeArray(val, len, weeks) {
    var out = new Array(weeks * 7);
    for (var j = 0; j < weeks * 7; j++) {
        var curDay = new Array(len);
        for (var i = 0; i < len; i++) {
            curDay[i] = {
                free: val,
                time: ((7 + i) >= 10 ? (7 + i) : "0" + (7 + i)) + ":30 - " + ((8 + i) >= 10 ? (8 + i) : "0" + (8 + i)) + ":30",
                startTime: 7 + i,
                owner: 0,
            };
        }
        out[j] = curDay;
    }
    return out;
}
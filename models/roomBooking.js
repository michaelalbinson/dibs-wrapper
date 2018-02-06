var monk = require('monk');
var db = monk('localhost:27017/roomDatabase');
var roomDatabase = db.get('roomDatabase');
var userFuncs = require('../models/userFunctions');
var consts = require('../config/config');

//use is same as roomDatabase


/**
 *
 * @param day
 * @param time
 * @param roomID
 * @param usrid
 * @returns {promise}
 */
function bookRoom(day, time, roomID, length, usrid, req) { //books a room at a certain time and day and sets the owner to be the usrid
    return new Promise(function (resolve, reject) {

        if (!userFuncs.canBookMoreRooms(req)) {
            var out = {
                header: "Booking failed",
                bookMsg: "Sorry, You have booked too many rooms.  There are a max of " + consts.room_booking_limit + " room bookings allowed.",
                success: false
            };

            resolve(out);
            return;
        }
        roomDatabase.find({RoomID: roomID}).each(function (data, val) {
            var temp = data.Free;
            var out = {
                header: "Booking failed",
                bookMsg: "Sorry, an error occured and the room was not booked.  Please try again later.",
                success: false
            };
            var end = length + parseInt(time, 10);
            for (var i = time; i < end; i++) {
                if (temp[i - 7].free === true) {
                    temp[time - 7].free = false;
                    temp[time - 7].owner = usrid;
                }
                else {
                    out.bookMsg = "Sorry, this room is booked.  Looks like someone beat you to it :(";
                    out.header = "Room Already Booked"
                    resolve(out);
                }
            }
            if (userFuncs.updateBookingCount(1, req)) {

                roomDatabase.update({RoomID: roomID}, {$set: {Free: temp}});
                out.success = true;
                out.bookMsg = "Booking successful for " + data.Name + " at " + time + ":30";
                out.header = "Booking Success!";

            }
            else {
                out = {
                    header: "Booking failed",
                    bookMsg: "Sorry, an error occured and the room was not booked.  Please try again later.",
                    success: false
                };
            }
            resolve(out);


        });
    });
}

/**
 *
 * @param day
 * @param time
 * @param roomID
 * @param usrid
 */
function unbookRoom(day, time, length, roomID, usrid, req) {
    return new Promise(function (resolve, reject) {
        roomDatabase.find({RoomID: roomID}).each(function (data, val) {
            var temp = data.Free;
            var out = {
                header: "Unbooking failed",
                bookMsg: "Sorry, an error occured and the room was not unbooked.  Please try again later.",
                success: false
            };

            var end = length + parseInt(time, 10);
            for (var i = time; i < end; i++) {
                if (temp[time - 7].free === false && temp[time - 7].owner === usrid) {
                    temp[time - 7].free = true;
                    temp[time - 7].owner = 0;
                    out.success = true;
                    out.bookMsg = "Unbooking successful for " + data.Name + " at " + time + ":30";
                    out.header = "Unbooking Success!";
                }
                else {
                    out.success = false;
                    out.bookMsg = "Sorry, this room is unbooked.  Looks like someone beat you to it :(";
                    out.header = "Room Already Unbooked"
                    resolve(out);
                }
            }

            if (userFuncs.updateBookingCount(-1, req)) {
                roomDatabase.update({RoomID: roomID}, {$set: {Free: temp}});
            }
            resolve(out);

        });
    });
}

function unbookAllForUser(day, startTime, roomID, usrid, req) {
    return new Promise(function (resolve, reject) {
        roomDatabase.find({RoomID: roomID}).each(function (data, val) {
            var temp = data.Free;
            var out = {
                header: "Unbooking failed",
                bookMsg: "Sorry, an error occured and the room was not unbooked.  Please try again later.",
                success: false
            };

            for (var time = startTime; time < 23; time++) {
                if (temp[time - 7].free === false && temp[time - 7].owner === usrid) {
                    temp[time - 7].free = true;
                    temp[time - 7].owner = 0;
                    out.success = true;
                    out.bookMsg = "Unbooking successful for " + data.Name + " at " + time + ":30";
                    out.header = "Unbooking Success!";
                }
            }

            if (userFuncs.resetBookingCount(req)) {
                roomDatabase.update({RoomID: roomID}, {$set: {Free: temp}});
            }
            resolve(out);

        });
    });
}

function unbookAllForRoom(day, roomID) {
    return new Promise(function (resolve, reject) {
        roomDatabase.find({RoomID: roomID}).each(function (data, val) {
            var temp = data.Free;
            var out = {
                success: false
            };

            for (var time = 7; time < 23; time++) {
                temp[time - 7].free = true;
                temp[time - 7].owner = 0;
            }
            out.success = true;

            roomDatabase.update({RoomID: roomID}, {$set: {Free: temp}}, {multi: true});

            resolve(out);

        });
    });
}


module.exports = {
    bookRoom: bookRoom,
    unbookRoom: unbookRoom,
    unbookAllForUser: unbookAllForUser,
    unbookAllForRoom: unbookAllForRoom
};
import { setCurrentHour, setRooms, setTimeCount } from '../store/actions/rooms';
import template from '../server/template';
import createStore from '../store/createStore';
import renderAppToString from '../server/renderAppToString';

import { getListOfRoomState } from '../../models/roomDatabase.js'; //the roomDatabase interface which provide 5 functions. Look in the file for how to use them
import { getAdminStatus, getUserID } from '../lib/userFunctions';
import { setAccountType, setLoggedIn } from '../store/actions/user';
import { compile } from '../server/compileSass';
import { UserAccountType } from '../types/enums/user';
import { getDaysFromToday } from '../lib/dateFuncs';

const express = require('express');
const router = express.Router();

async function createStoreInstance(req, data, current_hour, timeCount) {
  const store = createStore({});
  await store.dispatch(setRooms(data));
  await store.dispatch(setCurrentHour(current_hour));
  await store.dispatch(setTimeCount(timeCount));
  await store.dispatch(setLoggedIn(req.isAuthenticated()));
  const accountType = getAdminStatus(req) ? UserAccountType.Admin : UserAccountType.Regular;

  await store.dispatch(setAccountType(accountType));
  return store;
}

router.get('/', async function (req, res, next) {
  const dateObj = new Date();
  let current_hour = dateObj.getHours();
  const current_min = dateObj.getMinutes();
  let day = 0;

  if (current_min < 30)   // logic here is that we are returning the status based on the start hour.  Since the min booking time is
    current_hour--;       // 1 hour, if the current minute is less than 30, we are still within the previous booking slot
                          // and we should therefore subtract 1 from the hour to get the right data (eg. if it is 7:10pm
                          // right now, then we really want the data from 6:30 - 7:30, not 7:30 - 8:30)

  const userid = getUserID(req);

  const listFree = await getListOfRoomState(day, -1, userid);
  const timecount = [];

  const startCheck = (current_hour < 7) ? 7 : current_hour;

  for (let i = startCheck - 7; i < listFree[i].isFree.length; i++) {
    let amOrPm = (startCheck >= 11) ? " PM" : " AM";
    const startTime = (((i + 7) % 12 === 0) ? '12' : (i + 7) % 12) + ":30";
    const endTime = (((i + 7 + 1) % 12 === 0) ? '12' : (i + 7 + 1) % 12) + ":30";

    timecount.push({
      hourCount: 0,
      totalCount: 0,
      timeString: startTime + '-' + endTime + amOrPm,
      totalFree: 0,
      hour: (i + 7) % 12,
      twenty4Hour: i + 7,
      pillClass: 'badge-success'
    });
  }

  for (let i = 0; i < listFree.length; i++) {
    let count = 0;
    let mine = 0;
    for (let j = startCheck - 7; j < listFree[i].isFree.length; j++) {
      if (!listFree[i].isFree[j].free) {
        count++;
        timecount[j - startCheck + 7].hourCount++;
      }

      if (listFree[i].isFree[j].owner == userid) {
        mine++;
        listFree[i].isFree[j].isMine = true;
      } else
        listFree[i].isFree[j].isMine = false;

      timecount[j - startCheck + 7].totalCount++;
    }
  }

  for (let i = 0; i < timecount.length; i++)
    timecount[i].totalFree = timecount[i].totalCount - timecount[i].hourCount;

  const store = await createStoreInstance(req, listFree, current_hour, timecount);
  const context = {};
  const { html: body, css: MuiCss } = renderAppToString(req, context, store);
  const title = 'QBook';
  const theme = req.theme === "custom" ? false : req.theme || 'default';
  const cssPath = [`/CSS/room-style/${theme}-room-style.css`];
  const compiledCss = compile('src/SCSS/main.scss');

  res.send(template({
    body,
    title,
    cssPath,
    compiledCss,
    MuiCss
  }));

});

router.post('/index', async function (req, res) {
  const data = JSON.stringify(req.body);
  const obj = JSON.parse(data);
  const dateStr = obj.day;
  const postDataDate = new Date(dateStr);
  console.log("got the post! ", obj);
  const dateObj = new Date();
  let current_hour = dateObj.getHours();
  const current_min = dateObj.getMinutes();

  const daysFromToday = getDaysFromToday(postDataDate);

  if (daysFromToday < 0 || daysFromToday > 13)
    res.send("404", {
      list: "",
      prettyDate: ""
    });

  else {
    if (current_min < 30)
      current_hour--;

    const usrid = getUserID(req);

    const listFree = await getListOfRoomState(daysFromToday, -1, usrid);
    console.log('getting data for: ', daysFromToday, current_hour);
    const timecount = [];

    for (let i = 0; i < listFree[i].isFree.length; i++) {
      let amOrPm = (i >= 4) ? " PM" : " AM";
      const startTime = (((i + 7) % 12 === 0) ? '12' : (i + 7) % 12) + ":30";
      const endTime = (((i + 7 + 1) % 12 === 0) ? '12' : (i + 7 + 1) % 12) + ":30";

      timecount.push({
        hourCount: 0,
        totalCount: 0,
        timeString: startTime + '-' + endTime + amOrPm,
        totalFree: 0,
        hour: (i + 7) % 12,
        twenty4Hour: i + 7,
        pillClass: 'badge-success'
      });
    }

    for (let i = 0; i < listFree.length; i++) {
      let count = 0;
      let mine = 0;
      for (let j = 0; j < listFree[i].isFree.length; j++) {
        if (!listFree[i].isFree[j].free) {
          count++;
          timecount[j].hourCount++;
        }
        if (listFree[i].isFree[j].owner == usrid) {
          mine++;
          listFree[i].isFree[j].isMine = true;
        } else
          listFree[i].isFree[j].isMine = false;

        timecount[j].totalCount++;
      }
    }

    for (let i = 0; i < timecount.length; i++)
      timecount[i].totalFree = timecount[i].totalCount - timecount[i].hourCount;

    const prettyDate = formatDate(postDataDate);

    res.send({
      list: listFree,
      timeCount: timecount,
      currentHour: current_hour,
      prettyDate: prettyDate,
      day: daysFromToday
    });
  }
});

function formatDate(date) {
  let d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

export default router;

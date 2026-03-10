const fs = require("fs");
const { start } = require("repl");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function toseconds(time){
   let [clock,period] = time.split(" ");
   let [h,m,s] = clock.split(":").map(Number);

   if(period=="pm" && h!==12) h+=12;
   if(period=="am" && h==12) h=0;

   return h*3600 + m*60 + s;
}
function getShiftDuration(startTime, endTime) {
   function toseconds(time){
   let [clock,period] = time.split(" ");
   let[h,m,s] = clock.split(":").map(Number);
   
   if(period=="pm" && h!==12 ) 
    h+=12;
   if(period=="am" && h == 12)
    h=0;
return h*3600 + m*60 + s;
   }
let shiftDiff = toseconds(endTime) - toseconds(startTime);
if(shiftDiff < 0){
   shiftDiff += 24 * 3600;
}
let h = Math.floor(shiftDiff/3600);
let m = Math.floor(shiftDiff%3600/60);
let s = Math.floor(shiftDiff%60);
return `${h}:${m}:${s}`;
}


// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let start = toseconds(startTime);
    let end = toseconds(endTime);
    let startDelivery = toseconds("08:00:00 am");
    let endDelivery = toseconds("10:00:00 pm");
    let idle = 0;
    if (start < startDelivery) {
        idle += startDelivery - start;
    }
    if (end > endDelivery) {
        idle += end - endDelivery;
    }
    let h = Math.floor(idle / 3600);
    let m = Math.floor((idle % 3600) / 60);
    let s = Math.floor(idle % 60);
    return `${h}:${m}:${s}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSec(time){
        let [h,m,s] = time.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    function toTime(sec){
        let h = Math.floor(sec/3600);
        let m = Math.floor((sec%3600)/60);
        let s = sec%60;
        return `${h}:${m}:${s}`;
    }

    let shift = toSec(shiftDuration);
    let idle = toSec(idleTime);

    let active = shift - idle;
    if(active < 0) active = 0;

    return toTime(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSec(time){
        let [h,m,s] = time.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    let day = Number(date.split("-")[2]);

    let quota;

    // Eid period
    if(day >= 10 && day <= 20){
        quota = 6*3600;
    } else {
        quota = 8*3600 + 24*60;
    }

    return toSec(activeTime) >= quota;
}
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let bonus = metQuota(shiftObj.date, activeTime);

    let record = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        bonus
    };

    let line = `${record.driverID},${record.driverName},${record.date},${record.startTime},${record.endTime},${record.shiftDuration},${record.idleTime},${record.activeTime},${record.bonus}\n`;

    fs.appendFileSync(textFile,line);

    return record;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================

function setBonus(textFile, driverID, date, newValue) {

    let data = fs.readFileSync(textFile,"utf8").trim().split("\n");

    let updated = data.map(line=>{
        let parts = line.split(",");

        if(parts[0]===driverID && parts[2]===date){
            parts[8] = String(newValue);
        }

        return parts.join(",");
    });

    fs.writeFileSync(textFile,updated.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile,"utf8").trim().split("\n");

    let found = false;
    let count = 0;

    for(let line of data){

        let parts = line.split(",");
        let id = parts[0];
        let date = parts[2];
        let bonus = parts[8];

        let m = Number(date.split("-")[1]);

        if(id===driverID){
            found = true;
            if(m===Number(month) && bonus==="true"){
                count++;
            }
        }
    }

    if(!found) return -1;

    return count;
}



// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    function toSec(time){
        let [h,m,s] = time.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    function toTime(sec){
        let h = Math.floor(sec/3600);
        let m = Math.floor((sec%3600)/60);
        let s = sec%60;
        return `${h}:${m}:${s}`;
    }

    let data = fs.readFileSync(textFile,"utf8").trim().split("\n");

    let total = 0;

    for(let line of data){

        let parts = line.split(",");
        let id = parts[0];
        let date = parts[2];
        let active = parts[7];

        let m = Number(date.split("-")[1]);

        if(id===driverID && m===Number(month)){
            total += toSec(active);
        }
    }

    return toTime(total);
}


// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    function toTime(sec){
        let h = Math.floor(sec/3600);
        let m = Math.floor((sec%3600)/60);
        let s = sec%60;
        return `${h}:${m}:${s}`;
    }

    let shifts = fs.readFileSync(textFile,"utf8").trim().split("\n");

    let days = 0;

    for(let line of shifts){

        let parts = line.split(",");
        let id = parts[0];
        let date = parts[2];

        let m = Number(date.split("-")[1]);

        if(id===driverID && m===Number(month)){
            days++;
        }
    }

    let required = days * 8 * 3600;

    required -= bonusCount * 3600; // bonus reduces required hours

    if(required < 0) required = 0;

    return toTime(required);
}


// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    function toSec(time){
        let [h,m,s] = time.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    let rates = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let rate = 0;

    for(let line of rates){
        let parts = line.split(",");
        if(parts[0]===driverID){
            rate = Number(parts[1]);
        }
    }

    let actual = toSec(actualHours);
    let required = toSec(requiredHours);

    let overtime = actual - required;

    if(overtime <= 0) return 0;

    let overtimeHours = overtime / 3600;

    return Math.floor(overtimeHours * rate);
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};

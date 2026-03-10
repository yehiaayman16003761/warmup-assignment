const fs = require("fs");

// helper
function formatTime(h,m,s){
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function toseconds(time){
   let [clock,period] = time.split(" ");
   let [h,m,s] = clock.split(":").map(Number);

   if(period=="pm" && h!==12) h+=12;
   if(period=="am" && h==12) h=0;

   return h*3600 + m*60 + s;
}

// ============================================================
// Function 1
// ============================================================
function getShiftDuration(startTime, endTime) {

let shiftDiff = toseconds(endTime) - toseconds(startTime);
if(shiftDiff < 0){
   shiftDiff += 24 * 3600;
}

let h = Math.floor(shiftDiff/3600);
let m = Math.floor((shiftDiff%3600)/60);
let s = shiftDiff%60;

return formatTime(h,m,s);
}

// ============================================================
// Function 2
// ============================================================
function getIdleTime(startTime, endTime) {

    let start = toseconds(startTime);
    let end = toseconds(endTime);

    let startDelivery = toseconds("08:00:00 am");
    let endDelivery = toseconds("10:00:00 pm");

    let idle = 0;

    if(start < startDelivery)
        idle += startDelivery - start;

    if(end > endDelivery)
        idle += end - endDelivery;

    let h = Math.floor(idle/3600);
    let m = Math.floor((idle%3600)/60);
    let s = idle%60;

    return formatTime(h,m,s);
}

// ============================================================
// Function 3
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSec(t){
        let [h,m,s] = t.split(":").map(Number);
        return h*3600+m*60+s;
    }

    let sec = toSec(shiftDuration) - toSec(idleTime);

    if(sec<0) sec=0;

    let h = Math.floor(sec/3600);
    let m = Math.floor((sec%3600)/60);
    let s = sec%60;

    return formatTime(h,m,s);
}

// ============================================================
// Function 4
// ============================================================
function metQuota(date, activeTime) {

    function toSec(t){
        let [h,m,s] = t.split(":").map(Number);
        return h*3600+m*60+s;
    }

    let day = Number(date.split("-")[2]);

    let quota;

    if(day>=10 && day<=30)
        quota = 6*3600;
    else
        quota = 8*3600 + 24*60;

    return toSec(activeTime) >= quota;
}

// ============================================================
// Function 5
// ============================================================
function addShiftRecord(textFile, shiftObj) {

let data = fs.readFileSync(textFile,"utf8").trim();

if(data!=""){
let lines = data.split("\n");

for(let line of lines){
let parts = line.split(",");

if(parts[0]==shiftObj.driverID && parts[2]==shiftObj.date)
return {};
}
}

let shiftDuration = getShiftDuration(shiftObj.startTime,shiftObj.endTime);
let idleTime = getIdleTime(shiftObj.startTime,shiftObj.endTime);
let activeTime = getActiveTime(shiftDuration,idleTime);

let record = {
driverID: shiftObj.driverID,
driverName: shiftObj.driverName,
date: shiftObj.date,
startTime: shiftObj.startTime,
endTime: shiftObj.endTime,
shiftDuration,
idleTime,
activeTime,
metQuota: metQuota(shiftObj.date,activeTime),
hasBonus: false
};

let line = `${record.driverID},${record.driverName},${record.date},${record.startTime},${record.endTime},${record.shiftDuration},${record.idleTime},${record.activeTime},${record.metQuota},${record.hasBonus}\n`;

fs.appendFileSync(textFile,line);

return record;
}

// ============================================================
// Function 6
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

let lines = fs.readFileSync(textFile,"utf8").trim().split("\n");

for(let i=0;i<lines.length;i++){

let parts = lines[i].split(",");

if(parts[0]==driverID && parts[2]==date)
parts[9] = String(newValue);

lines[i] = parts.join(",");
}

fs.writeFileSync(textFile,lines.join("\n"));
}

// ============================================================
// Function 7
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let lines = fs.readFileSync(textFile, "utf8").trim().split("\n");

    let count = 0;
    let found = false;

    for (let i = 0; i < lines.length; i++) {

    let parts = lines[i].split(",");

    let id = parts[0].trim();
    let date = parts[2].trim();

    let bonus = parts[9] ? parts[9].trim().toLowerCase() : "";

    let m = Number(date.split("-")[1]);

    if (id === driverID) {

        found = true;

        if (m === Number(month) && bonus === "true") {
            count++;
        }
    }
}

    if (!found) return -1;

    return count;
}
// ============================================================
// Function 8
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

function toSec(t){
let [h,m,s]=t.split(":").map(Number);
return h*3600+m*60+s;
}

let total=0;

let lines = fs.readFileSync(textFile,"utf8").trim().split("\n");

for(let line of lines){

let p=line.split(",");

let m=Number(p[2].split("-")[1]);

if(p[0]==driverID && m==month)
total+=toSec(p[7]);
}

let h=Math.floor(total/3600);
let m=Math.floor((total%3600)/60);
let s=total%60;

return formatTime(h,m,s);
}


// ============================================================
// Function 9
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    let rows = fs.readFileSync(textFile,"utf8").trim().split("\n");
    let rateRows = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let dayOff = "";

    for(let i = 1; i < rateRows.length; i++){
        let cols = rateRows[i].split(",");

        if(cols[0] === driverID){
            dayOff = cols[1].trim();
        }
    }

    let total = 0;

    for(let i = 1; i < rows.length; i++){

        let cols = rows[i].split(",");

        if(cols[0] === driverID){

            let date = new Date(cols[2]);
            let m = date.getMonth() + 1;

            if(m === Number(month)){

                let weekday = date.toLocaleString("en-US",{weekday:"long"});

                if(weekday !== dayOff){

                    let eidStart = new Date("2025-04-10");
                    let eidEnd = new Date("2025-04-30");

                    let quota = (date >= eidStart && date <= eidEnd)
    ? 6 * 3600
    : (8 * 3600 + 24 * 60);

                    total += quota;
                }
            }
        }
    }

    total -= bonusCount * 2 * 3600;

    let h = Math.floor(total / 3600);
    let m = Math.floor((total % 3600) / 60);
    let s = total % 60;

    return formatTime(h,m,s);
}


// ============================================================
// Function 10
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    let rows = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for(let r of rows){

        let cols = r.split(",");

        if(cols[0]===driverID){
            basePay = Number(cols[2]);
            tier = Number(cols[3]);
        }
    }

    let allowance = {1:50,2:20,3:10,4:3};

    function toSec(t){
        let [h,m,s] = t.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    let actual = toSec(actualHours);
    let required = toSec(requiredHours);

    if(actual >= required) return basePay;

    let missing = required - actual;

    missing -= allowance[tier]*3600;

    if(missing <= 0) return basePay;

    let billableHours = Math.floor(missing/3600);

    let deductionRate = Math.floor(basePay/185);

    let deduction = billableHours * deductionRate;

    return basePay - deduction;
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

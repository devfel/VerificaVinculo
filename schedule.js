// schedule.js
import { isValidTime, convertToMinutes, clearDisplayedErrorMessages } from "./utils.js";
import { validateContinuousWork, validateTotalDuration, validateElevenHourBreak, validateOverlappingHours, calculateCompanyHours, validateWeeklyRestDay } from "./rules.js";

const schedule = {};
let errorMessages = [];
let inputId = 1;

// Simplified DOM interaction functions
const getValueById = (id) => document.getElementById(id).value;
const padTimeComponent = (value) => value.toString().padStart(2, "0");

function addEmploymentBond() {
  const day = getValueById("daySelect");
  const company = getValueById("companySelect");
  const startHour = padTimeComponent(getValueById("startHour"));
  const startMinute = padTimeComponent(getValueById("startMinute"));
  const endHour = padTimeComponent(getValueById("endHour"));
  const endMinute = padTimeComponent(getValueById("endMinute"));

  // =============== INPUT VALIDATIONS ===============
  // Validate time inputs
  if (!isValidTime(startHour, startMinute) || !isValidTime(endHour, endMinute)) {
    alert("Entre um período válido (00:00 até 23:59).");
    return;
  }

  // Construct time strings and additional validation for time range
  const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;
  const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
  if (!startTime || !endTime || startTime >= endTime) {
    alert("Período inicial tem que ser menor que o final (Formato: 00:00 até 23:59).");
    return;
  }

  // Ensure the schedule for the day exists, if doesn't, create it.
  if (!schedule[day]) schedule[day] = [];

  //validateInputs(schedule, day, startTime, endTime, company);

  // =============== ADD ITENS AND MESSAGES ===============
  // Add time slot
  const entryId = inputId++; // Assign ID then increment for next use
  schedule[day].push({ id: entryId, start: startTime, end: endTime, company: company });
  schedule[day].sort((a, b) => a.start.localeCompare(b.start)); // Sort by start time

  updateTable();
  validateWorkingHoursRules(schedule, day, startTime, endTime, company, entryId);

  displayErrorMessages(errorMessages);

  displayCompanyHours();
  displayDailyCompanyHours();
  buildHourlyScheduleTable(schedule);
  updateUrlWithSchedule();
}

function updateTable() {
  const tableBody = document.getElementById("scheduleTable").getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";

  const daysOfWeek = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

  daysOfWeek.forEach((day) => {
    if (schedule[day]) {
      schedule[day].forEach((slot) => {
        const row = tableBody.insertRow();
        const idCell = row.insertCell(0);
        const dayCell = row.insertCell(1);
        const timeCell = row.insertCell(2);
        const companyCell = row.insertCell(3);
        const removeCell = row.insertCell(4);

        idCell.textContent = slot.id;
        dayCell.textContent = day;
        timeCell.textContent = `${slot.start} às ${slot.end}`;
        companyCell.textContent = slot.company;
        removeCell.innerHTML = `<a href="#" class="remove-bond" data-id="${slot.id}"><i class="fas fa-times red-icon"></i></a>`;

        removeCell.firstChild.addEventListener("click", function (e) {
          e.preventDefault();
          removeEmploymentBond(slot.id);
        });
      });
    }
  });
}

// Append each single error message to the error container
function displayErrorMessage(message) {
  const errorContainer = document.getElementById("errorMessages");
  const errorMessage = document.createElement("p");
  errorMessage.textContent = message;
  errorContainer.appendChild(errorMessage);
}

// Clean and loop through each error message in order to display them
function displayErrorMessages(errorMessages) {
  // Deduplicate error messages
  const uniqueMessages = [...new Set(errorMessages)];

  // Display each unique error message
  uniqueMessages.forEach((message) => {
    displayErrorMessage(message);
  });
}

function displayCompanyHours() {
  const companyHours = calculateCompanyHours(schedule);
  const summaryContainer = document.getElementById("companyHoursSummary");
  summaryContainer.innerHTML = ""; // Limpa o resumo anterior

  Object.keys(companyHours).forEach((company) => {
    const hours = Math.floor(companyHours[company] / 60);
    const minutes = companyHours[company] % 60;
    const summaryElement = document.createElement("p");
    summaryElement.textContent = `${company}: ${hours} horas e ${minutes} minutos`;
    summaryContainer.appendChild(summaryElement);
  });
}

function calculateDailyCompanyHours(schedule) {
  const dailyCompanyHours = {};

  Object.keys(schedule).forEach((day) => {
    if (!dailyCompanyHours[day]) dailyCompanyHours[day] = {};

    schedule[day].forEach((slot) => {
      const startMinutes = convertToMinutes(slot.start);
      const endMinutes = convertToMinutes(slot.end);
      const duration = endMinutes - startMinutes;

      if (!dailyCompanyHours[day][slot.company]) {
        dailyCompanyHours[day][slot.company] = 0;
      }

      dailyCompanyHours[day][slot.company] += duration;
    });
  });

  return dailyCompanyHours;
}

function displayDailyCompanyHours() {
  const dailyCompanyHours = calculateDailyCompanyHours(schedule);
  const dailySummaryContainer = document.getElementById("dailyCompanyHoursSummary");
  dailySummaryContainer.innerHTML = ""; // Clear previous summary

  const daysOfWeek = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

  daysOfWeek.forEach((day) => {
    if (dailyCompanyHours[day]) {
      const dayElement = document.createElement("div");
      dayElement.innerHTML = `<strong>${day}:</strong>`;
      const companyList = document.createElement("ul");

      Object.keys(dailyCompanyHours[day]).forEach((company) => {
        const hours = Math.floor(dailyCompanyHours[day][company] / 60);
        const minutes = dailyCompanyHours[day][company] % 60;
        const companyElement = document.createElement("li");
        companyElement.textContent = `${company}: ${hours} horas e ${minutes} minutos`;
        companyList.appendChild(companyElement);
      });

      dayElement.appendChild(companyList);
      dailySummaryContainer.appendChild(dayElement);
    }
  });
}

function buildHourlyScheduleTable(schedule) {
  const tableBody = document.getElementById("hourlyScheduleTable").getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";

  const daysOfWeek = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
  const interval = parseInt(document.getElementById("timeIntervalSelect").value, 10); // Get selected interval

  // Loop over each half-hour interval (30 minutes or 60 minutes)
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const row = tableBody.insertRow();
      const startTime = `${padTimeComponent(hour.toString())}:${padTimeComponent(minute.toString())}`;
      const endTime = minute + interval >= 60 ? `${padTimeComponent((hour + 1).toString())}:00` : `${padTimeComponent(hour.toString())}:${padTimeComponent(minute + interval)}`;
      const timeRange = `${startTime} - ${endTime}`;

      const hourCell = row.insertCell(0);
      hourCell.textContent = timeRange;

      daysOfWeek.forEach((day) => {
        const cell = row.insertCell();
        if (schedule[day]) {
          const entries = schedule[day].filter((slot) => {
            const startMinutes = convertToMinutes(slot.start);
            const endMinutes = convertToMinutes(slot.end);
            const currentIntervalStart = hour * 60 + minute;
            const currentIntervalEnd = currentIntervalStart + interval;
            return startMinutes < currentIntervalEnd && endMinutes > currentIntervalStart;
          });

          const companies = entries
            .map((entry) => {
              let companyClass = "";
              //let companyName = entry.company === "Externo 1" ? "CEFET" : entry.company === "UFSJ 1" ? "UFSJ" : entry.company;
              let companyName = entry.company;

              switch (companyName) {
                case "UFSJ 1":
                  companyClass = "ufsj1";
                  break;
                case "UFSJ 2":
                  companyClass = "ufsj2";
                  break;
                case "Externo 1":
                  companyClass = "externo1";
                  break;
                case "Externo 2":
                  companyClass = "externo2";
                  break;
                case "Externo 3":
                  companyClass = "externo3";
                  break;
                case "Externo 4":
                  companyClass = "externo4";
                  break;
                case "Deslocamento":
                  companyClass = "deslocamento";
                  break;
              }
              return `<span class="${companyClass}">${companyName}</span>`;
            })
            .join(", ");

          cell.innerHTML = companies;
        }
      });
    }
  }
}

function validateWorkingHoursRules(schedule) {
  // Clear existing error messages
  clearDisplayedErrorMessages();
  errorMessages = [];

  errorMessages = errorMessages.concat(validateOverlappingHours(schedule));

  // Iterate over all days in the schedule
  Object.keys(schedule).forEach((day) => {
    // Iterate over each entry for the day
    schedule[day].forEach((entry) => {
      // Extract necessary data from each schedule entry
      const { start, end, company } = entry;

      // Especific Validation Rules for working hours
      // Only call rules if the company is not "Deslocamento" because Deslocamento does not count for working hours.
      if (company !== "Deslocamento") {
        errorMessages = errorMessages.concat(validateContinuousWork(schedule, day, start, end, company));
        errorMessages = errorMessages.concat(validateTotalDuration(schedule, day, start, end, company));
        errorMessages = errorMessages.concat(validateElevenHourBreak(schedule, day, start, end, company));
        errorMessages = errorMessages.concat(validateWeeklyRestDay(schedule));
      }
    });
  });
}

function removeEmploymentBond(id) {
  // Find and remove the bond with the given id
  Object.keys(schedule).forEach((day) => {
    const index = schedule[day].findIndex((slot) => slot.id === id);
    if (index !== -1) {
      schedule[day].splice(index, 1);
      // If no more bonds in this day, optionally remove the day from schedule
      if (schedule[day].length === 0) {
        delete schedule[day];
      }
    }
  });

  // Update UI
  updateTable();
  displayCompanyHours();
  updateUrlWithSchedule();
  validateWorkingHoursRules(schedule);
  displayDailyCompanyHours();
  buildHourlyScheduleTable(schedule);
  displayErrorMessages(errorMessages);
}

// ================ LOAD AND SAVE URL ================
document.addEventListener("DOMContentLoaded", (event) => {
  document.getElementById("addEmploymentBondButton").addEventListener("click", addEmploymentBond);
  initializePageWithUrlData(); // Load and display data from URL
});

function encodeScheduleForURL(schedule) {
  const encodedDays = Object.entries(schedule).map(([day, slots]) => {
    return slots
      .map((slot) => {
        // Replace colons in start and end times with underscores
        const startTime = slot.start.replace(/:/g, "_");
        const endTime = slot.end.replace(/:/g, "_");
        return `${dayMapping[day]}-${slot.id}-${startTime}-${endTime}-${companyMapping[slot.company]}`;
      })
      .join(",");
  });
  return encodedDays.join(";");
}

function updateUrlWithSchedule() {
  const encodedSchedule = encodeScheduleForURL(schedule);
  const queryParams = new URLSearchParams();
  queryParams.set("schedule", encodedSchedule);
  window.history.replaceState({}, "", `${location.pathname}?${queryParams}`);
}

function decodeScheduleFromURL(queryString) {
  const params = new URLSearchParams(queryString);
  const scheduleStr = params.get("schedule");
  if (!scheduleStr) return {};

  const schedule = {};
  scheduleStr.split(";").forEach((dayStr) => {
    dayStr.split(",").forEach((entryStr) => {
      let [dayId, id, start, end, companyId] = entryStr.split("-");
      // Replace underscores back to colons in start and end times
      start = start.replace(/_/g, ":");
      end = end.replace(/_/g, ":");
      const day = reverseDayMapping[dayId];
      if (!schedule[day]) schedule[day] = [];
      schedule[day].push({
        id: parseInt(id, 10),
        start,
        end,
        company: reverseCompanyMapping[companyId],
      });
    });
  });

  return schedule;
}

function loadScheduleFromUrl() {
  const loadedSchedule = decodeScheduleFromURL(window.location.search);
  Object.assign(schedule, loadedSchedule);
}

function initializePageWithUrlData() {
  loadScheduleFromUrl();
  updateTable(); // this function updates the table based on the global `schedule` object
  displayCompanyHours(); // Update the company hours summary
  displayDailyCompanyHours(); // Update the daily company hours summary

  // Find the maximum id in the loaded schedule to adjust inputId
  let maxId = 0;
  Object.values(schedule).forEach((daySlots) => {
    daySlots.forEach((slot) => {
      if (slot.id > maxId) {
        maxId = slot.id;
      }
    });
  });

  // Set inputId to maxId found in the schedule + 1
  inputId = maxId + 1;

  validateWorkingHoursRules(schedule);
  displayErrorMessages(errorMessages);
  buildHourlyScheduleTable(schedule);
}

const dayMapping = {
  Segunda: 0,
  Terca: 1,
  Quarta: 2,
  Quinta: 3,
  Sexta: 4,
  Sabado: 5,
  Domingo: 6,
};

const companyMapping = {
  "UFSJ 1": 0,
  "UFSJ 2": 1,
  "Externo 1": 2,
  "Externo 2": 3,
  "Externo 4": 4,
  "Externo 5": 5,
  Deslocamento: 6,
};

// Reverse mappings to convert back from IDs to names when loading from URL
const reverseDayMapping = Object.keys(dayMapping).reduce((acc, key) => {
  acc[dayMapping[key]] = key;
  return acc;
}, {});

const reverseCompanyMapping = Object.keys(companyMapping).reduce((acc, key) => {
  acc[companyMapping[key]] = key;
  return acc;
}, {});

// ================ ================ ================

// SELECT 30 MINUTES OR 1 HOUR MENU.
document.addEventListener("DOMContentLoaded", () => {
  const intervalSelect = document.getElementById("timeIntervalSelect");
  intervalSelect.addEventListener("change", () => {
    buildHourlyScheduleTable(schedule);
  });
});

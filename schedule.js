import { isValidTime, convertToMinutes, clearDisplayedErrorMessages } from "./utils.js";
import { validateContinuousWork, validateTotalDuration, validateElevenHourBreak, validateOverlappingHours, calculateCompanyHours } from "./rules.js";

const schedule = {};
let errorMessages = [];

// Simplified DOM interaction functions
const getValueById = (id) => document.getElementById(id).value;
const padTimeComponent = (value) => value.padStart(2, "0");

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

  const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;
  const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

  if (!startTime || !endTime || startTime >= endTime) {
    alert("Período inicial tem que ser menor que o final (Formato: 00:00 até 23:59).");
    return;
  }

  if (!schedule[day]) {
    schedule[day] = [];
  }

  validateInputs(schedule, day, startTime, endTime, company);

  // =============== ADD ITENS AND MESSAGES ===============
  // Add time slot
  schedule[day].push({ start: startTime, end: endTime, company: company });
  schedule[day].sort((a, b) => a.start.localeCompare(b.start)); // Sort by start time

  updateTable();
  validateWorkingHoursRules(schedule, day, startTime, endTime, company);

  clearDisplayedErrorMessages();

  errorMessages.forEach((message) => {
    displayErrorMessage(message);
  });

  displayCompanyHours();
}

function updateTable() {
  const tableBody = document.getElementById("scheduleTable").getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";

  Object.keys(schedule).forEach((day) => {
    schedule[day].forEach((slot) => {
      const row = tableBody.insertRow();
      const dayCell = row.insertCell(0);
      const timeCell = row.insertCell(1);
      const companyCell = row.insertCell(2);
      dayCell.textContent = day;
      timeCell.textContent = `${slot.start} às ${slot.end}`;
      companyCell.textContent = slot.company;
    });
  });
}

function displayErrorMessage(message) {
  const errorContainer = document.getElementById("errorMessages");
  const errorMessage = document.createElement("p");
  errorMessage.textContent = message;
  errorContainer.appendChild(errorMessage);
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

function validateInputs(schedule, day, startTime, endTime, company) {
  errorMessages = errorMessages.concat(validateOverlappingHours(schedule, day, startTime, endTime, company));
}

function validateWorkingHoursRules(schedule, day, startTime, endTime, company) {
  // Especific Validation Rules for working hours
  // Only call rules if the company is not "Deslocamento" because Deslocamento does not count for working hours.
  if (company !== "Deslocamento") {
    errorMessages = errorMessages.concat(validateContinuousWork(schedule, day, startTime, endTime, company));
    errorMessages = errorMessages.concat(validateTotalDuration(schedule, day, startTime, endTime, company));
    errorMessages = errorMessages.concat(validateElevenHourBreak(schedule, day, startTime, endTime, company));
  }
}

document.addEventListener("DOMContentLoaded", (event) => {
  document.getElementById("addEmploymentBondButton").addEventListener("click", addEmploymentBond);
});

// utils.js

// Utility function to convert time in "HH:MM" format to minutes
export function convertToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Utility function to validate if the provided hour and minute represent a valid time
export function isValidTime(hour, minute) {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

// Utility function to display an error message in the UI
export function clearDisplayedErrorMessages() {
  const errorContainer = document.getElementById("errorMessages");
  errorContainer.innerHTML = ""; // Clear all existing messages
}

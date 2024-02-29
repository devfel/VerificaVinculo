// rules.js
import { convertToMinutes } from "./utils.js";

// Function to check for overlapping hours in the schedule
export function validateOverlappingHours(schedule, day, startTime, endTime, company) {
  let messages = [];

  const isOverlap = schedule[day]?.some((slot) => !(endTime <= slot.start || startTime >= slot.end));

  if (isOverlap) {
    let errorMessage;
    if (company === "Deslocamento") {
      errorMessage = `- Existe um conflito de deslocamento e horário de trabalho no(a) ${day}.`;
    } else {
      errorMessage = `- Existe um conflito de horários de trabalhos no(a) ${day}.`;
    }
    messages.push(errorMessage);
  }

  return messages;
}

// Function to validate continuous work hours according to business rules
export function validateContinuousWork(schedule, day, startTime, endTime, company) {
  let messages = [];
  let continuousWork = 0;
  let previousEnd = null;

  if (schedule[day]) {
    schedule[day].forEach((slot) => {
      if (slot.company === company) {
        const slotStart = convertToMinutes(slot.start);
        const slotEnd = convertToMinutes(slot.end);

        if (previousEnd !== null && slotStart - previousEnd < 60) {
          continuousWork += slotEnd - slotStart;
        } else {
          continuousWork = slotEnd - slotStart;
        }
        previousEnd = slotEnd;
      }
    });

    if (continuousWork > 360) {
      const hoursWorked = Math.floor(continuousWork / 60);
      const minutesWorked = continuousWork % 60;
      messages.push(`- No(a) ${day}, existem ${hoursWorked} horas e ${minutesWorked} minutos de trabalho contínuo, sem o intervalo mínimo de 1 hora, no vínculo ${company}. (Máximo são 6 horas)`);
    }
  }

  return messages;
}

// Function to validate total duration of work according to business rules
export function validateTotalDuration(schedule, day, startTime, endTime, company) {
  let messages = [];
  let totalDuration = 0;

  if (schedule[day]) {
    schedule[day].forEach((slot) => {
      if (slot.company === company) {
        const slotStart = convertToMinutes(slot.start);
        const slotEnd = convertToMinutes(slot.end);
        totalDuration += slotEnd - slotStart;
      }
    });

    if (totalDuration > 600) {
      const hoursWorked = Math.floor(totalDuration / 60);
      const minutesWorked = totalDuration % 60;
      messages.push(`- No(a) ${day}, existem ${hoursWorked} horas e ${minutesWorked} minutos totais de trabalho no vínculo ${company}. (Máximo são 10 horas)`);
    }
  }

  return messages;
}

// Function to ensure there's an 11-hour break as per the business rules
export function validateElevenHourBreak(schedule, day, startTime, endTime, company) {
  const daysOfWeek = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
  const dayIndex = daysOfWeek.indexOf(day);
  const nextDay = dayIndex < daysOfWeek.length - 1 ? daysOfWeek[dayIndex + 1] : daysOfWeek[0];
  const previousDay = dayIndex > 0 ? daysOfWeek[dayIndex - 1] : daysOfWeek[daysOfWeek.length - 1];
  const newStart = convertToMinutes(startTime);
  const newEnd = convertToMinutes(endTime);
  let messages = [];

  // Check for 11-hour break before the start of the current day
  if (schedule[previousDay] && schedule[previousDay].length > 0) {
    const previousDayEnd = convertToMinutes(schedule[previousDay][schedule[previousDay].length - 1].end);
    const restTimeBeforeStart = newStart + (1440 - previousDayEnd); // Time from the end of the last shift yesterday to the start today

    if (restTimeBeforeStart < 660) {
      // Less than 11 hours
      const hoursRest = Math.floor(restTimeBeforeStart / 60);
      const minutesRest = restTimeBeforeStart % 60;
      messages.push(`- Entre ${previousDay} e ${day} existem apenas ${hoursRest} horas e ${minutesRest} minutos de descanso. (Mínimo é de 11 horas)`);
    }
  }

  // Check for 11-hour break after the end of the current day
  if (schedule[nextDay] && schedule[nextDay].length > 0) {
    const nextDayStart = convertToMinutes(schedule[nextDay][0].start);
    const restTimeAfterEnd = 1440 - newEnd + nextDayStart; // Time from the end of the last shift today to the start tomorrow

    if (restTimeAfterEnd < 660) {
      // Less than 11 hours
      const hoursRest = Math.floor(restTimeAfterEnd / 60);
      const minutesRest = restTimeAfterEnd % 60;
      messages.push(`- Entre ${day} e ${nextDay} existem apenas ${hoursRest} horas e ${minutesRest} minutos de descanso. (Mínimo é de 11 horas)`);
    }
  }

  return messages;
}

export function calculateCompanyHours(schedule) {
  const companyHours = {}; // Armazena a soma de minutos trabalhados por empresa

  Object.keys(schedule).forEach((day) => {
    schedule[day].forEach((slot) => {
      const startMinutes = convertToMinutes(slot.start);
      const endMinutes = convertToMinutes(slot.end);
      const duration = endMinutes - startMinutes;

      if (!companyHours[slot.company]) {
        companyHours[slot.company] = 0;
      }

      companyHours[slot.company] += duration;
    });
  });

  return companyHours;
}

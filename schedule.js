const schedule = {};

function addTime() {
  const day = document.getElementById("daySelect").value;
  const startHour = document.getElementById("startHour").value.padStart(2, "0");
  const startMinute = document
    .getElementById("startMinute")
    .value.padStart(2, "0");
  const endHour = document.getElementById("endHour").value.padStart(2, "0");
  const endMinute = document.getElementById("endMinute").value.padStart(2, "0");
  const company = document.getElementById("companySelect").value; // Capture selected company

  // Validate time inputs
  if (
    !isValidTime(startHour, startMinute) ||
    !isValidTime(endHour, endMinute)
  ) {
    alert(
      "Entre um período válido (00:00 até 23:59). Período inicial tem que ser menor que o final."
    );
    return;
  }

  const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute
    .toString()
    .padStart(2, "0")}`;
  const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute
    .toString()
    .padStart(2, "0")}`;

  if (!startTime || !endTime || startTime >= endTime) {
    alert(
      "Entre um período válido (00:00 até 23:59). Período inicial tem que ser menor que o final."
    );
    return;
  }

  if (!schedule[day]) {
    schedule[day] = [];
  }

  // Check for overlap
  const isOverlap = schedule[day].some((slot) => {
    const currentIsDeslocamento = company === "Deslocamento";
    const slotIsDeslocamento = slot.company === "Deslocamento";
    return (
      !(endTime <= slot.start || startTime >= slot.end) &&
      !currentIsDeslocamento &&
      !slotIsDeslocamento
    );
  });

  // If overlap but is "Deslocamento", allow but issue warning
  if (isOverlap && company !== "Deslocamento") {
    alert("Este horário já bate com um dia/horário já cadastrado.");
    return;
  } else if (company === "Deslocamento") {
    // Check if there's an actual overlap to issue a more specific warning
    const hasActualOverlap = schedule[day].some(
      (slot) => !(endTime <= slot.start || startTime >= slot.end)
    );

    if (hasActualOverlap) {
      // There's an overlap with work hours, issue a specific warning
      const errorMessage = `Existe um conflito de deslocamento e horário de trabalho no(a) ${day}`;
      displayErrorMessage(errorMessage); // Show the error message
    }
  }

  // Add time slot
  schedule[day].push({ start: startTime, end: endTime, company: company });
  schedule[day].sort((a, b) => a.start.localeCompare(b.start)); // Sort by start time

  updateTable();
  validateAndAddTimeSlot(day, startTime, endTime, company);
}

function isValidTime(hour, minute) {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function updateTable() {
  const tableBody = document
    .getElementById("scheduleTable")
    .getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";

  Object.keys(schedule).forEach((day) => {
    schedule[day].forEach((slot) => {
      const row = tableBody.insertRow();
      const dayCell = row.insertCell(0);
      const timeCell = row.insertCell(1);
      const companyCell = row.insertCell(2);
      dayCell.textContent = day;
      timeCell.textContent = `${slot.start} to ${slot.end}`;
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

function validateAndAddTimeSlot(day, startTime, endTime, company) {
  const errorMessages = validateRules(day, startTime, endTime, company);

  errorMessages.forEach((message) => {
    displayErrorMessage(message);
  });
}

function validateRules(day, startTime, endTime, company) {
  const newStart = convertToMinutes(startTime);
  const newEnd = convertToMinutes(endTime);

  let messages = [];
  let totalDuration = 0;
  let continuousWork = 0;
  let previousEnd = null;

  console.log(
    `Processing new slot for ${company} on ${day}: ${startTime} to ${endTime}`
  );

  if (company === "Deslocamento") {
    // Skip further processing for "Deslocamento"
    console.log("Skipping checks for Deslocamento");
    return messages; // Return empty or existing messages without adding new ones
  }

  if (schedule[day]) {
    schedule[day].forEach((slot) => {
      if (slot.company === company) {
        const slotStart = convertToMinutes(slot.start);
        const slotEnd = convertToMinutes(slot.end);

        // Accumulate total work and check for continuous work
        if (previousEnd !== null && slotStart - previousEnd < 60) {
          continuousWork += slotEnd - slotStart;
        } else {
          continuousWork = slotEnd - slotStart; // Reset for non-consecutive slots
        }
        totalDuration += slotEnd - slotStart;
        previousEnd = slotEnd;

        console.log(
          `Slot: ${slot.start} to ${slot.end}, Continuous Work: ${continuousWork} minutes, Total Duration: ${totalDuration} minutes`
        );
      }
    });
  }

  console.log(
    `Final Continuous Work: ${continuousWork} minutes, Total Duration: ${totalDuration} minutes`
  );

  // Rule validations
  if (continuousWork > 360) {
    // More than 6 hours continuous work
    const hoursWorked = Math.floor(continuousWork / 60); // Find total hours
    const minutesWorked = continuousWork % 60; // Find remaining minutes

    messages.push(
      `No(a) ${day}, existem ${hoursWorked} horas e ${minutesWorked} minutos de trabalho, sem o intervalo mínimo de 1 hora, no vínculo ${company}. (Máximo são 6 horas)`
    );
  }

  if (totalDuration > 600) {
    // More than 10 hours total work
    const hoursWorked = Math.floor(totalDuration / 60); // Find total hours
    const minutesWorked = totalDuration % 60; // Find remaining minutes

    messages.push(
      `No(a) ${day}, existem ${hoursWorked} horas e ${minutesWorked} minutos totais de trabalho no vínculo ${company}. (Máximo são 10 horas)`
    );
  }

  if (company === "Deslocamento") {
    // Skip checks for Deslocamento
    console.log("Skipping eleven-hour break check for Deslocamento");
    return messages;
  }

  // Rule 3: 11-hour break between days
  const breakMessages = checkElevenHourBreak(day, company, newStart, newEnd);
  messages = messages.concat(breakMessages);

  return messages;
}

function checkElevenHourBreak(day, company, newStart, newEnd) {
  // Define the order of days to manage checks across week boundaries
  const daysOfWeek = [
    "Domingo",
    "Segunda",
    "Terca",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sabado",
  ];
  const dayIndex = daysOfWeek.indexOf(day);
  const nextDay =
    dayIndex < daysOfWeek.length - 1 ? daysOfWeek[dayIndex + 1] : daysOfWeek[0];
  const previousDay =
    dayIndex > 0 ? daysOfWeek[dayIndex - 1] : daysOfWeek[daysOfWeek.length - 1];

  let messages = [];

  // Check against the start time of the first slot of the next day
  if (schedule[nextDay] && schedule[nextDay].length > 0) {
    const nextDayStart = convertToMinutes(schedule[nextDay][0].start);
    const restTime = 1440 - newEnd + nextDayStart;
    if (restTime < 660) {
      // 1440 minutes in a day - end time + start of next day
      const hoursRest = Math.floor(restTime / 60);
      const minutesRest = restTime % 60;
      messages.push(
        `Entre ${day} e ${nextDay} existe apenas ${hoursRest} horas e ${minutesRest} minutos de descanso. (Mínimo é de 11 horas)`
      );
    }
  }

  // Check against the end time of the last slot of the previous day
  if (schedule[previousDay] && schedule[previousDay].length > 0) {
    const lastSlotIndex = schedule[previousDay].length - 1;
    const previousDayEnd = convertToMinutes(
      schedule[previousDay][lastSlotIndex].end
    );
    const restTime = 1440 - previousDayEnd + newStart;
    if (restTime < 660) {
      const hoursRest = Math.floor(restTime / 60);
      const minutesRest = restTime % 60;
      messages.push(
        `Entre ${previousDay} e ${day} existe apenas ${hoursRest} horas e ${minutesRest} minutos de descanso. (Mínimo é de 11 horas)`
      );
    }
  }

  return messages;
}

function convertToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Regras Mensagens de erro:
// 1. Não pode trabalhar mais de 6 horas seguidas
// 2. Não pode trabalhar mais de 10 horas por dia
// 3. Deve haver um intervalo de 11 horas entre o final de um dia e o início do próximo

// Regras de Impedimento de Inserção de Horário:
// 4. Não pode haver sobreposição de horários no mesmo dia, independente da empresa
// 5. Um novo horário deve ter um horario inicial menor que a hora final.
// 6. Um novo horário deve ser entre 00:00 e 23:59 tanto para o horário inicial quanto para o final.

//TODO
// Alterar informações de horários já cadastrados (ou pelo menos ter opção de excluir)
// Talvez Remover algumas regras de algumas vinculos quando nao UFSJ
// Deslocamento não conta em algumas regras e conta em outras
// Salvar Link para compartilhar
// Ter um dia de descanso na semana
// Remover alerta de horario batendo. Apenas mostrar o erro.

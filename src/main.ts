const baseImagePath = `${import.meta.env.BASE_URL}assets/base.png`;
const defaultMeetingTime = '19:00';
const meetingTextFontSize = 102;

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(date);
};

const toInputDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const formatTimeForStory = (timeValue: string): string => {
  const match = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!match) {
    return '19h';
  }

  const hours = match[1];
  const minutes = match[2];

  if (minutes === '00') {
    return `${hours}h`;
  }

  return `${hours}h${minutes}`;
};

const ensureInriaSansLoaded = async (): Promise<void> => {
  if (!('fonts' in document)) {
    return;
  }

  await document.fonts.load(`700 ${meetingTextFontSize}px 'Inria Sans'`);
};

const getMeetingDate = (today = new Date()): Date => {
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  const dayOfWeek = current.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const nextMeeting = new Date(current);
  nextMeeting.setDate(current.getDate() + daysUntilSunday);
  return nextMeeting;
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Não foi possível carregar a imagem base: ${src}`));
    image.src = src;
  });
};

const drawStory = async (meetingDate: Date, meetingTime: string): Promise<string> => {
  const image = await loadImage(baseImagePath);
  const canvas = document.getElementById('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas não encontrado.');
  }

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Contexto 2D não disponível.');
  }

  canvas.width = image.width;
  canvas.height = image.height;

  context.drawImage(image, 0, 0);
  await ensureInriaSansLoaded();

  const dateText = `${formatDate(meetingDate)} - `;
  const hourText = formatTimeForStory(meetingTime);

  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.font = `700 ${meetingTextFontSize}px 'Inria Sans', sans-serif`;

  const dateWidth = context.measureText(dateText).width;
  const hourWidth = context.measureText(hourText).width;
  const fullTextWidth = dateWidth + hourWidth;

  const x = (canvas.width - fullTextWidth) / 2;
  const y = canvas.height * 0.45;

  context.fillStyle = '#ffffff';
  context.fillText(dateText, x, y);

  context.fillStyle = '#FCA31A';
  context.fillText(hourText, x + dateWidth, y);

  return canvas.toDataURL('image/png');
};

const setup = (): void => {
  const infoElement = document.getElementById('meeting-info');
  const generateButton = document.getElementById('generate-btn');
  const downloadButton = document.getElementById('download-btn');
  const resetButton = document.getElementById('reset-btn');
  const previewImage = document.getElementById('preview');
  const dateInput = document.getElementById('meeting-date');
  const timeInput = document.getElementById('meeting-time');

  if (!(infoElement instanceof HTMLParagraphElement)) {
    throw new Error('Elemento de informações não encontrado.');
  }

  if (!(generateButton instanceof HTMLButtonElement)) {
    throw new Error('Botão de geração não encontrado.');
  }

  if (!(downloadButton instanceof HTMLButtonElement)) {
    throw new Error('Botão de download não encontrado.');
  }

  if (!(resetButton instanceof HTMLButtonElement)) {
    throw new Error('Botão de reset não encontrado.');
  }

  if (!(previewImage instanceof HTMLImageElement)) {
    throw new Error('Elemento de prévia não encontrado.');
  }

  if (!(dateInput instanceof HTMLInputElement)) {
    throw new Error('Input de data não encontrado.');
  }

  if (!(timeInput instanceof HTMLInputElement)) {
    throw new Error('Input de horário não encontrado.');
  }

  const setDefaultMeetingInputs = (): Date => {
    const defaultMeetingDate = getMeetingDate();
    dateInput.value = toInputDateValue(defaultMeetingDate);
    timeInput.value = defaultMeetingTime;
    return defaultMeetingDate;
  };

  let activeDefaultMeetingDate = setDefaultMeetingInputs();

  const updateMeetingInfo = (): void => {
    const selectedDate = parseInputDate(dateInput.value) ?? activeDefaultMeetingDate;
    const selectedTime = formatTimeForStory(timeInput.value || defaultMeetingTime);
    infoElement.textContent = `Reunião selecionada: ${formatDate(selectedDate)} - ${selectedTime}`;
  };

  updateMeetingInfo();
  dateInput.addEventListener('change', updateMeetingInfo);
  timeInput.addEventListener('change', updateMeetingInfo);

  let generatedDataUrl = '';
  let generatedDateLabel = formatDate(activeDefaultMeetingDate);

  generateButton.addEventListener('click', async () => {
    generateButton.disabled = true;
    generateButton.textContent = 'Gerando...';

    try {
      const selectedDate = parseInputDate(dateInput.value) ?? activeDefaultMeetingDate;
      const selectedTime = timeInput.value || defaultMeetingTime;

      generatedDataUrl = await drawStory(selectedDate, selectedTime);
      generatedDateLabel = formatDate(selectedDate);
      previewImage.src = generatedDataUrl;
      previewImage.style.display = 'block';
      downloadButton.disabled = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar arte.';
      alert(message);
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = 'Gerar arte';
    }
  });

  downloadButton.addEventListener('click', () => {
    if (!generatedDataUrl) {
      return;
    }

    const link = document.createElement('a');
    const meetingDateLabel = generatedDateLabel.replaceAll('/', '-');
    link.download = `story-reuniao-${meetingDateLabel}.png`;
    link.href = generatedDataUrl;
    link.click();
  });

  resetButton.addEventListener('click', () => {
    activeDefaultMeetingDate = setDefaultMeetingInputs();
    generatedDataUrl = '';
    generatedDateLabel = formatDate(activeDefaultMeetingDate);
    previewImage.removeAttribute('src');
    previewImage.style.display = 'none';
    downloadButton.disabled = true;
    updateMeetingInfo();
  });
};

setup();

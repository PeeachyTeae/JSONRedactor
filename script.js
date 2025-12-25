// Элементы DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const wordInputsContainer = document.getElementById('wordInputsContainer');
const processBtn = document.getElementById('processBtn');
const statusBox = document.getElementById('statusBox');
const countButtons = document.querySelectorAll('.count-btn');

let currentFile = null;
let currentWordCount = 1;

// Инициализация
init();

function init() {
    // Обработчики для drop zone
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Обработчик выбора файла
    fileInput.addEventListener('change', handleFileSelect);
    
    // Обработчик удаления файла
    removeFileBtn.addEventListener('click', removeFile);
    
    // Обработчик кнопки обработки
    processBtn.addEventListener('click', processFile);
    
    // Обработчики кнопок выбора количества
    countButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const count = parseInt(btn.dataset.count);
            setWordCount(count);
        });
    });
    
    // Обработчики для динамических полей ввода
    wordInputsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('word-input')) {
            updateProcessButton();
        }
    });
    
    // Обработчик Enter в полях ввода
    wordInputsContainer.addEventListener('keypress', (e) => {
        if (e.target.classList.contains('word-input') && e.key === 'Enter' && processBtn.disabled === false) {
            processFile();
        }
    });
    
    // Инициализация с одним полем
    setWordCount(1);
}

// Установка количества полей
function setWordCount(count) {
    currentWordCount = count;
    
    // Обновляем активную кнопку
    countButtons.forEach(btn => {
        if (parseInt(btn.dataset.count) === count) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Создаем нужное количество полей
    wordInputsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'word-input';
        input.placeholder = `Слово ${i + 1}...`;
        input.dataset.index = i;
        wordInputsContainer.appendChild(input);
    }
    
    updateProcessButton();
}

// Получение всех введенных слов
function getWords() {
    const inputs = wordInputsContainer.querySelectorAll('.word-input');
    const words = [];
    inputs.forEach(input => {
        const word = input.value.trim();
        if (word) {
            words.push(word);
        }
    });
    return words;
}

// Drag and Drop обработчики
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.json')) {
        logStatus('Ошибка: Пожалуйста, выберите JSON файл!', 'error');
        return;
    }
    
    currentFile = file;
    fileName.textContent = file.name;
    dropZone.style.display = 'none';
    fileInfo.style.display = 'flex';
    updateProcessButton();
    logStatus(`Выбран файл: ${file.name}`, 'info');
}

function removeFile() {
    currentFile = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    updateProcessButton();
    logStatus('Файл удален', 'info');
}

function updateProcessButton() {
    const words = getWords();
    processBtn.disabled = !(currentFile && words.length > 0);
}

// Обработка файла
async function processFile() {
    const words = getWords();
    
    if (!currentFile || words.length === 0) {
        return;
    }
    
    processBtn.disabled = true;
    
    try {
        logStatus('='.repeat(50), 'info');
        logStatus(`Начало обработки файла: ${currentFile.name}`, 'info');
        logStatus(`Поиск и удаление строк со словами: ${words.map(w => `'${w}'`).join(', ')}`, 'info');
        logStatus('', 'info');
        
        // Читаем файл
        logStatus('Чтение JSON файла...', 'info');
        const fileContent = await readFile(currentFile);
        logStatus('✓ Файл успешно прочитан', 'success');
        
        // Создаем резервную копию
        logStatus('Создание резервной копии...', 'info');
        const backupFilename = createBackupFilename(currentFile.name);
        downloadFile(fileContent, backupFilename);
        logStatus(`✓ Резервная копия создана: ${backupFilename}`, 'success');
        
        // Обрабатываем файл
        logStatus('Поиск и удаление строк...', 'info');
        const result = removeLinesWithWords(fileContent, words);
        logStatus('✓ Обработка завершена', 'success');
        logStatus(`Всего строк в файле: ${result.totalLines}`, 'info');
        logStatus(`Удалено строк: ${result.removedCount}`, 'success');
        logStatus(`Осталось строк: ${result.totalLines - result.removedCount}`, 'info');
        
        // Скачиваем обработанный файл
        logStatus('Сохранение очищенного файла...', 'info');
        downloadFile(result.content, currentFile.name);
        logStatus('✓ Файл сохранен', 'success');
        
        logStatus('', 'info');
        logStatus('='.repeat(50), 'info');
        logStatus('✓ ГОТОВО! Файл успешно обработан.', 'success');
        logStatus(`Резервная копия: ${backupFilename}`, 'info');
        
    } catch (error) {
        logStatus(`Ошибка: ${error.message}`, 'error');
    } finally {
        processBtn.disabled = false;
        updateProcessButton();
    }
}

// Чтение файла
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsText(file, 'utf-8');
    });
}

// Удаление строк со словами (любое из слов)
function removeLinesWithWords(content, words) {
    const lines = content.split(/\r?\n/);
    const keptLines = [];
    let removedCount = 0;
    
    // Определяем тип окончания строк (сохраняем исходный)
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isLastLine = i === lines.length - 1;
        
        // Проверяем, содержит ли строка любое из указанных слов
        const containsAnyWord = words.some(word => lineContainsWord(line, word));
        
        if (!containsAnyWord) {
            // Сохраняем строку с исходным окончанием (кроме последней, если файл не заканчивается на \n)
            if (isLastLine && !content.endsWith('\n') && !content.endsWith('\r\n')) {
                keptLines.push(line);
            } else {
                keptLines.push(line + lineEnding);
            }
        } else {
            removedCount++;
        }
    }
    
    return {
        content: keptLines.join(''),
        totalLines: lines.length,
        removedCount: removedCount
    };
}

// Проверка наличия слова в строке
function lineContainsWord(line, word) {
    return line.toLowerCase().includes(word.toLowerCase());
}

// Создание имени резервной копии
function createBackupFilename(originalName) {
    const nameWithoutExt = originalName.replace(/\.json$/i, '');
    const timestamp = new Date().toISOString()
        .replace(/[-:]/g, '')
        .replace(/\..+/, '')
        .replace('T', '_');
    return `${nameWithoutExt}_${timestamp}.json.backup`;
}

// Скачивание файла
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Логирование статуса
function logStatus(message, type = 'info') {
    const p = document.createElement('p');
    p.className = `status-text ${type}`;
    p.textContent = message;
    statusBox.appendChild(p);
    statusBox.scrollTop = statusBox.scrollHeight;
}

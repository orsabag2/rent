let currentStep = 1; // Global state variable
let isEditingFromPreview = false; // Global state variable
let questions = []; // To store parsed questions, Global state variable
let formSteps; // Declare globally, will be assigned in generateFormSteps
let totalSteps; // Declare globally, will be assigned in generateFormSteps

// Define question groups for progress bar sections
const questionGroups = [
    { name: 'פרטים אישיים', startQuestionIndex: 1 },
    { name: 'פרטי נכס', startQuestionIndex: 5 },
    { name: 'פרטי שוכר', startQuestionIndex: 13 },
    { name: 'תנאי שכירות ותשלום', startQuestionIndex: 17 },
    { name: 'בטחונות', startQuestionIndex: 26 },
    { name: 'תנאים נוספים', startQuestionIndex: 32 },
    { name: 'סיום והגשה', startQuestionIndex: 39 }
];

// The entire JS logic is wrapped in a try-catch to prevent entire script from failing
try {
    // Check if libraries are loaded
    let jsPDFModule;
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDFModule = window.jspdf.jsPDF;
    } else {
        console.error("jsPDF library not loaded correctly!");
    }

    // CSV data of questions
    const csvData = `ניסוח Lemonade לבעל הדירה,טיפ UX,סוג שדה
בוא נתחיל בשמך – איך נכתוב אותך בתור בעל הבית? 🙂,כמו בתעודת זהות – שם פרטי + שם משפחה,text
ואיך אפשר לפנות אליך אם נצטרך?,מספר טלפון שיש לך עליו וואטסאפ 📱,phone
ולמקרה שנצטרך – איפה אתה גר ביומיום?,רק לצורך ניסוח החוזה. לא נשתמש בזה מעבר,address
יש מישהו נוסף ששותף איתך בבעלות על הדירה?,אם כן – נוסיף אותם גם,"single_select: [\'כן\', \'לא\']"
איפה נמצא הנכס שאתה משכיר?,"עיר, רחוב, מספר, דירה – כמה שיותר מדויק 🏠",address
מה מספר הדירה (אם יש)?,אם יש תת־מספר או דירה פנימית – חשוב לציין,text
יש חניה ששייכת לדירה?,אם כן – נכניס אותה לחוזה,"single_select: [\'כן\', \'לא\']"
יש גם מחסן שמגיע עם הדירה?,"לא חובה, אבל שווה לציין אם יש","single_select: [\'כן\', \'לא\']"
באיזו קומה הדירה שלך נמצאת?,"אם זה בניין, באיזו קומה היא? אפשר גם \'קרקע\'",number
יש מעלית בבניין?,כדי שהשוכרים לא יופתעו...,"single_select: [\'כן\', \'לא\']"
השארת בדירה משהו שתרצה לציין? נגיד רהיטים או מכשירים?,"למשל: מיטה זוגית, ארון, מקרר...",long_text
השארת ריהוט? אפשר לצרף נספח של מה בדיוק יש,"אם השארת ריהוט – עדיף לפרט",long_text
מי השוכר שאתה סוגר איתו את החוזה?,שם מלא של כל שוכר,"repeating_group: name, id, phone"
כמה דיירים אתה הולך להכניס לחוזה?,אפשר שוכר אחד או כמה – תלוי במצב,number
מה הכתובת הנוכחית של הדייר שלך?,"כתובת נוכחית של השוכר, לצרכי החוזה בלבד",address
יש מישהו אחר שמשלם בשבילו?,למשל הורה או גוף תומך,"single_select: [\'כן\', \'לא\']"
מתי השוכר שלך נכנס לגור בדירה?,תאריך התחלה של השכירות,date
לכמה זמן אתם סוגרים את החוזה?,רוב החוזים הם לשנה – אבל זה לגמרי תלוי בך,number
כמה שכר דירה אתה גובה כל חודש?,כמה ייכנס לך לחשבון כל חודש 💸,currency
באיזה תאריך בכל חודש תרצה לקבל את התשלום?,למשל: בכל 1 לחודש,date_day_only
מה הדרך הכי נוחה לך לקבל את התשלום?,מה שהכי נוח לך,"single_select: [\'העברה בנקאית\', \'שיקים\', \'אחר\']"
איך השוכר יעביר את התשלום?,"למשל: צ׳קים, העברה בנקאית, פיקדון",text
מתי אתה מצפה לקבל את התשלום הראשון?,מתי יועבר התשלום הראשון בפועל,date
רוצה להשאיר אופציה להארכת חוזה?,כדי לאפשר לשוכר להמשיך בלי חוזה חדש,"single_select: [\'כן\', \'לא\']"
יש תוספות לשכר הדירה בהארכה?,אם יש אופציה – תוכל לציין סכום חדש,currency
מה משאיר אותך רגוע?,בחר את הבטחונות שתרצה לקבל,"multi_select: [\'צ׳ק ביטחון\', \'שטר חוב\', \'ערבות בנקאית\', \'ערב\']"
"רשום כמה כל בטחון שווה – לדוגמה: 10,000 ש״ח לצ׳ק ביטחון","לדוגמה: 10,000 ש״ח לצ׳ק ביטחון",long_text
יש לך דרישה לערב בחוזה?,אם כן – נבקש את פרטיו,"single_select: [\'כן\', \'לא\']"
אם יש ערב – איזה סוג אתה מעדיף?,"למשל: ערבות אוואל, ערבות רגילה","single_select: [\'ערבות רגילה\', \'ערבות אוואל\']"
"תן לנו את הפרטים של הערב – שם, טלפון, תעודת זהות וכתובת","שם, טלפון, כתובת, תעודת זהות","group: שם, טלפון, תעודת זהות, כתובת"
אם השוכר מתעכב בפינוי – כמה זה עולה?,פיצוי יומי – לפי שיקולך,currency
מאפשר להכניס בעלי חיים לדירה?,שיהיה ברור לכולם מראש 🐶,"single_select: [\'כן\', \'לא\']"
צפוי שיפוץ או תמ״א בזמן השכירות?,כדי למנוע הפתעות – עדיף להכניס לחוזה,"single_select: [\'כן\', \'לא\']"
יש משהו מיוחד שתרצה שנכניס לחוזה?,כל דבר שתרצה להבהיר מראש – זו ההזדמנות,long_text
תרצה שהשוכר יעביר את כל החשבונות על שמו?,כדי לוודא שכל התשלומים ירדו ממנו,"single_select: [\'כן\', \'לא\']"
רוצה שנכניס סעיף על ביטוח למקרה של נזק בדירה?,במקרים של נזק לדירה או לתכולה,"single_select: [\'כן\', \'לא\']"
יש כללים שאתה רוצה להבהיר מראש?,"למשל: לא לעשן, לא לארח, לא להכניס בעלי חיים",long_text
יש משהו נוסף שחשוב לך להוסיף לפני שנסיים?,כל דבר נוסף שאתה רוצה שייכנס למסמך,long_text
בא לך לחתום דיגיטלית במקום להתעסק עם ניירת?,"בלי להדפיס, בלי לסרוק, בלי כאב ראש","single_select: [\'כן\', \'לא\']"
איך תרצה לקבל את החוזה לחתימה?,PDF למייל? חתימה דיגיטלית? שליחה לשוכר?,"multi_select: [\'שלח לי PDF\', \'חתימה דיגיטלית\', \'שליחה לשוכר\']"
איך לשלוח לך את החוזה כשהוא מוכן?,"מייל, וואטסאפ, או שניהם","single_select: [\'מייל\', \'וואטסאפ\', \'שניהם\']"
`;

    // --- Global State Variables ---
    // These are now declared globally at the top of the script

    // --- DOM Element References ---
    const formStepsContainer = document.getElementById('formStepsContainer');
    const progressBar = document.getElementById('progressBar');
    const progressBarSectionsContainer = document.getElementById('progressBarSections'); // New element
    const navigationContainer = document.getElementById('navigationContainer');
    const editModeContainer = document.getElementById('editModeContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const updateBtn = document.getElementById('updateBtn');
    const form = document.getElementById('rentalContractForm');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

    // Call parseCSV and generateFormSteps here to populate the form
    questions = parseCSV(csvData);
    console.log('Parsed questions count:', questions.length); // DEBUG
    generateFormSteps(questions);

    // No need to initialize formSteps and totalSteps here, as generateFormSteps handles it

    // Add event listeners for navigation buttons
    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigateStep(1));
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigateStep(-1));
    }
    if (updateBtn) {
        updateBtn.addEventListener('click', finishEditing);
    }
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission
            displayContractPreview();
        });
    }

    // Initialize modal manager after DOM is ready
    modalManager.init();

    // Initial view update
    updateFormView();
    updateProgressBarSections(); // Call this on initial load

    // Add repeating group item function to global scope
    window.addRepeatingGroupItem = addRepeatingGroupItem;

} catch (error) {
    console.error("An error occurred in the main script block:", error);
}

// Add a function to dynamically add items to repeating groups
function addRepeatingGroupItem(fieldName, fields) {
    const container = document.getElementById(`${fieldName}Items`);
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('repeating-group-item', 'p-3', 'border', 'rounded', 'bg-white', 'space-y-2', 'mb-2');
    itemDiv.innerHTML = fields.map(field => `
        <div>
            <label for="${fieldName}_${field}_${container.children.length}">${field}</label>
            <input type="text" id="${fieldName}_${field}_${container.children.length}" name="${fieldName}_${field}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm">
        </div>
    `).join('');
    
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.classList.add('btn', 'btn-danger', 'btn-sm', 'mt-2');
    removeButton.textContent = 'הסר';
    removeButton.onclick = () => itemDiv.remove();
    itemDiv.appendChild(removeButton);
    
    container.appendChild(itemDiv);
}

// --- CSV Parsing and Form Generation ---
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',');
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Handle quoted commas in the line
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const parts = line.split(regex).map(part => part.replace(/^"|"$/g, ''));

        if (parts.length === headers.length) {
            const question = {};
            headers.forEach((header, index) => {
                question[header.trim()] = parts[index].trim();
            });
            questions.push(question);
        } else {
            console.warn(`Skipping malformed CSV line: ${line}`);
        }
    }
    return questions;
}

function generateFormSteps(questions) {
    formStepsContainer.innerHTML = ''; // Clear existing steps
    let stepCount = 1;
    questions.forEach(q => {
        const stepDiv = document.createElement('div');
        stepDiv.classList.add('form-step');
        stepDiv.setAttribute('data-step', stepCount);
        if (stepCount === 1) {
            stepDiv.classList.add('active');
        }

        const questionText = q['ניסוח Lemonade לבעל הדירה'];
        const uxTip = q['טיפ UX'];
        const fieldType = q['סוג שדה'];
        const fieldName = `question${stepCount}`;

        let inputHtml = '';
        let labelFor = `id="${fieldName}"`;
        let inputType = 'text'; // Default
        let placeholder = uxTip;
        let options = [];
        let isMultiSelect = false;

        if (fieldType.startsWith('single_select:')) {
            options = fieldType.replace('single_select: [', '').replace(']', '').split(',').map(s => s.trim().replace(/^\'|\'$/g, ''));
            inputHtml = `
                <div class="choice-button-group" data-field-name="${fieldName}">
                    ${options.map(option => `<button type="button" class="choice-button" data-value="${option}">${option}</button>`).join('')}
                </div>
                <input type="hidden" name="${fieldName}" id="${fieldName}">
            `;
        } else if (fieldType.startsWith('multi_select:')) {
            isMultiSelect = true;
            options = fieldType.replace('multi_select: [', '').replace(']', '').split(',').map(s => s.trim().replace(/^\'|\'$/g, ''));
            inputHtml = `
                <div class="choice-button-group" data-field-name="${fieldName}" data-multiselect="true">
                    ${options.map(option => `<button type="button" class="choice-button" data-value="${option}">${option}</button>`).join('')}
                </div>
                <input type="hidden" name="${fieldName}" id="${fieldName}">
            `;
        } else if (fieldType === 'text') {
            inputHtml = `<input type="text" ${labelFor} name="${fieldName}" placeholder="${placeholder}">`;
        } else if (fieldType === 'number') {
            inputHtml = `<input type="number" ${labelFor} name="${fieldName}" placeholder="${placeholder}">`;
        } else if (fieldType === 'phone') {
            inputHtml = `<input type="tel" ${labelFor} name="${fieldName}" placeholder="${placeholder}">`;
        } else if (fieldType === 'address') {
            inputHtml = `<input type="text" ${labelFor} name="${fieldName}" placeholder="${placeholder}">`;
        } else if (fieldType === 'date') {
            inputHtml = `<input type="date" ${labelFor} name="${fieldName}">`;
        } else if (fieldType === 'currency') {
            inputHtml = `<input type="number" ${labelFor} name="${fieldName}" placeholder="${placeholder}" min="0">`;
        } else if (fieldType === 'long_text') {
            inputHtml = `<textarea ${labelFor} name="${fieldName}" rows="3" placeholder="${placeholder}"></textarea>`;
        } else if (fieldType === 'date_day_only') {
            inputHtml = `<input type="number" ${labelFor} name="${fieldName}" placeholder="${placeholder}" min="1" max="31">`;
        } else if (fieldType.startsWith('repeating_group:')) {
            const groupFields = fieldType.replace('repeating_group: ', '').split(',').map(s => s.trim());
            inputHtml = `
                <div id="${fieldName}Group" class="repeating-group-container space-y-4 border p-4 rounded-lg bg-gray-50">
                    <p class="font-semibold">${questionText}</p>
                    <div id="${fieldName}Items" class="space-y-4"></div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addRepeatingGroupItem('${fieldName}', ${JSON.stringify(groupFields)})">הוסף פריט</button>
                </div>
            `;
        } else if (fieldType.startsWith('group:')) {
            const groupFields = fieldType.replace('group: ', '').split(',').map(s => s.trim());
            inputHtml = `
                <div class="group-container space-y-4 border p-4 rounded-lg bg-gray-50">
                    <p class="font-semibold">${questionText}</p>
                    ${groupFields.map(field => `<label for="${fieldName}_${field}">${field}</label><input type="text" id="${fieldName}_${field}" name="${fieldName}_${field}">`).join('')}
                </div>
            `;
        } else if (fieldType === 'info') {
            inputHtml = `<div class="info-box p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-r-lg"><p>${questionText}</p><p class="text-sm text-blue-600">${uxTip}</p></div>`;
        } else if (fieldType === 'file_upload') {
            inputHtml = `<input type="file" ${labelFor} name="${fieldName}">`;
        }

        stepDiv.innerHTML = `
            <h2 class="step-title">${questionText}</h2>
            ${uxTip ? `<p class="step-subtitle">${uxTip}</p>` : ''}
            <div class="space-y-6">
                <div>
                    <label for="${fieldName}" class="hidden">${questionText}</label>
                    ${inputHtml}
                </div>
            </div>
        `;
        formStepsContainer.appendChild(stepDiv);
        stepCount++;
    });

    // Attach event listeners for choice buttons after they are added to the DOM
    const choiceButtons = document.querySelectorAll('.choice-button');
    console.log('Number of choice buttons found for event listeners:', choiceButtons.length); // DEBUG
    choiceButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Choice button clicked!', this.dataset.value); // DEBUG
            const group = this.closest('.choice-button-group');
            const isMultiSelect = group.dataset.multiselect === 'true';
            const hiddenInput = group.querySelector('input[type="hidden"]');

            if (isMultiSelect) {
                this.classList.toggle('selected');
                const selectedValues = Array.from(group.querySelectorAll('.choice-button.selected')).map(btn => btn.dataset.value);
                hiddenInput.value = selectedValues.join(',');
            } else {
                group.querySelectorAll('.choice-button').forEach(btn => btn.classList.remove('selected'));
                this.classList.add('selected');
                hiddenInput.value = this.dataset.value;
            }
        });
    });

    // Add the final preview step
    const previewStepDiv = document.createElement('div');
    previewStepDiv.classList.add('form-step');
    previewStepDiv.setAttribute('data-step', stepCount);
    previewStepDiv.innerHTML = `
        <h2 class="step-title">
            <svg class="icon-md lemonade-pink" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" class="path-stroke"/></svg>
            סיכום ועריכה
        </h2>
        <p class="step-subtitle">זהו נוסח החוזה שנוצר. באפשרותך לעבור על הטקסט וללחוץ על כפתור ה"ערוך" בכל סעיף כדי לחזור לשאלון ולתקן את הפרטים.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded-r-lg" role="alert">
            <p class="font-bold">שלב אחרון!</p>
            <p>בדוק את כל הפרטים בחוזה. אם יש צורך בשינויים, לחץ על כפתור "ערוך" ליד הסעיף הרלוונטי.</p>
        </div>

        <div id="contractPreview" class="space-y-6">
            <!-- Contract sections will be dynamically inserted here -->
        </div>

        <style>
            .contract-section {
                @apply bg-white rounded-lg border border-gray-200 p-6;
            }
            .section-header {
                @apply flex justify-between items-center mb-4 pb-3 border-b border-gray-200;
            }
            .edit-section-btn {
                @apply flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 transition-colors;
            }
            .section-content {
                @apply text-gray-700 space-y-2;
            }
        </style>

        <div class="mt-8 flex justify-between items-center">
            <button type="button" id="downloadPdfBtn" class="btn btn-success">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                הורד כ-PDF
            </button>
        </div>
    `;
    formStepsContainer.appendChild(previewStepDiv);
    formSteps = document.querySelectorAll('.form-step'); // Update NodeList
    totalSteps = formSteps.length; // Update totalSteps
    console.log('Total form steps generated:', totalSteps); // DEBUG
}

// --- UI and Navigation Functions ---

/**
 * Updates the form's visibility, progress bar, and navigation buttons based on the current step.
 */
function updateFormView() {
    console.log('Current Step:', currentStep, 'Total Steps:', totalSteps); // DEBUG
    if (formSteps.length > 0) {
        formSteps.forEach(step => step.classList.remove('active'));
        const activeStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        if (activeStep) activeStep.classList.add('active');
    }

    // The main progress bar still shows overall progress
    const progressPercentage = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;
    progressBar.style.width = `${progressPercentage}%`;

    updateProgressBarSections(); // Update the section highlights

    navigationContainer.classList.toggle('hidden', isEditingFromPreview);
    editModeContainer.classList.toggle('hidden', !isEditingFromPreview);
    
    if (!isEditingFromPreview) {
        prevBtn.classList.toggle('hidden', currentStep === 1);
        nextBtn.classList.toggle('hidden', currentStep === totalSteps);
        submitBtn.classList.toggle('hidden', currentStep !== totalSteps);
    }
}

/**
 * Called from the preview modal to jump back to a specific form step.
 * @param {number} step - The step number to edit.
 */
window.startEditing = function(step) {
    closeModal('previewModal');
    isEditingFromPreview = true;
    currentStep = step;
    updateFormView();
}

/**
 * Called from the "Update" button to return to the preview modal.
 */
function finishEditing() {
    isEditingFromPreview = false;
    updateFormView(); // Hide edit button, show normal navigation
    displayContractPreview(); 
}

/**
 * Moves to the next or previous step.
 * @param {number} direction - 1 for next, -1 for previous.
 */
function navigateStep(direction) {
    currentStep += direction;
    if (currentStep < 1) currentStep = 1;
    if (currentStep > totalSteps) currentStep = totalSteps;
    updateFormView();
}

/**
 * Updates the visual representation of the progress bar sections.
 */
function updateProgressBarSections() {
    const progressBarSectionsContainer = document.getElementById('progressBarSections');
    if (!progressBarSectionsContainer) return;

    // Clear existing sections first
    progressBarSectionsContainer.innerHTML = '';

    let accumulatedSteps = 0;
    questionGroups.forEach((group, groupIndex) => {
        // Calculate the actual end index for each group based on the next group's start, or totalSteps
        const groupEndIndex = (groupIndex < questionGroups.length - 1)
            ? questionGroups[groupIndex + 1].startQuestionIndex - 1
            : questions.length; // Last group goes to the end of questions
        
        const groupSize = groupEndIndex - group.startQuestionIndex + 1;

        // Create the section element
        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('progress-section');
        sectionDiv.setAttribute('data-group-index', groupIndex);
        
        // Determine if this section is active or completed
        let isActiveGroup = false;
        let isCompletedGroup = false;
        const currentQuestionIndex = currentStep; // Assuming currentStep is 1-indexed question index
        
        if (currentQuestionIndex >= group.startQuestionIndex && currentQuestionIndex <= groupEndIndex) {
            isActiveGroup = true;
        }
        if (currentQuestionIndex > groupEndIndex) {
            isCompletedGroup = true;
        }

        sectionDiv.classList.toggle('active', isActiveGroup);
        sectionDiv.classList.toggle('completed', isCompletedGroup);

        // Calculate progress within the section (if active)
        let groupProgressPercentage = 0; // In percentage (0-100)
        if (isActiveGroup) {
            groupProgressPercentage = ((currentQuestionIndex - group.startQuestionIndex + 1) / groupSize) * 100;
        } else if (isCompletedGroup) {
            groupProgressPercentage = 100; // Fully filled when completed
        }

        sectionDiv.innerHTML = `
            <div class="progress-circle" style="--progress: ${groupProgressPercentage}%">
                ${isCompletedGroup ? '<svg class="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
            </div>
            <span class="progress-section-label">${group.name}</span>
        `;
        
        // Add click listener to navigate to the first step of the group
        sectionDiv.addEventListener('click', () => {
            currentStep = group.startQuestionIndex;
            updateFormView();
        });

        progressBarSectionsContainer.appendChild(sectionDiv);
        accumulatedSteps += groupSize;
    });

    // Adjust preview step index if it's not part of a question group
    // If the preview step is `totalSteps`, and totalSteps is greater than `questions.length`
    if (totalSteps > questions.length) {
        const previewSectionDiv = document.createElement('div');
        previewSectionDiv.classList.add('progress-section');
        previewSectionDiv.setAttribute('data-group-index', questionGroups.length); // Unique index for preview
        
        const isActiveGroup = currentStep === totalSteps;
        previewSectionDiv.classList.toggle('active', isActiveGroup);
        previewSectionDiv.classList.toggle('completed', currentStep > totalSteps); // Should not be completed beyond totalSteps

        // For the summary step, it should be fully filled when active (100% progress)
        const previewProgressPercentage = isActiveGroup ? 100 : 0;

        previewSectionDiv.innerHTML = `
            <div class="progress-circle" style="--progress: ${previewProgressPercentage}%">
                ${isActiveGroup ? '<svg class="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
            </div>
            <span class="progress-section-label">סיכום</span>
        `;

        previewSectionDiv.addEventListener('click', () => {
            currentStep = totalSteps;
            updateFormView();
        });
        progressBarSectionsContainer.appendChild(previewSectionDiv);
    }
}

// --- Contract and PDF Generation ---

/**
 * Formats a value for display, providing a placeholder if the value is empty.
 * @param {string|number} value - The input value.
 * @param {string} [placeholder='לא צוין'] - The placeholder text.
 * @returns {string} The formatted value or placeholder.
 */
function formatDisplayValue(value, placeholder = 'לא צוין') {
    if (value && typeof value === 'string') return value.trim() !== '' ? value.trim() : placeholder;
    return value ? String(value) : placeholder;
}

/**
 * Generates the complete HTML for the contract based on form data.
 * @param {FormData} formData - The form data object.
 * @param {boolean} forPdf - Whether the HTML is for PDF generation.
 * @returns {string} The contract HTML string.
 */
function getContractHTML(formData, forPdf = false) {
    const createBox = (title, content, stepTarget) => {
        const editButton = !forPdf ? `<button type="button" class="btn btn-sm btn-secondary edit-section-btn" onclick="startEditing(${stepTarget})">ערוך</button>` : '';
        const boxStyle = forPdf ? 'style="border: none; box-shadow: none; background: none;"' : '';
        return `
            <div class="contract-section-box" ${boxStyle}>
                <div class="section-header">
                    <h3 class="text-lg font-semibold">${title}</h3>
                    ${editButton}
                </div>
                <div class="editable-content" contenteditable="true">${content}</div>
            </div>`;
    };

    let html = `<h2>חוזה שכירות בלתי מוגנת</h2><p>שנערך ונחתם ביום ${new Date().toLocaleDateString('he-IL')}</p>`;

    questions.forEach((q, index) => {
        const fieldName = `question${index + 1}`;
        const questionText = q['ניסוח Lemonade לבעל הדירה'];
        const fieldType = q['סוג שדה'];
        let displayValue = '';

        if (fieldType.startsWith('repeating_group:')) {
            const groupFields = fieldType.replace('repeating_group: ', '').split(',').map(s => s.trim());
            const items = [];
            // Collect all repeating group items. This assumes consistent naming from addRepeatingGroupItem
            // A more robust solution might involve iterating over form elements or a dedicated data structure.
            const groupContainer = document.getElementById(`${fieldName}Items`);
            if (groupContainer) {
                Array.from(groupContainer.children).forEach((itemDiv, itemIndex) => {
                    const itemData = {};
                    groupFields.forEach(field => {
                        const input = itemDiv.querySelector(`[name="${fieldName}_${field}"]`);
                        if (input) {
                            itemData[field] = formatDisplayValue(input.value);
                        }
                    });
                    items.push(itemData);
                });
            }

            if (items.length > 0) {
                displayValue = items.map((item, i) => {
                    return `<h4>פריט #${i + 1}</h4>` + Object.keys(item).map(key => `<p><strong>${key}:</strong> ${item[key]}</p>`).join('');
                }).join('<br>');
            } else {
                displayValue = formatDisplayValue(null);
            }
        } else if (fieldType.startsWith('group:')) {
            const groupFields = fieldType.replace('group: ', '').split(',').map(s => s.trim());
            const groupData = {};
            groupFields.forEach(field => {
                groupData[field] = formatDisplayValue(formData.get(`${fieldName}_${field}`));
            });
            displayValue = Object.keys(groupData).map(key => `<p><strong>${key}:</strong> ${groupData[key]}</p>`).join('');
        } else if (fieldType === 'file_upload') {
            const fileInput = form.elements[fieldName];
            if (fileInput && fileInput.files.length > 0) {
                displayValue = `קובץ מצורף: ${fileInput.files[0].name}`;
            } else {
                displayValue = formatDisplayValue(null);
            }
        } else {
            displayValue = formatDisplayValue(formData.get(fieldName));
        }
        
        if (fieldType !== 'info') { // Don't create a box for info types, they are already displayed
            html += createBox(
                questionText,
                `<p>${displayValue}</p>`,
                index + 1 // Step number for editing
            );
        }
    });

    return html;
}

/**
 * Displays the generated contract preview in a modal.
 */
function displayContractPreview() {
    const previewModal = document.getElementById('previewModal');
    const contractPreviewContent = document.getElementById('contractPreview');
    const formData = new FormData(form);
    contractPreviewContent.innerHTML = getContractHTML(formData);
    previewModal.classList.remove('hidden');
    // Additional logic for PDF button event listener after content is loaded
    const currentDownloadPdfBtn = contractPreviewContent.querySelector('#downloadPdfBtn');
    if (currentDownloadPdfBtn) {
        currentDownloadPdfBtn.onclick = generatePDF;
    }
}

/**
 * Generates and downloads the contract as a PDF.
 */
function generatePDF() {
    const formData = new FormData(form);
    const pdfContent = getContractHTML(formData, true); // PDF version without icons
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add the content to the PDF
    doc.html(pdfContent, {
        callback: function(doc) {
            doc.save('חוזה_שכירות.pdf');
        },
        x: 10,
        y: 10
    });
}

function closeModal(modalId) {
    const modalToClose = document.getElementById(modalId);
    if (modalToClose) modalToClose.classList.add('hidden');
}

function showCustomAlert(message, type = 'info') {
    const existingAlert = document.querySelector('.custom-alert-popup');
    if (existingAlert) existingAlert.remove();
    const tempAlert = document.createElement('div');
    tempAlert.textContent = message;
    tempAlert.className = `custom-alert-popup fixed top-5 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg text-white z-[1000] text-center ${type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-blue-600')}`;
    document.body.appendChild(tempAlert);
    setTimeout(() => {
        if(tempAlert.parentNode) { 
            tempAlert.style.transition = 'opacity 0.5s ease';
            tempAlert.style.opacity = '0';
            setTimeout(() => { if(tempAlert.parentNode) tempAlert.remove(); }, 500);
        }
    }, 3500);
}

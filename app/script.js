// The entire JS logic is wrapped in a try-catch to prevent entire script from failing
try {
    // Check if libraries are loaded
    let jsPDFModule;
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDFModule = window.jspdf.jsPDF;
    } else {
        console.error("jsPDF library not loaded correctly!");
    }

    // --- Global State Variables ---
    let currentStep = 1;
    let isEditingFromPreview = false;

    // --- DOM Element References ---
    const formSteps = document.querySelectorAll('.form-step');
    const progressBar = document.getElementById('progressBar');
    const navigationContainer = document.getElementById('navigationContainer');
    const editModeContainer = document.getElementById('editModeContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const updateBtn = document.getElementById('updateBtn');
    const totalSteps = formSteps.length;
    const form = document.getElementById('rentalContractForm');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

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

    // --- Initialization Functions ---

    /**
     * Initializes all sliders to update their value display on input.
     */
    function initializeSliders() {
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const valueDisplay = document.getElementById(slider.id + 'Value');
            if (valueDisplay) {
                valueDisplay.textContent = slider.value; 
                slider.addEventListener('input', () => { valueDisplay.textContent = slider.value; });
            }
        });
    }

    /**
     * Initializes all choice buttons (single, multi-select, and those targeting textareas).
     */
    function initializeChoices() {
        initializeSliders(); 
        document.querySelectorAll('.choice-button-group').forEach(group => {
            const fieldName = group.dataset.fieldName;
            const hiddenInput = form.elements[fieldName];
            const isMultiSelect = group.dataset.multiselect === 'true';
            const targetTextareaId = group.dataset.targetTextarea;
            let selectedValues = [];

            if (!hiddenInput && !targetTextareaId) { 
                console.warn(`Input/Target for choice group '${fieldName}' not found.`);
                return;
            }
            
            if (hiddenInput && hiddenInput.value) {
                selectedValues = hiddenInput.value.split(',').filter(v => v.trim() !== '');
            }

            group.querySelectorAll('.choice-button').forEach(button => {
                const buttonValue = button.dataset.value;
                if (selectedValues.includes(buttonValue) || (hiddenInput && !hiddenInput.value && button.classList.contains('selected'))) {
                    button.classList.add('selected');
                    if (!isMultiSelect && hiddenInput && !hiddenInput.value) hiddenInput.value = buttonValue; 
                    else if (isMultiSelect && !selectedValues.includes(buttonValue) && button.classList.contains('selected')) {
                        selectedValues.push(buttonValue);
                    }
                }
                
                button.addEventListener('click', () => {
                    if (targetTextareaId) { 
                        const textarea = document.getElementById(targetTextareaId);
                        if (textarea) {
                            button.classList.toggle('selected');
                            const existingClauses = textarea.value.split('\n').filter(Boolean);
                            if (button.classList.contains('selected')) {
                                if (!existingClauses.includes(buttonValue)) { textarea.value = [...existingClauses, buttonValue].join('\n'); }
                            } else {
                                textarea.value = existingClauses.filter(clause => clause !== buttonValue).join('\n');
                            }
                        }
                    } else if (isMultiSelect) {
                        button.classList.toggle('selected');
                        if (button.classList.contains('selected')) { if (!selectedValues.includes(buttonValue)) selectedValues.push(buttonValue); } 
                        else { selectedValues = selectedValues.filter(v => v !== buttonValue); }
                        if (hiddenInput) hiddenInput.value = selectedValues.join(',');
                    } else {
                        group.querySelectorAll('.choice-button').forEach(btn => btn.classList.remove('selected'));
                        button.classList.add('selected');
                        if (hiddenInput) hiddenInput.value = buttonValue;
                    }
                    if (hiddenInput) toggleDependentFields(fieldName, hiddenInput.value);
                });
            });
            if (isMultiSelect && hiddenInput) hiddenInput.value = selectedValues.join(',');
            if (hiddenInput) toggleDependentFields(fieldName, hiddenInput.value); 
        });

        document.querySelectorAll('div[data-radio-group]').forEach(group => {
            group.querySelectorAll('input[type="radio"]').forEach(radio => {
                if (radio.checked) radio.closest('.radio-option').classList.add('selected');
                radio.addEventListener('change', function() {
                    group.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('selected'));
                    if (this.checked) this.closest('.radio-option').classList.add('selected');
                });
            });
        });
    }

    /**
     * Shows or hides form fields based on the value of a controlling field.
     * @param {string} fieldName - The name of the controlling field.
     * @param {string} selectedValue - The current value of the controlling field.
     */
    function toggleDependentFields(fieldName, selectedValue) {
        const getEl = (id) => document.getElementById(id);
        const toggle = (el, condition) => el && el.classList.toggle('hidden', !condition);

        toggle(getEl('propertyTypeOther'), fieldName === 'propertyType' && selectedValue === 'אחר');
        toggle(getEl('defectsDetails'), fieldName === 'knownDefects' && selectedValue === 'כן');
        toggle(getEl('optionDetails'), fieldName === 'hasOption' && selectedValue === 'כן');

        if (fieldName === 'optionRentTerms') {
            toggle(getEl('optionRentPercentage'), selectedValue === 'עלייה באחוזים');
            toggle(getEl('optionRentNewAmount'), selectedValue === 'סכום חדש');
        }
        toggle(getEl('paymentMethodOther'), fieldName === 'paymentMethod' && selectedValue === 'אחר');
        toggle(getEl('usagePurposeOther'), fieldName === 'usagePurpose' && selectedValue === 'אחר');

        if (fieldName === 'securityDepositType') {
            const selectedTypes = selectedValue ? selectedValue.split(',') : [];
            toggle(getEl('guarantorsSection'), selectedTypes.includes('ערבים'));
        }
    }

    // --- UI and Navigation Functions ---

    /**
     * Updates the form's visibility, progress bar, and navigation buttons based on the current step.
     */
    function updateFormView() {
        if (formSteps.length > 0) {
            formSteps.forEach(step => step.classList.remove('active'));
            const activeStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
            if (activeStep) activeStep.classList.add('active');
        }

        const progressPercentage = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;
        progressBar.style.width = `${progressPercentage}%`;

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
        const createBox = (content, stepTarget) => {
            const editButton = !forPdf ? `<button type="button" class="btn btn-sm btn-secondary edit-section-btn" onclick="startEditing(${stepTarget})">ערוך</button>` : '';
            const boxStyle = forPdf ? 'style="border: none; box-shadow: none; background: none;"' : '';
            return `<div class="contract-section-box" ${boxStyle}>${editButton}<div class="editable-content" contenteditable="true">${content}</div></div>`;
        };

        const getIcon = (iconPath) => {
            return forPdf ? '' : `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="${iconPath}"/>
            </svg>`;
        };
        
        let html = `<h2>חוזה שכירות בלתי מוגנת</h2>`;
        const propertyAddress = formData.get('propertyAddress');
        const city = propertyAddress ? propertyAddress.split(',').pop().trim() : "ישראל";
        html += createBox(`<p>שנערך ונחתם ב${formatDisplayValue(city)} ביום ${new Date().toLocaleDateString('he-IL')}</p>`, 1);

        html += createBox(`<h3>${getIcon('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')} פרטי הצדדים</h3><p><strong>המשכיר:</strong> ${formatDisplayValue(formData.get('landlordName'))}, ת.ז. ${formatDisplayValue(formData.get('landlordId'))}</p><p>מצד אחד</p>
        <h3>לבין:</h3><p><strong>השוכר:</strong> ${formatDisplayValue(formData.get('tenantName'))}, ת.ז. ${formatDisplayValue(formData.get('tenantId'))}</p><p>מצד שני</p>`, 2);

        let introHTML = `<h3>${getIcon('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')} פרטי הנכס</h3><p><strong>הואיל</strong> והמשכיר הינו בעל הזכויות הבלעדי במושכר - דירה מס' [מספר דירה], בקומה [קומה] בת [מספר חדרים] חדרים, בבית שברח' ${formatDisplayValue(propertyAddress)} (להלן "<strong>המושכר</strong>");</p>`;
        if(formData.get('knownDefects') === 'כן' && formData.get('defectsDetails')){ introHTML += `<p><strong>והואיל</strong> והשוכר מצהיר כי ידוע לו על הליקויים הבאים במושכר: ${formatDisplayValue(formData.get('defectsDetails'))}.</p>`; }
        introHTML += `<p><strong>והואיל</strong> וברצון המשכיר להשכיר וברצון השוכר לשכור את המושכר, לתקופה קצובה בשכירות בלתי מוגנת בתנאים שלפי כתב הסכם זה;</p>
                     <p><strong>אי-לכך הותנה והוסכם בין הצדדים כדלקמן:</strong></p>`;
        html += createBox(introHTML, 1);
        
        let mavoHTML = `<h3>${getIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2')} מבוא</h3> <p>1.1. המבוא להסכם זה מהווה חלק בלתי נפרד מתנאיו, והאמור בו ייחשב כנכלל בגוף הסכם זה.</p>`;
        html += createBox(mavoHTML, 1);

        let rentalPeriodHTML = `<h3>${getIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')} תקופת השכירות</h3>`;
        let usagePurposeFinal = formData.get('usagePurpose') === 'אחר' ? formatDisplayValue(formData.get('usagePurposeOther')) : formatDisplayValue(formData.get('usagePurpose'));
        rentalPeriodHTML += `<p>2.1. המושכר נמסר לשימושו של השוכר למטרת ${usagePurposeFinal}; מובהר בזאת כי השוכר, לא יהיה רשאי לעשות שימוש במושכר למטרה אחרת כלשהי.</p>`;
        rentalPeriodHTML += `<p>2.2. תקופת השכירות הינה ${formatDisplayValue(formData.get('rentalPeriod'))} חודשים, החל מיום ${formatDisplayValue(formData.get('startDate'))} ועד יום ${formatDisplayValue(formData.get('endDate'))}.</p>`;
        rentalPeriodHTML += `<p>2.3. השוכר מצהיר בזאת כי המושכר הינו ראוי למטרה שלשמה נשכר, וכי הוא בודק את המושכר ומקבלו כמות שהוא.</p>`;
        html += createBox(rentalPeriodHTML, 3);

        let rentAmountHTML = `<h3>${getIcon('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')} דמי השכירות</h3>`;
        rentAmountHTML += `<p>3.1. דמי השכירות החודשיים הינם ${formatDisplayValue(formData.get('rentAmount'))} ₪ (להלן: "דמי השכירות").</p>`;
        rentAmountHTML += `<p>3.2. דמי השכירות ישולמו עד יום ${formatDisplayValue(formData.get('paymentDay'))} בכל חודש.</p>`;
        rentAmountHTML += `<p>3.3. דמי השכירות ישולמו ${formatDisplayValue(formData.get('paymentMethod'))}.</p>`;
        html += createBox(rentAmountHTML, 4);

        let securityHTML = `<h3>${getIcon('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z')} ערבות</h3>`;
        securityHTML += `<p>4.1. השוכר ישלם למשכיר ערבות בסך ${formatDisplayValue(formData.get('securityAmount'))} ₪.</p>`;
        securityHTML += `<p>4.2. הערבות תוחזר לשוכר בתום תקופת השכירות, בניכוי חובות, אם ישנם.</p>`;
        html += createBox(securityHTML, 5);
        
        let signatureHTML = `<h3>${getIcon('M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13')} חתימות הצדדים</h3>
        <p><strong>המשכיר:</strong> _________________</p>
        <p><strong>השוכר:</strong> _________________</p>
        <p><strong>תאריך:</strong> _________________</p>`;
        html += `<div class="contract-section-box">${signatureHTML}</div>`; // Not editable

        return html;
    }

    /**
     * Displays the contract preview in a modal.
     */
    function displayContractPreview() {
        const formData = new FormData(form);
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = getContractHTML(formData, false); // Web preview with icons
        
        // Show the modal
        const previewModal = document.getElementById('previewModal');
        previewModal.classList.remove('hidden');
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

    // Add event listener for the download button
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async () => {
            try {
                if (!jsPDFModule || !window.html2canvas) {
                    showCustomAlert('שגיאה בטעינת ספריות PDF.', 'error');
                    return;
                }

                const formData = new FormData(form);
                const contentToPrint = document.getElementById('modalContent');
                if (!contentToPrint) {
                    showCustomAlert('שגיאה: לא נמצא תוכן להדפסה.', 'error');
                    return;
                }

                // Create a temporary div for PDF content
                const tempDiv = document.createElement('div');
                tempDiv.style.width = '210mm'; // A4 width
                tempDiv.style.padding = '20mm';
                tempDiv.style.backgroundColor = 'white';
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.innerHTML = getContractHTML(formData, true); // Get content without icons
                document.body.appendChild(tempDiv);

                // Hide edit buttons in the preview
                contentToPrint.querySelectorAll('.edit-section-btn').forEach(btn => btn.style.display = 'none');
                
                showCustomAlert('יוצר PDF, אנא המתן...', 'info');
                downloadPdfBtn.disabled = true;
                downloadPdfBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>מעבד...`;

                // Wait for fonts to load
                await (document.fonts ? document.fonts.ready : Promise.resolve());

                // Generate PDF
                const canvas = await window.html2canvas(tempDiv, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDFModule({
                    orientation: 'p',
                    unit: 'mm',
                    format: 'a4',
                    putOnlyUsedFonts: true
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const margin = 15;
                const usableWidth = pdfWidth - (margin * 2);
                const imgProps = pdf.getImageProperties(imgData);
                const imgHeight = (imgProps.height * usableWidth) / imgProps.width;
                let heightLeft = imgHeight;
                let position = margin;

                pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
                heightLeft -= (pdfHeight - (margin * 2));

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight + margin;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
                    heightLeft -= (pdfHeight - (margin * 2));
                }

                // Restore edit buttons
                contentToPrint.querySelectorAll('.edit-section-btn').forEach(btn => btn.style.display = 'inline-flex');

                // Save PDF
                const tenantName = formData.get('tenantName') || 'חוזה_שכירות';
                pdf.save(`חוזה_שכירות_${tenantName.replace(/\s+/g, '_')}.pdf`);
                showCustomAlert('PDF נוצר והורד בהצלחה!', 'success');

            } catch (error) {
                console.error("Error generating PDF:", error);
                showCustomAlert('שגיאה ביצירת PDF.', 'error');
            } finally {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = `<svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>הורד כ-PDF`;
                // Clean up the temporary div
                const tempDiv = document.querySelector('div[style*="left: -9999px"]');
                if (tempDiv) {
                    document.body.removeChild(tempDiv);
                }
            }
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
    
    // --- Initial Run ---
    document.addEventListener('DOMContentLoaded', () => {
        initializeChoices();
        updateFormView();
    });

} catch (e) {
    console.error("Global script error:", e);
    const body = document.querySelector('body');
    if (body) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'שגיאה קריטית באפליקציה. בדוק את הקונסול לפרטים.';
        errorDiv.style.cssText = 'color:red; position:fixed; top:10px; left:10px; background-color:white; padding:10px; border:1px solid red; z-index: 2000;';
        body.appendChild(errorDiv);
    }
}

"use client";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaCouch, FaSnowflake, FaBurn, FaUtensils, FaRegPlusSquare, FaRegSnowflake } from "react-icons/fa";
import { Info } from "lucide-react";
import type { JSX } from "react";
import dynamic from 'next/dynamic';
import { loadQuestions } from "./questions";
import { useRouter } from 'next/navigation';
import { buildContractContentFromAnswers } from './ContractEditor';

// questionGroups will be calculated after questions are loaded

function getGroupIndex(step: number, questionGroups: any[]) {
  for (let i = 0; i < questionGroups.length; i++) {
    if (step < questionGroups[i].end) return i;
  }
  return questionGroups.length - 1;
}

// paymentStepIndex and summaryStepIndex will be calculated after questions are loaded

const ContractEditor = dynamic(() => import('./ContractEditor'), { ssr: false });

// Helper functions to extract address parts
function extractApartmentNumber(address = '') {
  const match = address.match(/דירה\s*(\d+)/);
  return match ? match[1] : '';
}
function extractStreet(address = '') {
  // Try to extract street name (before comma or number)
  const match = address.match(/^(.*?)\s*\d+/);
  return match ? match[1].trim() : '';
}
function extractEntrance(address = '') {
  const match = address.match(/כניסה\s*(\d+)/);
  return match ? match[1] : '';
}
function extractCity(address = '') {
  // Try to extract city (after last comma)
  const parts = address.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : '';
}

// Helper to format date as dd/mm/yyyy
function formatDateIL(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // fallback if not a valid date
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Short, friendly section names for sidebar and preview
const sectionNameMap: Record<string, string> = {
  'פרטי החוזה הכלליים': 'פרטי החוזה הכלליים',
  'הפרטים שלך (בעל הנכס)': 'פרטי בעל הנכס',
  'פרטי השוכר': 'פרטי השוכר',
  'פרטי הנכס': 'פרטי הנכס',
  'תקופת השכירות ואפשרויות הארכה': 'תקופת השכירות והארכה',
  'יציאה מוקדמת ופיצויים': 'יציאה מוקדמת ופיצויים',
  'מטרת השכירות': 'מטרת השכירות',
  'תשלום שכר דירה ואופן התשלום': 'תשלום שכר דירה',
  'ביטוחים': 'פרטי ביטוחים',
  'מצב הדירה ביציאה': 'מצב הדירה ביציאה',
  'ערבויות, פיקדונות וביטחונות': 'ערבויות, פיקדונות וביטחונות',
};

// Add normalization for section names
const normalizeSection = (section: string) => {
  if (!section) return 'שונות';
  let s = section.trim();
  if (s === 'פרטי הדירה') s = 'פרטי הנכס';
  // Add more normalization rules here if needed
  return s;
};

// Define a Question type for better type safety
export type Question = {
  name: string;
  label?: string;
  type?: string;
  section?: string;
  conditional?: any;
  [key: string]: any;
};

export default function Home() {
  // All hooks at the top
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [paymentDetails, setPaymentDetails] = useState({ card: '', exp: '', cvc: '' });
  const [paymentError, setPaymentError] = useState('');
  const [hasPaid, setHasPaid] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visibleStep, setVisibleStep] = useState(0);
  const router = useRouter();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [template, setTemplate] = useState<string>('');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [reviewedQuestions, setReviewedQuestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadQuestions().then(qs => {
      setQuestions(qs);
      setForm(Object.fromEntries(qs.map((q: Question) => [q.name, ""])));
      setLoading(false);
    });
  }, []);

  // Load the master template from public folder
  useEffect(() => {
    fetch('/master-template.txt')
      .then(res => res.text())
      .then(setTemplate);
  }, []);

  // Helper: check if a question's condition is satisfied
  function isConditionSatisfied(q: Question, form: Record<string, string>) {
    if (!q.conditional) return true;
    const cond = q.conditional;
    const refQ = questions.find((qq: Question) => qq.label === cond["שאלה"]);
    if (!refQ) return false;
    const answer = form[refQ.name];
    if (refQ.type === 'multiselect') {
      return answer && answer.split(',').map(s => s.trim()).includes(cond["ערך"]);
    }
    return answer === cond["ערך"];
  }

  // Group questions by section (single source of truth)
  const groupedQuestions = React.useMemo(() => {
    return questions.reduce((acc: Record<string, Question[]>, q: Question) => {
      let section = normalizeSection(q.section);
      if (!acc[section]) acc[section] = [];
      acc[section].push(q);
      return acc;
    }, {});
  }, [questions, form]);
  const sectionNames = React.useMemo(() => Object.keys(groupedQuestions), [groupedQuestions]);
  console.log('All section names:', sectionNames);
  const sectionSteps = sectionNames.map((section, i) => ({
    section,
    start: i === 0 ? 0 : sectionNames.slice(0, i).reduce((sum, s) => sum + groupedQuestions[s].length, 0),
    end: sectionNames.slice(0, i + 1).reduce((sum, s) => sum + groupedQuestions[s].length, 0)
  }));
  const totalSteps = sectionSteps.length + 3;
  const previewStep = sectionSteps.length;
  const contractPreviewStep = sectionSteps.length + 1;
  const paymentStep = sectionSteps.length + 2;
  const pdfPreviewStep = sectionSteps.length + 3;
  const currentSectionIdx = sectionIdx;
  // Debug logs for section names and grouping
  console.log('All groupedQuestions:', groupedQuestions);
  console.log('Current section:', sectionSteps[currentSectionIdx]?.section);
  const sectionStart = sectionSteps[currentSectionIdx]?.start ?? 0;
  const sectionEnd = sectionSteps[currentSectionIdx]?.end ?? 0;
  const sectionQuestions = groupedQuestions[sectionSteps[currentSectionIdx]?.section] || [];
  // Debug log to see what questions are present and visible
  console.log('section', sectionSteps[currentSectionIdx]?.section, 'questions', sectionQuestions, 'visible', sectionQuestions /* visibleSectionQuestions */);
  // TEMP: Show all questions in the section, bypassing isConditionSatisfied
  const visibleSectionQuestions = sectionQuestions; // sectionQuestions.filter(q => isConditionSatisfied(q, form));
  // Add debug log for visibleStep and visibleSectionQuestions
  console.log('visibleStep:', visibleStep, 'visibleSectionQuestions.length:', visibleSectionQuestions.length, 'currentQuestion:', visibleSectionQuestions[visibleStep]);
  // Fallback: always show a question if available
  const currentQuestion = visibleSectionQuestions[visibleStep] || visibleSectionQuestions[0];

  // Add a helper to jump to a section and reset visibleStep
  function jumpToSection(idx: number) {
    setSectionIdx(idx);
    setStep(sectionSteps[idx].start);
    setVisibleStep(0);
  }

  // Debug log for step and sectionSteps
  console.log('step:', step, 'sectionSteps.length:', sectionSteps.length, 'currentQuestion:', currentQuestion);

  // Mark a question as reviewed when it is shown
  useEffect(() => {
    if (currentQuestion && currentQuestion.name) {
      setReviewedQuestions(prev => ({ ...prev, [currentQuestion.name]: true }));
    }
  }, [currentQuestion && currentQuestion.name]);

  // Helper: check if all questions in a section have been reviewed
  function isSectionCompleted(section: string) {
    const questionsInSection = groupedQuestions[section] || [];
    return questionsInSection.every(q => reviewedQuestions[q.name]);
  }

  // Helper: check if all required questions in all previous sections are answered
  function areAllPreviousSectionsCompleted(sectionIdx: number) {
    return sectionNames.slice(0, sectionIdx + 1).every(section => isSectionCompleted(section));
  }

  // Helper: check if all required questions in all sections are answered
  function areAllSectionsCompleted() {
    return sectionNames.every(section => isSectionCompleted(section));
  }

  if (loading || questions.length === 0) {
    return <div>טוען שאלות...</div>;
  }

  // Sidebar uses the same sectionSteps
  const sidebarSectionSteps = sectionSteps;

  // Handler and helper functions restored
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter' && isNextEnabled()) {
      e.preventDefault();
      handleNext();
    }
  };

  const handleNext = () => {
    setError("");
    // Mark the current question as reviewed (in case it's the last question and user clicks 'הבא')
    if (currentQuestion && currentQuestion.name) {
      setReviewedQuestions(prev => ({ ...prev, [currentQuestion.name]: true }));
    }
    if (visibleStep < visibleSectionQuestions.length - 1) {
      setVisibleStep(visibleStep + 1);
    } else {
      // If not the last section, move to the first question of the next section
      if (currentSectionIdx < sectionSteps.length - 1) {
        setSectionIdx(currentSectionIdx + 1);
        setVisibleStep(0);
        setStep(sectionSteps[currentSectionIdx + 1].start);
      } else {
        // If last section, mark all its questions as reviewed before moving to preview
        const lastSection = sectionSteps[currentSectionIdx].section;
        const lastSectionQuestions = groupedQuestions[lastSection] || [];
        setReviewedQuestions(prev => {
          const updated = { ...prev };
          lastSectionQuestions.forEach(q => { updated[q.name] = true; });
          return updated;
        });
        setStep(previewStep);
      }
    }
  };

  const handlePrev = () => {
    setError("");
    if (visibleStep > 0) {
      setVisibleStep(visibleStep - 1);
    } else {
      setStep(sectionSteps[currentSectionIdx].start - 1 >= 0 ? sectionSteps[currentSectionIdx].start - 1 : 0);
    }
  };

  function isNextEnabled() {
    if (!currentQuestion) return false;
    // If 'required' is not set, treat as not required (optional)
    if (currentQuestion.required && !form[currentQuestion.name]) return false;
    return true;
  }

  // Helper to render a clean contract: only lines where all placeholders are answered, with correct numbering
  function renderCleanContract(template: string, form: Record<string, string>) {
    // Support conditional blocks: {{#if requireGuarantorAppendix}} ... {{/if}}
    let processed = template;
    processed = processed.replace(/\{\{#if (\w+)}}([\s\S]*?)\{\{\/if}}/g, (match, key, content) => {
      if (form[key] === 'כן') return content;
      return '';
    });
    // Replace date placeholders with formatted dates
    processed = processed.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      if (key.toLowerCase().includes('date')) {
        return formatDateIL(form[key]);
      }
      return match;
    });
    const lines = processed.split('\n');
    const visibleLines: { text: string, orig: string, mainNum?: number, subNum?: number, isMain?: boolean, isSub?: boolean }[] = [];
    // First pass: filter lines
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i];
      // Find all placeholders in the line
      const matches = [...line.matchAll(/\{\{([^}]+)\}\}/g)];
      if (matches.length > 0) {
        // If any placeholder is not answered, skip this line
        if (matches.some(m => !form[m[1]] || form[m[1]].trim() === '')) continue;
      }
      visibleLines.push({ text: line, orig: line });
    }
    // Second pass: renumber main and sub-sections
    let mainCount = 0;
    let subCount = 0;
    let lastMainIdx = -1;
    for (let i = 0; i < visibleLines.length; ++i) {
      let line = visibleLines[i].text;
      // Main section: e.g. '1. ...'
      const mainMatch = line.match(/^\s*(\d+)\.(?!\d)/);
      if (mainMatch) {
        mainCount++;
        subCount = 0;
        visibleLines[i].mainNum = mainCount;
        visibleLines[i].isMain = true;
        lastMainIdx = i;
        // Replace the number
        line = line.replace(/^\s*\d+\./, mainCount + '.');
      }
      // Subsection: e.g. '1.1 ...' or '2.5.1 ...'
      const subMatch = line.match(/^\s*(\d+)\.(\d+)(\.(\d+))?/);
      if (subMatch && !mainMatch) {
        if (lastMainIdx >= 0) {
          subCount++;
          visibleLines[i].mainNum = visibleLines[lastMainIdx].mainNum;
          visibleLines[i].subNum = subCount;
          visibleLines[i].isSub = true;
          // Replace the number
          line = line.replace(/^\s*\d+\.\d+(\.\d+)?/, visibleLines[lastMainIdx].mainNum + '.' + subCount + (subMatch[3] ? subMatch[3] : ''));
        }
      }
      // Replace placeholders with answers (format date fields)
      line = line.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
        if (key.toLowerCase().includes('date')) {
          return formatDateIL(form[key]);
        }
        return form[key];
      });
      visibleLines[i].text = line;
    }
    // Render
    return visibleLines.map((l, idx) => {
      const trimmed = l.text.trim();
      // Skip section dividers
      if (trimmed === '⸻' || /^[-—–]{3,}$/.test(trimmed)) return null;
      // Main title styling (split subtitle)
      if (trimmed === 'הסכם שכירות למגורים (שכירות בלתי מוגנת)') {
        return (
          <div key={idx} style={{ textAlign: 'center', margin: '32px 0 24px 0' }}>
            <div style={{ fontSize: '2.5em', fontWeight: 800 }}>הסכם שכירות למגורים</div>
            <div style={{ fontSize: '1.1em', fontWeight: 400, marginTop: 4 }}>(שכירות בלתי מוגנת)</div>
          </div>
        );
      }
      // Main section header styling (e.g. '7. ...' but NOT '7.1 ...')
      if (/^\d+\.\s*[^\d]/.test(trimmed)) {
        return <div key={idx} style={{ fontSize: '1.2em', fontWeight: 700, textAlign: 'right', margin: '24px 0 16px 0', paddingRight: 16 }}>{l.text}</div>;
      }
      // Subsection indentation
      // 7.1 ...
      if (/^\d+\.\d+/.test(trimmed) && !/^\d+\.\d+\.\d+/.test(trimmed)) {
        return <div key={idx} style={{ margin: '0 0 4px 0', whiteSpace: 'pre-line', paddingRight: 32 }}>{l.text}</div>;
      }
      // 7.1.1 ...
      if (/^\d+\.\d+\.\d+/.test(trimmed)) {
        return <div key={idx} style={{ margin: '0 0 4px 0', whiteSpace: 'pre-line', paddingRight: 48 }}>{l.text}</div>;
      }
      // Default styling
      return <div key={idx} style={{ margin: '0 0 4px 0', whiteSpace: 'pre-line' }}>{l.text}</div>;
    });
  }

  // Remove the temporary debug <div>
  console.log('DEBUG: sectionNames', sectionNames);
  console.log('DEBUG: groupedQuestions', groupedQuestions);
  console.log('DEBUG: form', form);
  return (
    <>
      <div className="flex flex-col min-h-screen bg-muted" dir="rtl">
        {/* Header */}
        <header className="w-full py-4 px-2 border-b bg-white text-center font-bold text-2xl">
          יצירת חוזה שכירות דירה
        </header>
        <div className="flex flex-1 w-full max-w-6xl mx-auto">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden md:block border-l p-4">
            <div className="text-lg font-bold mb-4">שלבי מילוי החוזה</div>
            <div id="progressBarSections" className="flex flex-col relative">
              {/* Question Groups - use sidebarSectionSteps for sidebar */}
              {sidebarSectionSteps.map((group, i) => {
                // Mark section as completed if all its questions are answered
                const isCompleted = isSectionCompleted(group.section);
                const isActive = i === sectionIdx && step < previewStep;
                return (
                  <div
                    key={group.section}
                    className={`progress-section${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
                    onClick={() => jumpToSection(i)}
                  >
                    <div className="progress-circle">
                      {isCompleted && (
                        <svg className="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <span className="progress-section-label">{sectionNameMap[group.section] || group.section}</span>
                  </div>
                );
              })}
              {/* Divider */}
              <div className="my-4 border-t border-gray-200"></div>
              {/* Preview step */}
              <div className={`progress-section${step === previewStep ? ' active' : ''}${areAllSectionsCompleted() ? ' completed' : ''}`}
                onClick={() => setStep(previewStep)}>
                <div className="progress-circle">{areAllSectionsCompleted() && (<svg className="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>)}</div>
                <span className="progress-section-label">תצוגה מקדימה</span>
              </div>
              {/* Contract preview step - only טקסט קבוע */}
              <div className={`progress-section${step === contractPreviewStep ? ' active' : ''}${areAllSectionsCompleted() ? ' completed' : ''}`}
                onClick={() => setStep(contractPreviewStep)}>
                <div className="progress-circle">{areAllSectionsCompleted() && (<svg className="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>)}</div>
                <span className="progress-section-label">חוזה סופי</span>
              </div>
            </div>
          </aside>
          {/* Main content */}
          <main className="flex-1 flex flex-col items-center justify-start p-2 sm:p-4 relative" style={{ minHeight: '70vh' }}>
            {/* Question steps */}
            {currentQuestion && step !== previewStep && step !== contractPreviewStep && (
              <div className="w-full max-w-xl mx-auto rounded p-6 mt-8">
                <div className="flex justify-start mb-2">
                  <Button onClick={handlePrev} disabled={sectionIdx === 0 && visibleStep === 0} variant="ghost" className="btn-tertiary">הקודם</Button>
                </div>
                <div className="font-bold mb-2">{currentQuestion.label}</div>
                {currentQuestion.explanation && (
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-sm text-blue-900">
                    <Info size={20} className="mt-0.5 text-blue-400 flex-shrink-0" />
                    <span>{currentQuestion.explanation}</span>
                  </div>
                )}
                {/* Render input based on inputType from JSON */}
                {(() => {
                  const inputType = currentQuestion.inputType || 'text';
                  const name = currentQuestion.name || `q${step+1}`;
                  let placeholder = currentQuestion.placeholder || '';
                  if (!placeholder) {
                    if (inputType === 'date') placeholder = 'בחר תאריך';
                    else if (inputType === 'number') placeholder = 'לדוג׳: 1000';
                    else if (inputType === 'tel') placeholder = 'לדוג׳: 050-1234567';
                    else if (inputType === 'text') {
                      if (name.includes('Name')) placeholder = 'לדוג׳: ישראל ישראלי';
                      else if (name.includes('City')) placeholder = 'לדוג׳: תל אביב';
                      else if (name.includes('street')) placeholder = 'לדוג׳: הרצל';
                      else if (name.includes('entrance')) placeholder = 'לדוג׳: ב';
                      else if (name.includes('features')) placeholder = 'לדוג׳: מזגן, מקרר, ריהוט';
                      else if (name.includes('paymentMethod')) placeholder = 'לדוג׳: העברה בנקאית';
                      else if (name.includes('insuranceTypes')) placeholder = 'לדוג׳: צד ג׳, תכולה';
                      else if (name.includes('exitPaintColor')) placeholder = 'לדוג׳: לבן';
                      else if (name.includes('rentalPurpose')) placeholder = 'לדוג׳: מגורים';
                      else placeholder = '';
                    }
                  }
                  return (
                    <input
                      type={inputType}
                      name={name}
                      value={form[name] || ''}
                      onChange={handleChange}
                      onKeyDown={handleInputKeyDown}
                      className="border rounded p-2 w-full"
                      placeholder={placeholder}
                      autoFocus
                      {...(inputType === 'number' ? { min: 0, inputMode: 'numeric', pattern: '[0-9]*' } : {})}
                    />
                  );
                })()}
                {/* Error */}
                {error && <div className="text-red-500 mt-2">{error}</div>}
                {/* Navigation */}
                {(() => {
                  const inputType = currentQuestion.inputType || 'text';
                  const name = currentQuestion.name || `q${step+1}`;
                  return (
                    <div className="flex gap-2 mt-4 justify-end">
                      <Button
                        onClick={handleNext}
                        disabled={step === totalSteps - 1 || (inputType !== 'multiselect' && !form[name])}
                        className="btn btn-primary"
                      >
                        הבא
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
            {/* Preview step */}
            {step === previewStep && (
              <div className="w-full max-w-2xl mx-auto bg-white rounded shadow p-6 mt-8">
                <h2 className="font-bold text-xl mb-4">תצוגה מקדימה של התשובות</h2>
                {/* Group questions by section as in the loaded questions */}
                {(() => {
                  const sectionMap: Record<string, Question[]> = {};
                  questions.forEach(q => {
                    if (!sectionMap[q.section]) sectionMap[q.section] = [];
                    sectionMap[q.section].push(q);
                  });
                  return Object.entries(sectionMap).map(([section, questionsInSection]) => (
                    <div key={section} className="mb-6 border rounded-lg p-4 bg-gray-50 relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-lg">{sectionNameMap[section] || section}</div>
                        <button
                          className="flex items-center gap-1 text-blue-600 hover:underline text-sm font-semibold px-2 py-1 rounded focus:outline-none"
                          onClick={() => {
                            const idx = sectionSteps.findIndex(s => s.section === section);
                            if (idx !== -1) {
                              jumpToSection(idx);
                            }
                          }}
                          aria-label={`ערוך את ${section}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="inline-block" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 00-4-4l-8 8v3zm-2 6h12" /></svg>
                          ערוך
                        </button>
                      </div>
                      <div className="space-y-2">
                        {questionsInSection.map((q: Question, idx: number) => {
                          // Hide questions, only show answers
                          const name = q.name;
                          let answer = form[name] || '';
                          if (q.inputType === 'date' && answer) {
                            answer = formatDateIL(answer);
                          }
                          // Only show if there is an answer
                          if (!answer) return null;
                          return (
                            <div key={name} className="flex flex-col border-b last:border-b-0 pb-1 pt-1">
                              <span className="text-gray-800 font-medium mb-0.5">{q.label || q["שאלה"] || q.question || ''}</span>
                              <span className="text-gray-500 text-sm text-right min-w-[80px]">{answer}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
                <div className="flex gap-2 mt-4 justify-end">
                  <Button onClick={handlePrev}>הקודם</Button>
                  <Button onClick={handleNext} disabled={!isNextEnabled()}>המשך</Button>
                </div>
              </div>
            )}
            {/* Contract preview step - only טקסט קבוע */}
            {step === contractPreviewStep && (
              <div className="w-full max-w-2xl mx-auto bg-white rounded shadow p-6 mt-8" style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
                <h2 className="font-bold text-xl mb-4">חוזה סופי</h2>
                <div style={{ marginTop: 40, background: '#f8f8f8', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px #0001' }}>
                  <h2 style={{ fontSize: '1.3em', fontWeight: 600, marginBottom: 16 }}>חוזה סופי</h2>
                  {template ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#fff', borderRadius: 8, padding: 24, border: '1px solid #eee', fontSize: '1.1em', color: '#444', whiteSpace: 'pre-line', textAlign: 'right', direction: 'rtl', fontFamily: '"Noto Serif Hebrew", serif' }}>
                      {renderCleanContract(template, form)}
                    </div>
                  ) : (
                    <div>טוען תבנית חוזה...</div>
                  )}
                </div>
                <div className="flex justify-start mt-6">
                  <Button className="btn btn-primary" onClick={handleNext}>
                    המשך
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
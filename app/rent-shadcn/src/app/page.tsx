"use client";
import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaCouch, FaSnowflake, FaBurn, FaUtensils, FaRegPlusSquare, FaRegSnowflake } from "react-icons/fa";
import type { JSX } from "react";
import dynamic from 'next/dynamic';
import { questions } from "./questions";

// Dynamically calculate group boundaries based on questions.length
const questionGroups = [
  { name: "פרטים אישיים", start: 0, end: 4 },
  { name: "פרטי נכס", start: 4, end: 10 },
  { name: "פרטי שוכר", start: 10, end: 16 },
  { name: "תנאי שכירות ותשלום", start: 16, end: 22 },
  { name: "בטחונות", start: 22, end: Math.min(28, questions.length) },
  { name: "תנאים נוספים", start: Math.min(28, questions.length), end: questions.length },
];

function getGroupIndex(step: number) {
  for (let i = 0; i < questionGroups.length; i++) {
    if (step < questionGroups[i].end) return i;
  }
  return questionGroups.length - 1;
}

// 1. Add a new constant for the payment step index
const paymentStepIndex = questions.length;
const summaryStepIndex = questions.length + 1;

const ContractEditor = dynamic(() => import('./ContractEditor'), { ssr: false });

export default function Home() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => Object.fromEntries(questions.map(q => [q.name, ""])));
  const [animating, setAnimating] = useState(false);
  const [returnToSummary, setReturnToSummary] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showOverlayCards, setShowOverlayCards] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [hasPaid, setHasPaid] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({ card: '', exp: '', cvc: '' });
  const [paymentError, setPaymentError] = useState('');
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    const q = questions[step];
    // Validation: required for all except summary/payment
    if (q) {
      // Make landlord and tenant ID numbers required
      if ((q.name === "idNumber" || q.name === "tenantIdNumber") && !form[q.name]) {
        setError("אנא מלא/י שדה זה (מספר תעודת זהות חובה)");
        return;
      }
      if ((q.type === "text" || q.type === "number" || q.type === "date") && !form[q.name]) {
        setError("אנא מלא/י שדה זה");
        return;
      }
      if (q.type === "select" && (!form[q.name] || form[q.name] === "")) {
        setError("אנא בחר/י אפשרות");
        return;
      }
      if (q.type === "multiselect" && (!form[q.name] || form[q.name].split(",").filter(Boolean).length === 0)) {
        setError("אנא בחר/י לפחות אפשרות אחת");
        return;
      }
    }
    setError("");
    setDirection('forward');
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      if (returnToSummary) {
        setStep(summaryStepIndex);
        setReturnToSummary(false);
      } else {
        setStep((s) => Math.min(s + 1, summaryStepIndex));
      }
    }, 400);
  };

  const handlePrev = () => {
    setDirection('backward');
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      setStep((s) => Math.max(s - 1, 0));
    }, 400);
  };

  // Update isSummary to be summaryStepIndex
  const isSummary = step === summaryStepIndex;

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
  };

  const handleMockPayment = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock validation
    if (!paymentDetails.card || !paymentDetails.exp || !paymentDetails.cvc) {
      setPaymentError('אנא מלא את כל פרטי האשראי');
      return;
    }
    setPaymentError('');
    setTimeout(() => {
      setHasPaid(true);
      setStep(summaryStepIndex); // Go to summary
    }, 1000);
  };

  const isCurrentQuestionAnswered = () => {
    const q = questions[step];
    if (!q) return false;
    const value = form[q.name];
    if (q.type === "text" || q.type === "number" || q.type === "date") {
      return value && value !== "";
    }
    if (q.type === "select") {
      return value && value !== "";
    }
    if (q.type === "multiselect") {
      return value && value.split(",").filter(Boolean).length > 0;
    }
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted" dir="rtl">
      {/* Header */}
      <header className="w-full py-4 px-2 border-b bg-white text-center font-bold text-2xl">
        יצירת חוזה שכירות דירה
      </header>
      <div className="flex flex-1 w-full max-w-6xl mx-auto">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden md:block border-l p-4">
          <div id="progressBarSections" className="flex flex-col relative">
            {questionGroups.filter(group => group.start !== group.end).map((group, i) => {
              // Completed if user has moved past the last question in the group
              const isCompleted = step >= group.end;
              // Active only if current group and step < paymentStepIndex
              const isActive = step < paymentStepIndex && getGroupIndex(step) === i;
              const isCurrent = step >= group.start && step < group.end;
              return (
                <div
                  key={group.name}
                  className={`progress-section${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}${isCurrent ? ' current' : ''}`}
                  onClick={() => setStep(group.start)}
                >
                  <div className="progress-circle">
                    {isCompleted && (
                      <svg className="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <span className="progress-section-label">{group.name}</span>
                </div>
              );
            })}
            {/* Payment step: completed if hasPaid, active if on payment step */}
            <div className={`progress-section${step === paymentStepIndex ? ' active' : ''}${hasPaid ? ' completed' : ''}`}
              onClick={() => setStep(paymentStepIndex)}>
              <div className="progress-circle">{hasPaid && (<svg className="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>)}</div>
              <span className="progress-section-label">תשלום</span>
            </div>
            {/* Summary step: active if on summary step */}
            <div className={`progress-section${isSummary ? ' active' : ''}`}
              onClick={() => setStep(summaryStepIndex)}>
              <div className="progress-circle">{isSummary && (<svg className="checkmark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>)}</div>
              <span className="progress-section-label">סיום והורדה</span>
            </div>
          </div>
        </aside>
        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-start p-2 sm:p-4 relative" style={{ minHeight: '70vh' }}>
          {/* Previous answered cards in a scrollable overlay, only if not summary */}
          {step > 0 && step < questions.length && (
            <div
              ref={overlayRef}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl gap-2 overflow-y-auto z-0"
              style={{ maxHeight: '200px', pointerEvents: 'auto' }}
              onScroll={() => {
                if (overlayRef.current) {
                  setShowOverlayCards(overlayRef.current.scrollTop > 0);
                }
              }}
            >
              {/* Show the rest of the overlay cards only when scrolled */}
              {showOverlayCards && questions.slice(0, step).map((q, idx) => (
                <div
                  key={q.name}
                  className="w-full rounded-xl p-4 bg-muted border cursor-pointer opacity-80 hover:opacity-100 transition"
                  onClick={() => setStep(idx)}
                >
                  <div className="text-xs text-gray-500 mb-1">{q.label}</div>
                  <div className="font-semibold text-gray-800">{form[q.name] || 'לא צוין'}</div>
                </div>
              ))}
            </div>
          )}
          {/* Current question card or summary, always centered */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full" style={{ minHeight: '400px' }}>
            {/* Payment step */}
            {step === paymentStepIndex ? (
              <Card className="w-full rounded-xl p-6 sm:p-10 pb-24 shadow-xl max-w-2xl mx-auto">
                <CardHeader className="relative">
                  <CardTitle className="mb-4 question-title">לתשלום עבור יצירת החוזה</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-4 max-w-md mx-auto" onSubmit={handleMockPayment}>
                    <label className="text-xs text-gray-500">מספר כרטיס אשראי</label>
                    <Input name="card" maxLength={19} value={paymentDetails.card} onChange={handlePaymentChange} placeholder="1234 5678 9012 3456" className="rtl" />
                    <label className="text-xs text-gray-500">תוקף</label>
                    <Input name="exp" maxLength={5} value={paymentDetails.exp} onChange={handlePaymentChange} placeholder="MM/YY" className="rtl" />
                    <label className="text-xs text-gray-500">CVC</label>
                    <Input name="cvc" maxLength={4} value={paymentDetails.cvc} onChange={handlePaymentChange} placeholder="123" className="rtl" />
                    {paymentError && <div className="text-red-500 text-sm">{paymentError}</div>}
                    <Button type="submit" className="btn btn-primary mt-4">לתשלום והמשך</Button>
                  </form>
                </CardContent>
              </Card>
            ) : isSummary ? (
              <div className="editor-fullscreen bg-white min-h-[80vh] p-0 m-0 w-full">
                <div className="w-full max-w-none flex flex-col">
                  <ContractEditor form={form} />
                </div>
              </div>
            ) : (
              <Card className={`w-full rounded-xl p-3 sm:p-6 pb-10 transition-transform duration-400 ${animating ? (direction === 'forward' ? 'card-slide-up' : 'card-slide-down') : ''} max-w-2xl mx-auto`}>
                <CardHeader className="relative">
                  {step > 0 && step < questions.length && (
                    <div className="flex flex-row-reverse justify-end w-full">
                      <Button onClick={handlePrev} className="btn btn-tertiary mb-2">
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" className="path-stroke" d="M15 5l7 7-7 7" /></svg>
                        <span>הקודם</span>
                      </Button>
                    </div>
                  )}
                  <CardTitle className="mb-4 question-title">
                    {questions[step]?.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 rtl">
                    {/* Show only the current question for the step */}
                    {(() => {
                      const q = questions[step];
                      if (!q) return null;
                      // Text input
                      if (q.type === "text" || q.type === "number" || q.type === "date") {
                        return (
                          <Input
                            type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"}
                            name={q.name}
                            placeholder={q.placeholder}
                            value={form[q.name]}
                            onChange={handleChange}
                            className="rtl"
                            onKeyDown={e => {
                              if (e.key === "Enter" && isCurrentQuestionAnswered()) {
                                e.preventDefault();
                                handleNext();
                              }
                            }}
                          />
                        );
                      }
                      // Select as button group if options < 8
                      if (q.type === "select" && q.options && q.options.length < 8) {
                        return (
                          <div className="flex gap-2 flex-wrap">
                            {q.options.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                className={`choice-button${form[q.name] === opt ? " selected" : ""}`}
                                onClick={() => {
                                  setForm({ ...form, [q.name]: opt });
                                  setError("");
                                }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        );
                      }
                      // Select as dropdown
                      if (q.type === "select" && q.options) {
                        return (
                          <select
                            name={q.name}
                            value={form[q.name]}
                            onChange={handleChange}
                            className="rtl w-full border rounded-md p-2"
                          >
                            <option value="" disabled>בחר</option>
                            {q.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        );
                      }
                      // Multiselect as button group
                      if (q.type === "multiselect" && q.options) {
                        const selected = (form[q.name] || "").split(",").map(s => s.trim()).filter(Boolean);
                        const toggle = (opt: string) => {
                          const next = selected.includes(opt)
                            ? selected.filter(o => o !== opt)
                            : [...selected, opt];
                          setForm({ ...form, [q.name]: next.join(", ") });
                        };
                        // Icon mapping for leftItems
                        const iconMap: Record<string, JSX.Element> = {
                          FaCouch: <FaCouch className="inline-block mr-1" />,
                          FaSnowflake: <FaSnowflake className="inline-block mr-1" />,
                          FaBurn: <FaBurn className="inline-block mr-1" />,
                          FaUtensils: <FaUtensils className="inline-block mr-1" />,
                          FaRegPlusSquare: <FaRegPlusSquare className="inline-block mr-1" />,
                          FaRegSnowflake: <FaRegSnowflake className="inline-block mr-1" />,
                        };
                        return (
                          <div className="flex gap-2 flex-wrap">
                            {q.options.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                className={`choice-button${selected.includes(opt) ? " selected" : ""}`}
                                onClick={() => toggle(opt)}
                              >
                                {q.icons && iconMap[(q.icons as Record<string, string>)[opt]]}
                                {opt}
                              </button>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {returnToSummary && (
                      <Button onClick={() => setStep(questions.length)} className="btn btn-tertiary mt-4">
                        חזור לסיכום
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-between mt-8">
                    {!isSummary && !returnToSummary ? (
                      <Button onClick={handleNext} className="btn btn-primary" disabled={!isCurrentQuestionAnswered()}>
                        <span>הבא</span>
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" className="path-stroke" d="M9 5l-7 7 7 7" /></svg>
                      </Button>
                    ) : null}
                  </div>
                  {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";
import React, { FC, useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from "@/components/ui/button";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import IBMPlexSansHebrewRegular from "./IBMPlexSansHebrew-Regular-base64.js";
import IBMPlexSansHebrewBold from "./IBMPlexSansHebrew-Bold-base64.js";
import { Bold, Italic, Heading1, Heading2, Pilcrow, List, ListOrdered, Quote, Undo2, Redo2, Strikethrough, Underline as UnderlineIcon, Minus, AlignRight, AlignCenter, AlignLeft } from 'lucide-react';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TextAlign from '@tiptap/extension-text-align';
import { FaFilePdf } from 'react-icons/fa';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SignaturePad from '@/components/ui/SignaturePad';
import { generalClauses } from './general_contract_clauses';

type ContractEditorProps = {
  form: Record<string, string>;
  questions: any[];
};

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Improved PDF export: render headings, bold, and paragraphs with better structure and spacing
async function generateAndDownloadPdf(htmlContent: string, signatureImageDataUrl?: string) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = base64ToUint8Array(IBMPlexSansHebrewRegular);
  const customFont = await pdfDoc.embedFont(fontBytes);
  const boldFontBytes = base64ToUint8Array(IBMPlexSansHebrewBold);
  const boldFont = await pdfDoc.embedFont(boldFontBytes);
  const pageSize: [number, number] = [595.28, 841.89]; // A4 size
  let page = pdfDoc.addPage(pageSize);
  const [width, height] = pageSize;
  let y = height - 60; // Start a bit lower for top margin
  const leftMargin = 60;
  const rightMargin = 60;
  const lineSpacing = 8;
  const bottomMargin = 60;

  // Helper to wrap text to fit within maxWidth
  function wrapText(text: string, font: any, fontSize: number, maxWidth: number) {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Helper to fix numbers in RTL text (reverse digit sequences)
  function fixNumbersInRTL(text: string) {
    // Replace each sequence of digits with its reversed version
    return text.replace(/\d+/g, (num) => num.split('').reverse().join(''));
  }

  // Helper to add a new page and reset y
  function addNewPage() {
    page = pdfDoc.addPage(pageSize);
    y = height - 60;
  }

  // Add variables to store the Y positions
  let landlordRoleY: number | null = null;
  let tenantRoleY: number | null = null;

  // Helper to draw text with alignment and wrapping, with page break support
  function drawAlignedText(text: string, font: any, fontSize: number, align: string = 'right', extraY = 0) {
    if (!text.trim()) return;
    const maxWidth = width - leftMargin - rightMargin;
    // Fix numbers in RTL text
    let displayText = text;
    if (align === 'right') {
      displayText = fixNumbersInRTL(text);
    }
    const lines = wrapText(displayText, font, fontSize, maxWidth);
    const lineSpacing = Math.max(4, fontSize * 0.5);
    for (const line of lines) {
      // Check if we need a new page
      if (y < bottomMargin + fontSize) {
        addNewPage();
      }
      let x = leftMargin;
      if (align === 'right') {
        x = width - rightMargin - font.widthOfTextAtSize(line, fontSize);
      } else if (align === 'center') {
        x = (width - font.widthOfTextAtSize(line, fontSize)) / 2;
      }
      // Detect landlord and tenant role labels
      if (line.includes('בעל הדירה') && landlordRoleY === null) {
        landlordRoleY = y;
      }
      if (line.includes('השוכר/ים') && tenantRoleY === null) {
        tenantRoleY = y;
      }
      page.drawText(line, {
        x,
        y: y + extraY,
        size: fontSize,
        font,
      });
      y -= fontSize + lineSpacing;
      extraY = 0;
    }
  }

  // Helper to find nearest alignment up the DOM tree (recursive)
  function findAlignRecursive(el: Node | null): string {
    while (el && el.nodeType === 1) {
      const style = (el as Element).getAttribute && (el as Element).getAttribute('style') || '';
      if (style.includes('text-align:center')) return 'center';
      if (style.includes('text-align:left')) return 'left';
      if (style.includes('text-align:right')) return 'right';
      const dataAlign = (el as Element).getAttribute && (el as Element).getAttribute('data-text-align') || '';
      if (dataAlign === 'center') return 'center';
      if (dataAlign === 'left') return 'left';
      if (dataAlign === 'right') return 'right';
      el = (el as Element).parentElement;
    }
    return 'right'; // Default for Hebrew
  }

  // Helper to check if an element or any ancestor is bold
  function isBoldRecursive(el: Node | null): boolean {
    while (el && el.nodeType === 1) {
      const tag = (el as Element).nodeName.toLowerCase();
      if (tag === 'b' || tag === 'strong') return true;
      const style = (el as Element).getAttribute && (el as Element).getAttribute('style') || '';
      if (/font-weight\s*:\s*(bold|[7-9]00)/i.test(style)) return true;
      el = (el as Element).parentElement;
    }
    return false;
  }

  // Recursive function to render nodes (now uses findAlignRecursive)
  function renderNode(node: Node, parentAlign: string = 'right') {
    if (node.nodeType === 3) { // Text node
      const text = node.textContent || '';
      if (!text.trim()) return;
      const bold = isBoldRecursive(node.parentElement);
      drawAlignedText(text, bold ? boldFont : customFont, 10, parentAlign);
    } else if (node.nodeType === 1) { // Element
      const el = node as Element;
      const tag = el.nodeName.toLowerCase();
      // Only block-level elements should update alignment
      let align = parentAlign;
      if ([
        'p','h1','h2','h3','h4','h5','h6','div','blockquote','ul','ol','li'
      ].includes(tag)) {
        align = findAlignRecursive(el) || parentAlign;
      }
      const bold = isBoldRecursive(el);
      if (tag === 'h1') {
        y -= 18;
        drawAlignedText(el.textContent || '', boldFont, 16, align);
        y -= 10;
      } else if (tag === 'h2') {
        y -= 16; // Add extra space (new line) before the section title
        y -= 18; // Add space above the title
        drawAlignedText(el.textContent || '', boldFont, 13, align);
      } else if (tag === 'h3') {
        y -= 10;
        drawAlignedText(el.textContent || '', boldFont, 11, align);
        y -= 6;
      } else if (tag === 'ul') {
        const items = Array.from(el.childNodes).filter(n => n.nodeType === 1 && (n as HTMLElement).nodeName.toLowerCase() === 'li');
        for (const item of items) {
          renderNode(item, align);
        }
        y -= 2;
      } else if (tag === 'ol') {
        const items = Array.from(el.childNodes).filter(n => n.nodeType === 1 && (n as HTMLElement).nodeName.toLowerCase() === 'li');
        let idx = 1;
        for (const item of items) {
          drawAlignedText(idx + '. ' + (item.textContent || ''), isBoldRecursive(item) ? boldFont : customFont, 10, align);
          idx++;
        }
        y -= 2;
      } else if (tag === 'li') {
        drawAlignedText('• ' + (el.textContent || ''), bold ? boldFont : customFont, 10, align);
      } else if (tag === 'br') {
        // Ignore <br> for PDF layout (spacing is handled by section logic)
      } else if (tag === 'blockquote') {
        drawAlignedText(el.textContent || '', customFont, 10, align);
        y -= 4;
      } else if (tag === 'hr') {
        page.drawLine({
          start: { x: leftMargin, y: y },
          end: { x: width - rightMargin, y: y },
          thickness: 1,
        });
        y -= 10;
      } else if (tag === 'p' || tag === 'div') {
        // Render children and add a small gap after
        Array.from(el.childNodes).forEach(child => renderNode(child, align));
        y -= 6;
      } else {
        // For span and any other element, recursively render children
        Array.from(el.childNodes).forEach(child => renderNode(child, align));
      }
    }
  }

  // Parse HTML and render with structure and alignment
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const elements = Array.from(tempDiv.childNodes);
  elements.forEach(el => renderNode(el));

  // Draw the signature image if provided and landlordRoleY is found
  if (signatureImageDataUrl && landlordRoleY !== null) {
    const pngBytes = await fetch(signatureImageDataUrl).then(res => res.arrayBuffer());
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const pngDims = pngImage.scale(0.4); // scale to fit
    // Place the image a bit below the landlordRoleY line
    page.drawImage(pngImage, {
      x: width - rightMargin - pngDims.width, // right align
      y: landlordRoleY - pngDims.height - 10, // a bit below the text
      width: pngDims.width,
      height: pngDims.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const metadata = { landlordRoleY, tenantRoleY };
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'contract.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { pdfBlob: blob, metadata };
}

function fillPlaceholders(text: string, form: Record<string, string>) {
  if (!text) return '';
  // Replace all placeholders with value or 'לא נענה' in gray if missing
  return text.replace(/{{(.*?)}}/g, (_, key) => (
    form[key] !== undefined && form[key] !== ''
      ? form[key]
      : '<span style="color: #888">לא נענה</span>'
  ));
}

// Helper to render subclauses as nested list
function renderSubclauses(text: string) {
  if (!text) return '';
  // Find all subclauses (e.g., 1.1 ... 1.2 ...), even if not separated by newlines
  const subclauseRegex = /([0-9]+\.[0-9]+(\.[0-9]+)?)[ .:;\-]+([^0-9]+)/g;
  let items: string[] = [];
  let lastIndex = 0;
  let match;
  let foundAny = false;
  while ((match = subclauseRegex.exec(text)) !== null) {
    foundAny = true;
    // Add any text before the first subclause as a separate item
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index).trim();
      if (before) items.push(`<li style='margin-bottom:4px;'>${before}</li>`);
    }
    items.push(`<li style='margin-bottom:4px;'><span style='font-weight:bold;'>${match[1]}</span> ${match[3].trim()}</li>`);
    lastIndex = subclauseRegex.lastIndex;
  }
  // Add any remaining text after the last subclause
  if (foundAny && lastIndex < text.length) {
    const after = text.slice(lastIndex).trim();
    if (after) items.push(`<li style='margin-bottom:4px;'>${after}</li>`);
  }
  // If no subclauses found, fallback to splitting by newlines
  if (!foundAny) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    items = lines.map(line => `<li style='margin-bottom:4px;'>${line}</li>`);
  }
  if (items.length > 0) {
    return `<ol style='margin:0 0 0 0; padding-right:24px;'>${items.join('')}</ol>`;
  }
  return `<div style='white-space:pre-line;'>${text}</div>`;
}

// Helper to build contract content from only answered clauses
function buildContractContentFromAnswers(fields: any[], form: Record<string, string>) {
  console.log('Fields:', fields);
  let content = '';
  // Group fields by section (support both 'section' and 'סעיף')
  const sections: { [key: string]: any[] } = {};
  fields.forEach((field: any) => {
    const section = field.section || field["סעיף"] || 'ללא סעיף';
    if (!sections[section]) sections[section] = [];
    sections[section].push(field);
  });
  // Render sections in the order they appear in the fields array
  let sectionOrder: string[] = [];
  fields.forEach((field: any) => {
    const section = field.section || field["סעיף"] || 'ללא סעיף';
    if (!sectionOrder.includes(section)) sectionOrder.push(section);
  });
  // Sort sectionOrder numerically by leading number if present
  sectionOrder = sectionOrder.sort((a, b) => {
    const numA = parseInt(((a || '').match(/^\d+/) || [])[0]);
    const numB = parseInt(((b || '').match(/^\d+/) || [])[0]);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return (a || '').localeCompare((b || ''), 'he');
  });
  console.log('Section order after sorting:', sectionOrder);
  sectionOrder.forEach(section => {
    const sectionFields = sections[section];
    // Find the section title (טקסט קבוע with a number, e.g., '4. דמי שכירות ואופן תשלום')
    const titleIdx = sectionFields.findIndex(f => f["סוג שאלה"] === "טקסט קבוע" && /^\d+\.\s?/.test(f["תוכן"] || f.content || ''));
    if (titleIdx !== -1) {
      // Render the section title first
      const titleField = sectionFields[titleIdx];
      const contentValue = String(titleField["תוכן"] ?? titleField.content ?? "");
      const match = contentValue.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        content += `<div style=\"font-size:1.2em;font-weight:700;text-align:right;margin:24px 0 16px 0;padding-right:16px;\"><span>${match[1]}.</span> <span>${match[2]}</span></div>`;
      } else {
        content += `<div style=\"margin:8px 0;text-align:right;\">${contentValue}</div>`;
      }
      // Render all fields after the title, in order, except the title itself
      sectionFields.forEach((field, idx) => {
        if (idx === titleIdx) return;
        if (field["סוג שאלה"] === "טקסט קבוע") {
          const contentValue = String(field["תוכן"] ?? field.content ?? "");
          if (contentValue.trim() === 'הסכם שכירות למגורים (שכירות בלתי מוגנת)') {
            content += `<div style=\"font-size:2.5em;font-weight:800;text-align:center;margin:32px 0 24px 0;\">${contentValue}</div>`;
          } else {
            content += `<div style=\"margin:8px 0;text-align:right;\">${contentValue}</div>`;
          }
        } else if (field.name) {
          const answer = form[field.name];
          let clauseText = field['סעיף רלוונטי בחוזה'] || field.legalText || '';
          if (field.legalOptions && Array.isArray(field.legalOptions) && field.options && Array.isArray(field.options)) {
            const idx = field.options.indexOf(answer);
            if (idx !== -1 && field.legalOptions[idx]) {
              clauseText = field.legalOptions[idx];
            }
          }
          // If not answered, replace all placeholders with gray 'לא נענה' inline
          const isAnswered = form.hasOwnProperty(field.name) && form[field.name] !== undefined && form[field.name] !== '';
          let clauseToRender = clauseText;
          if (!isAnswered) {
            clauseToRender = clauseText.replace(/{{[^}]+}}/g, '<span style="color: #888">לא נענה</span>');
          } else {
            clauseToRender = fillPlaceholders(clauseText, form);
          }
          // Multi-level numbering support (render as nested list if needed)
          const lines = clauseToRender.split(/\n+/).filter(Boolean);
          lines.forEach((line: string) => {
            const mainMatch = line.match(/^(\d+)\.\s*(.*)/);
            const subMatch = line.match(/^(\d+)\.(\d+)\s*(.*)/);
            if (mainMatch && !subMatch) {
              content += `<ol style=\"padding-right:40px;\"><li><div style=\"text-align:right;${!isAnswered ? 'color:gray;' : ''}\">${mainMatch[2]}</div>`;
            } else if (subMatch) {
              content += `<ol style=\"padding-right:32px;\"><li><div style=\"text-align:right;${!isAnswered ? 'color:gray;' : ''}\">${subMatch[3]}</div></li></ol></li></ol>`;
            } else {
              content += `<div style=\"text-align:right;${!isAnswered ? 'color:gray;' : ''}\">${line}</div>`;
            }
          });
        }
      });
    } else {
      // No numbered title, render all fields in order
      sectionFields.forEach(field => {
        if (field["סוג שאלה"] === "טקסט קבוע") {
          const contentValue = String(field["תוכן"] ?? field.content ?? "");
          if (contentValue.trim() === 'הסכם שכירות למגורים (שכירות בלתי מוגנת)') {
            content += `<div style=\"font-size:2em;font-weight:bold;text-align:center;margin:32px 0 24px 0;\">${contentValue}</div>`;
          } else {
            content += `<div style=\"margin:8px 0;text-align:right;\">${contentValue}</div>`;
          }
        } else if (field.name) {
          const answer = form[field.name];
          let clauseText = field['סעיף רלוונטי בחוזה'] || field.legalText || '';
          if (field.legalOptions && Array.isArray(field.legalOptions) && field.options && Array.isArray(field.options)) {
            const idx = field.options.indexOf(answer);
            if (idx !== -1 && field.legalOptions[idx]) {
              clauseText = field.legalOptions[idx];
            }
          }
          // If not answered, replace all placeholders with gray 'לא נענה' inline
          const isAnswered = form.hasOwnProperty(field.name) && form[field.name] !== undefined && form[field.name] !== '';
          let clauseToRender = clauseText;
          if (!isAnswered) {
            clauseToRender = clauseText.replace(/{{[^}]+}}/g, '<span style="color: #888">לא נענה</span>');
          } else {
            clauseToRender = fillPlaceholders(clauseText, form);
          }
          // Multi-level numbering support (render as nested list if needed)
          const lines = clauseToRender.split(/\n+/).filter(Boolean);
          lines.forEach((line: string) => {
            const mainMatch = line.match(/^(\d+)\.\s*(.*)/);
            const subMatch = line.match(/^(\d+)\.(\d+)\s*(.*)/);
            if (mainMatch && !subMatch) {
              content += `<ol style=\"padding-right:40px;\"><li><div style=\"text-align:right;${!isAnswered ? 'color:gray;' : ''}\">${mainMatch[2]}</div>`;
            } else if (subMatch) {
              content += `<ol style=\"padding-right:32px;\"><li><div style=\"text-align:right;${!isAnswered ? 'color:gray;' : ''}\">${subMatch[3]}</div></li></ol></li></ol>`;
            } else {
              content += `<div style=\"text-align:right;${!isAnswered ? 'color:gray;' : ''}\">${line}</div>`;
            }
          });
        }
      });
    }
  });
  if (!content) {
    content = '<div style="color:gray;">לא נענו סעיפים להצגה</div>';
  }
  return content;
}

export { buildContractContentFromAnswers };

const ContractEditor: FC<ContractEditorProps> = ({ form, questions }) => {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signBeforeShare, setSignBeforeShare] = useState<null | boolean>(null);
  const [signedContent, setSignedContent] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  // Support both flat and grouped questions
  const flatQuestions = Array.isArray(questions[0]?.questions)
    ? questions.flatMap((g: any) => g.questions)
    : questions;

  // --- NEW: Merge generalClauses and dynamic questions by section and order ---
  function buildFullContractContent(generalClauses: any[], dynamicFields: any[], form: Record<string, any>) {
    // Extract contract title and introduction from dynamicFields
    const contractTitleField = dynamicFields.find(f => f.name === 'contractTitle' && f["סוג שאלה"] === "טקסט קבוע");
    const contractIntroField = dynamicFields.find(f => f.name === 'contractIntroduction' && f["סוג שאלה"] === "טקסט קבוע");
    let content = '';
    if (contractTitleField) {
      content += `<div style="font-size:2em;font-weight:bold;text-align:center;margin:32px 0 24px 0;">${contractTitleField["תוכן"]}</div>`;
    }
    if (contractIntroField) {
      content += `<div style="font-size:1.1em;text-align:right;margin:16px 0 24px 0;white-space:pre-line;">${fillPlaceholders(contractIntroField["תוכן"], form)}</div>`;
    }
    // Helper to extract all possible keys from a static clause title
    function extractKeys(title: string): string[] {
      const keys: string[] = [];
      if (!title) return keys;
      keys.push(title.trim());
      const numMatch = title.match(/^(\d+\.?)/);
      if (numMatch) keys.push(numMatch[1]);
      const nameMatch = title.match(/^\d+\.?\s*(.+)$/);
      if (nameMatch) keys.push(nameMatch[1].trim());
      return keys;
    }

    // Build a map of all possible section keys to their static clauses
    const staticSections: Record<string, {clauses: any[], title: string, idx: number}> = {};
    generalClauses.forEach((clause: any, idx: number) => {
      const keys: string[] = extractKeys(clause.title || '');
      keys.forEach(key => {
        if (!staticSections[key]) {
          staticSections[key] = {clauses: [], title: clause.title, idx};
        }
        staticSections[key].clauses.push(clause);
      });
    });

    // Group dynamic fields by section key
    const dynamicSections: Record<string, any[]> = {};
    dynamicFields.forEach((field: any) => {
      const section = (field["סעיף"] || '').trim();
      if (!dynamicSections[section]) dynamicSections[section] = [];
      dynamicSections[section].push(field);
    });

    // Get all unique section keys in the order they appear in generalClauses
    const orderedSectionKeys = Object.values(staticSections)
      .sort((a, b) => a.idx - b.idx)
      .map(s => s.title);

    // Build the contract content by section
    let renderedDynamic = new Set();

    orderedSectionKeys.forEach((sectionTitle) => {
      const sectionKeys = extractKeys(sectionTitle || '');
      const staticBlock = staticSections[sectionKeys[0]];
      // Section title
      if (sectionTitle) {
        if (sectionTitle === 'הסכם שכירות למגורים (שכירות בלתי-מוגנת)') {
          content += `<div style="font-size:2em;font-weight:bold;text-align:center;margin:32px 0 24px 0;">${sectionTitle}</div>`;
        } else {
          const numberedTitle = sectionTitle.match(/^\d+\.?/);
          if (numberedTitle) {
            content += `<div style="font-size:1.1em;text-align:right;margin:24px 0 16px 0;padding-right:16px;font-weight:600;">${sectionTitle}</div>`;
          } else {
            content += `<div style="text-align:right;margin:16px 0;font-weight:600;">${sectionTitle}</div>`;
          }
        }
      }
      // All static clauses for this section (skip the first if it's the title)
      staticBlock.clauses.forEach((clause: any, i: number) => {
        if (i === 0 && clause.title) return;
        if (clause.text) {
          content += `<div style="font-weight:400;font-size:1em;margin-top:4px;white-space:pre-line;text-align:right;">${fillPlaceholders(clause.text, form)}</div>`;
        }
      });
      // All dynamic clauses for this section (match by any key)
      sectionKeys.forEach(key => {
        (dynamicSections[key] || []).forEach((field: any) => {
          if (field["סוג שאלה"] === "טקסט קבוע") return;
          renderedDynamic.add(field);
          let clauseText = field['סעיף רלוונטי בחוזה'] || field.legalText || '';
          if (field.legalOptions && Array.isArray(field.legalOptions) && field.options && Array.isArray(field.options)) {
            const answer = form[field.name];
            const idx = field.options.indexOf(answer);
            if (idx !== -1 && field.legalOptions[idx]) {
              clauseText = field.legalOptions[idx];
            }
          }
          let isAnswered = form.hasOwnProperty(field.name) && form[field.name] !== undefined && form[field.name] !== '';
          let clauseToRender = clauseText;
          if (!isAnswered) {
            clauseToRender = clauseText.replace(/{{[^}]+}}/g, '<span style="color: #888">לא נענה</span>');
          } else {
            clauseToRender = fillPlaceholders(clauseText, form);
          }
          content += `<div style="font-weight:400;font-size:1em;margin-top:4px;white-space:pre-line;text-align:right;${!isAnswered ? 'color:gray;' : ''}">${clauseToRender}</div>`;
        });
      });
    });

    // Render any dynamic clauses that weren't matched to a static section
    Object.entries(dynamicSections).forEach(([key, fields]) => {
      fields.forEach((field: any) => {
        if (renderedDynamic.has(field)) return;
        if (field["סוג שאלה"] === "טקסט קבוע") return;
        let clauseText = field['סעיף רלוונטי בחוזה'] || field.legalText || '';
        if (field.legalOptions && Array.isArray(field.legalOptions) && field.options && Array.isArray(field.options)) {
          const answer = form[field.name];
          const idx = field.options.indexOf(answer);
          if (idx !== -1 && field.legalOptions[idx]) {
            clauseText = field.legalOptions[idx];
          }
        }
        let isAnswered = form.hasOwnProperty(field.name) && form[field.name] !== undefined && form[field.name] !== '';
        let clauseToRender = clauseText;
        if (!isAnswered) {
          clauseToRender = clauseText.replace(/{{[^}]+}}/g, '<span style="color: #888">לא נענה</span>');
        } else {
          clauseToRender = fillPlaceholders(clauseText, form);
        }
        content += `<div style="font-weight:400;font-size:1em;margin-top:4px;white-space:pre-line;text-align:right;${!isAnswered ? 'color:gray;' : ''}">${clauseToRender}</div>`;
      });
    });

    return content;
  }
  // --- END NEW ---

  const contractContent = buildFullContractContent(generalClauses, flatQuestions, form);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Strike,
      Link,
      Blockquote,
      BulletList,
      OrderedList,
      ListItem,
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: contractContent,
    editorProps: {
      attributes: {
        class: 'contract-editor-content',
        style: 'min-height: 600px; direction: rtl; text-align: right;',
      },
    },
  });

  // Helper to add signature image to the contract content
  function addLandlordSignatureWithImage(html: string, landlordName: string, signatureUrl: string) {
    if (signatureUrl) {
      // Insert the signature image under the landlord's name
      return html.replace(
        /(<span>\s*{{fullName}}\s*<\/span><br\/>\s*<span style="font-weight: bold;">)_{10,}(<\/span><br\/>\s*בעל הדירה)/,
        `<span>${landlordName}</span><br/><img src='${signatureUrl}' alt='חתימה' style='max-width:120px;max-height:60px;display:block;margin:8px 0;'/><br/><span style="font-weight: bold;">__________________</span><br/>בעל הדירה`
      );
    } else {
      // Fallback to text signature
      return html.replace(
        /(<span>\s*{{fullName}}\s*<\/span><br\/>\s*<span style="font-weight: bold;">)_{10,}(<\/span><br\/>\s*בעל הדירה)/,
        `<span>${landlordName}</span><br/><span style="font-weight: bold;">חתום</span><br/>בעל הדירה`
      );
    }
  }

  // Helper to generate PDF as Blob (for upload)
  async function generatePdfBlob(htmlContent: string, signatureImageDataUrl?: string) {
    const { pdfBlob, metadata } = await generateAndDownloadPdf(htmlContent, signatureImageDataUrl);
    const formData = new FormData();
    formData.append('file', pdfBlob, 'contract.pdf');
    formData.append('metadata', JSON.stringify(metadata));
    const res = await fetch('/api/share-pdf', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload PDF');
    const data = await res.json();
    // Extract the UUID from the returned url (e.g., /contracts/UUID.pdf)
    const match = data.url.match(/\/contracts\/(.+)\.pdf$/);
    if (match && match[1]) {
      const id = match[1];
      window.open(`/contract-preview/${id}`, '_blank');
    } else {
      alert('שגיאה ביצירת קישור שיתוף');
    }
  }

  // Shareable link handler
  async function handleShareLink() {
    if (!editor) return;
    setShowSignDialog(true);
  }

  // Handle dialog actions
  async function handleDialogAction(sign: boolean) {
    setSignBeforeShare(sign);
    if (sign) {
      setShowSignaturePad(true);
      setShowSignDialog(false);
    } else {
      setShowSignDialog(false);
      setIsSharing(true);
      try {
        if (!editor) throw new Error('Editor not ready');
        let htmlToShare = editor.getHTML();
        await generatePdfBlob(htmlToShare, signatureDataUrl);
      } catch (err) {
        alert('שגיאה ביצירת קישור שיתוף');
      } finally {
        setIsSharing(false);
      }
    }
  }

  // Handle signature pad confirm
  async function handleSignatureConfirm() {
    setShowSignaturePad(false);
    setIsSharing(true);
    try {
      if (!editor) throw new Error('Editor not ready');
      let htmlToShare = editor.getHTML();
      htmlToShare = addLandlordSignatureWithImage(htmlToShare, form.fullName || '', signatureDataUrl);
      setSignedContent(htmlToShare);
      await generatePdfBlob(htmlToShare, signatureDataUrl);
    } catch (err) {
      alert('שגיאה ביצירת קישור שיתוף');
    } finally {
      setIsSharing(false);
      setSignatureDataUrl('');
    }
  }

  return (
    <div className="tiptap-editor-wrapper flex flex-col" style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
      {/* Compact Google Docs-like Toolbar */}
      <div className="tiptap-toolbar-docs flex flex-wrap items-center gap-1 px-2 py-1 mb-2 rounded-xl shadow-md border border-gray-200 sticky top-0 z-20 min-h-0 h-auto">
        <div className="flex flex-row flex-wrap gap-1 items-center">
          {/* Undo/Redo */}
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().chain().focus().undo().run()} title="בטל">
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().chain().focus().redo().run()} title="חזור">
            <Redo2 className="w-4 h-4" />
          </button>
          <span className="mx-1 h-5 border-l border-gray-200" />
          {/* Bold/Italic/Underline/Strikethrough */}
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor?.can().chain().focus().toggleBold().run()} title="מודגש">
            <Bold className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor?.can().chain().focus().toggleItalic().run()} title="נטוי">
            <Italic className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor?.can().chain().focus().toggleUnderline().run()} title="קו תחתון">
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleStrike().run()} disabled={!editor?.can().chain().focus().toggleStrike().run()} title="קו חוצה">
            <Strikethrough className="w-4 h-4" />
          </button>
          <span className="mx-1 h-5 border-l border-gray-200" />
          {/* Lists */}
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor?.can().chain().focus().toggleBulletList().run()} title="רשימה לא מסודרת">
            <List className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor?.can().chain().focus().toggleOrderedList().run()} title="רשימה מסודרת">
            <ListOrdered className="w-4 h-4" />
          </button>
          <span className="mx-1 h-5 border-l border-gray-200" />
          {/* Blockquote/Horizontal rule */}
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().setHorizontalRule().run()} disabled={!editor?.can().chain().focus().setHorizontalRule().run()} title="קו אופקי">
            <Minus className="w-4 h-4" />
          </button>
          <span className="mx-1 h-5 border-l border-gray-200" />
          {/* Alignment */}
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().setTextAlign('right').run()} disabled={!editor?.can().chain().focus().setTextAlign('right').run()} title="יישור לימין">
            <AlignRight className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().setTextAlign('center').run()} disabled={!editor?.can().chain().focus().setTextAlign('center').run()} title="מרכז">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().setTextAlign('left').run()} disabled={!editor?.can().chain().focus().setTextAlign('left').run()} title="יישור לשמאל">
            <AlignLeft className="w-4 h-4" />
          </button>
          {/* Download PDF */}
          <button type="button" className="toolbar-btn compact toolbar-btn-green flex items-center gap-1" style={{minWidth: '90px', maxWidth: 'none', padding: '0 0.7rem'}} onClick={() => editor && generateAndDownloadPdf(editor.getHTML())} title="הורד חוזה PDF">
            <FaFilePdf className="w-4 h-4" />
            <span className="text-xs font-semibold whitespace-nowrap">הורד PDF</span>
          </button>
          {/* Share Link Button */}
          <button type="button" className="toolbar-btn compact toolbar-btn-blue flex items-center gap-1" style={{minWidth: '90px', maxWidth: 'none', padding: '0 0.7rem'}} onClick={handleShareLink} title="צור קישור שיתוף">
            <span className="text-xs font-semibold whitespace-nowrap">קישור שיתוף</span>
          </button>
        </div>
      </div>
      <div className="tiptap-docs-container rounded-xl shadow-inner p-6 border border-gray-100 flex flex-col" style={{width: '100%', maxWidth: 'none', padding: '1.5rem 0'}}>
        {editor && (
          <EditorContent editor={editor} className="tiptap" style={{width: '100%', maxWidth: 'none', padding: 0}} />
        )}
      </div>
      {/* Signature Choice Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent
          dir="rtl"
          style={{ textAlign: 'right' }}
          className="rtl-share-modal"
        >
          <DialogHeader style={{ textAlign: 'right' }}>
            <DialogTitle>האם לחתום על החוזה לפני שיתוף?</DialogTitle>
            <DialogDescription>
              תוכל להוסיף חתימה בכתב ידך תחת "בעל הדירה" לפני שיתוף החוזה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ justifyContent: 'flex-start' }}>
            <Button onClick={() => handleDialogAction(true)} disabled={isSharing}>
              חתום בכתב יד ושתף
            </Button>
            <Button variant="outline" onClick={() => handleDialogAction(false)} disabled={isSharing}>
              שתף ללא חתימה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Signature Pad Dialog */}
      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>חתום כאן</DialogTitle>
            <DialogDescription>
              צייר את חתימתך. תוכל לנקות ולנסות שוב במידת הצורך.
            </DialogDescription>
          </DialogHeader>
          <SignaturePad onEnd={setSignatureDataUrl} />
          <DialogFooter>
            <Button onClick={handleSignatureConfirm} disabled={!signatureDataUrl || isSharing}>
              אשר חתימה ושתף
            </Button>
            <Button variant="outline" onClick={() => setShowSignaturePad(false)} disabled={isSharing}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractEditor; 
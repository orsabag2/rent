"use client";
import React, { FC } from "react";
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

type ContractEditorProps = {
  form: Record<string, string>;
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
async function generateAndDownloadPdf(htmlContent: string) {
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

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'contract.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const contractTemplate = `
<h1 style="text-align:center;"><b>חוזה שכירות</b></h1>
<p>שנערך ונחתם ביום {{moveInDate}} ב- {{propertyAddress}}</p>

<p><b>בין:</b><br/>
<b>בעל הדירה</b><br/>
שם: {{fullName}}<br/>
ת.ז.: {{idNumber}}<br/>
כתובת: {{homeAddress}}</p>

<p><b>לבין השוכרים (יחד ולחוד):</b></p>
<p>שם: {{tenantName}} ת.ז.: {{tenantIdNumber}}</p>
<p>כתובת: {{tenantAddress}}</p>

<p></p><h2><b>1. מבוא</b></h2>
<p>1.1 בעל הדירה הוא הבעלים הרשום של דירה בת {{floor}} חדרים עם הצמדותיה {{parking}}, {{storage}}, {{elevator}}, ברחוב {{propertyAddress}} בעיר ________ (להלן: "הדירה").<br/>
1.2 בעל הדירה מעוניין להשכיר את הדירה לשוכר, והשוכר מעוניין לשכור אותה בשכירות בלתי מוגנת, בהתאם לתנאים ולהתחייבויות המפורטים בחוזה זה.<br/>
1.3 הצדדים מצהירים כי אין יחולו על חוזה זה הוראות חוק הגנת הדייר.</p>
<p></p><h2><b>2. הצהרות הצדדים</b></h2>
<p>2.1 בעל הדירה מצהיר:<br/>
2.1.1 לא העניק לצד שלישי זכויות נוגדות בדירה, ואין מניעה חוקית לשימוש בדירה למגורים ולחתימת חוזה זה.<br/>
2.1.2 הדירה ראויה למגורים, ריקה מכל אדם וחפץ פרט לפריטים: {{leftItems}}.<br/>
2.2 השוכר מצהיר:<br/>
2.2.1 קרא והבין את חוזה זה, בדק את הדירה ומצא אותה מתאימה למטרותיו ובמצב תקין, פרט לפגמים: {{apartmentDefects}}.<br/>
2.2.2 השוכר מאשר כי קיבל את הדירה כפי שהיא, לאחר בדיקה פיזית, ומתחייב לא לטעון בעתיד לפגמים שלא תועדו.</p>
<p></p><h2><b>3. מטרת השכירות</b></h2>
<p>השוכר ישתמש בדירה אך ורק למגורים לאורך כל תקופת השכירות. השוכר מתחייב שלא לבצע שינויים, הריסות או תוספות בדירה ללא אישור מראש ובכתב של בעל הדירה.</p>
<p></p><h2><b>4. תקופת השכירות</b></h2>
<p>4.1 תקופת השכירות תימשך {{contractDuration}} חודשים, תחל ביום {{moveInDate}} ותסתיים ביום __________.</p>
<p></p><h2><b>5. דמי שכירות</b></h2>
<p>5.1 השוכר ישלם לבעל הדירה {{monthlyRent}} ש"ח לחודש.<br/>
5.2 התשלום יבוצע ב{{preferredPaymentMethod}}. פרטי תשלום: {{paymentDetails}}.<br/>
5.3 השוכר ישלם את מלוא דמי השכירות גם אם לא עשה שימוש בדירה.<br/>
5.4 מועד התשלום יהיה בכל {{rentDueDay}} לחודש. מועד התשלום הראשון: {{firstPaymentDate}}.<br/>
5.5 השוכר לא יבצע קיזוזים מדמי השכירות ללא הסכמה מראש ובכתב מבעל הדירה.</p>
<p></p><h2><b>6. תקופת האופציה</b></h2>
<p>6.1 לשוכר זכות להאריך את השכירות ב-{{extensionOption}} חודשים נוספים. תוספת שכר דירה: {{extensionRentAddition}}.<br/>
6.2 תנאים למימוש האופציה: הודעה מראש, חידוש בטחונות: {{guarantees}}.</p>
<p></p><h2><b>7. יידוע לקראת סוף תקופת האופציה</b></h2>
<p>7.1 בעל הדירה יעדכן 60 יום מראש אם יציע חוזה חדש.<br/>
7.2 השוכר יגיב תוך 45 יום אם מעוניין בהצעה.</p>
<p></p><h2><b>8. מיסים ותשלומים שוטפים</b></h2>
<p>8.1 השוכר:<br/>
8.1.1 ישלם חשמל, מים, ארנונה, גז ווועד-בית.<br/>
8.1.2 יעביר חשבונות על שמו תוך 30 יום וימסור אסמכתא.<br/>
8.1.3 ישלם במועד, ואם לא - בעל הדירה רשאי לשלם במקומו ולדרוש החזר.<br/>
8.2 בעל הדירה:<br/>
8.2.1 ישלם מיסים, אגרות והיטלים.<br/>
8.2.2 ישלם גם תשלומים חריגים שדורש ועד הבית.</p>
<p></p><h2><b>9. תיקונים ושמירה על הדירה</b></h2>
<p>9.1 השוכר ישמור על הדירה לפי המצב בפרוטוקול.<br/>
9.2 בעל הדירה יתקן תקלות שנגרמות מבלאי סביר תוך 30 יום.<br/>
9.3 אם התקלה מונעת מגורים סבירים – יתקן תוך 3 ימים.<br/>
9.4 השוכר יתקן תקלות שנגרמו מרשלנותו.<br/>
9.5 אחריות התיקון לתכולה – בעל הדירה, אלא אם נאמר אחרת.<br/>
9.6 אם קיימים ליקויים ידועים מראש, יפורטו בנספח ב'.</p>
<p></p><h2><b>10. שינויים בדירה</b></h2>
<p>10.1 אין לבצע שינויים בדירה ללא אישור כתוב.<br/>
10.2 אם נעשו שינויים ללא אישור, בעל הדירה יחליט אם להחזיר המצב לקדמותו או להשאיר את השינויים.</p>
<p></p><h2><b>11. ביטוח דירה</b></h2>
<p>11.1 בעל הדירה יבטח את המבנה והמערכות, כולל סעיף ויתור שיבוב כלפי השוכר. ביטוח תכולה וצד ג' – באחריות השוכר.</p>
<p></p><h2><b>12. העברת זכויות שכירות</b></h2>
<p>12.1 השכירות אישית ואינה ניתנת להעברה.<br/>
12.2 ניתן להעביר לשוכר חלופי באישור בכתב של בעל הדירה, בכפוף לקיום תנאים זהים.</p>
<p></p><h2><b>13. החזרת הדירה</b></h2>
<p>13.1 בסיום השכירות – הדירה תימסר ריקה ובמצבה המקורי.<br/>
13.2 כל יום עיכוב בפינוי – פיצוי יומי בגובה פי שלוש מדמי שכירות יומיים. הפיצוי המוסכם: {{lateEvictionPenalty}} ש"ח ליום.</p>
<p></p><h2><b>14. הפרת החוזה</b></h2>
<p>14.1 יחול חוק החוזים (תרופות).<br/>
14.2 הפרות יסודיות:<br/>
14.2.1 עיכוב של מעל 7 ימים בתשלום.<br/>
14.2.2 אי פינוי הדירה במועד.<br/>
14.3 במקרה של הפרה יסודית – ניתן לבטל את החוזה לאחר התראה של 7 ימים.</p>
<p></p><h2><b>15. בטחונות</b></h2>
<p>15.1 השוכר יפקיד: {{guarantees}}.<br/>
15.2 פירוט בטחונות: {{guaranteeAmounts}}.<br/>
15.3 ערב: {{requireGuarantor}}, סוג: {{guarantorType}}, פרטים: {{guarantorDetails}}</p>
<p></p><h2><b>16. אי תחולת דיני הגנת הדייר</b></h2>
<p>16.1 הדירה אינה כפופה לחוק הגנת הדייר.<br/>
16.2 לא שולמו דמי מפתח, ולא תשולם תמורה נוספת.<br/>
16.3 שיפוצים או השקעות – לא יקנו זכויות לשוכר.</p>
<p></p><h2><b>17. כללי</b></h2>
<p>17.1 בעל הדירה רשאי למכור או לשעבד את זכויותיו, ובלבד שזכויות השוכר יישמרו. בעל הדירה יעדכן את השוכר בפרטי הרוכש.<br/>
17.2 אין לקזז חובות ללא הסכמה מראש ובכתב.<br/>
17.3 בעל הדירה רשאי להיכנס לדירה לצרכי תיקונים או הצגה, בתיאום מראש.<br/>
17.4 חוזה זה מבטל כל הסכמה קודמת, וכל שינוי בו יהיה רק בכתב ובחתימת שני הצדדים.<br/>
17.5 ויתור זמני אינו מונע תביעה עתידית.<br/>
17.6 כותרות הסעיפים הן לנוחות בלבד.</p>
<br>
<p>ולראיה באו הצדדים על החתום:</p>
<p>בעל הדירה                        השוכר/ים</p>
`;

function fillTemplate(template: string, form: Record<string, string>) {
  // Replace {{fieldName}} with form[fieldName] or a blank if not filled
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (form[key]) return form[key];
    // Try to support some legacy/alternate field names for compatibility
    const altKeys: Record<string, string> = {
      contractSignDate: form['contractSignDate'] || form['contractDay'] || '',
      contractSignCity: form['contractSignCity'] || form['contractLocation'] || '',
      idNumber: form['idNumber'] || form['landlordId'] || '',
      tenantIdNumber: form['tenantIdNumber'] || form['tenantId'] || '',
      apartmentDefects: form['apartmentDefects'] || form['defects'] || '',
    };
    if (Object.prototype.hasOwnProperty.call(altKeys, key)) return altKeys[key];
    return "________";
  });
}

const ContractEditor: FC<ContractEditorProps> = ({ form }) => {
  const filledContent = fillTemplate(contractTemplate, form);
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
    content: filledContent,
  });

  return (
    <div className="tiptap-editor-wrapper flex flex-col">
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
          {/* Headings/Paragraph */}
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor?.can().chain().focus().toggleHeading({ level: 1 }).run()} title="כותרת 1">
            <Heading1 className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor?.can().chain().focus().toggleHeading({ level: 2 }).run()} title="כותרת 2">
            <Heading2 className="w-4 h-4" />
          </button>
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().setParagraph().run()} disabled={!editor?.can().chain().focus().setParagraph().run()} title="פסקה">
            <Pilcrow className="w-4 h-4" />
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
          <button type="button" className="toolbar-btn compact" onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={!editor?.can().chain().focus().toggleBlockquote().run()} title="ציטוט">
            <Quote className="w-4 h-4" />
          </button>
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
        </div>
      </div>
      <div className="tiptap-docs-container rounded-xl shadow-inner p-6 border border-gray-100 flex flex-col" style={{width: '100%', maxWidth: 'none', padding: '1.5rem 0'}}>
        <EditorContent editor={editor} className="tiptap" style={{width: '100%', maxWidth: 'none', padding: 0}} />
      </div>
    </div>
  );
};

export default ContractEditor; 
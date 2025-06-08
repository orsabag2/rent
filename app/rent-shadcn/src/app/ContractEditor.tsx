"use client";
import React from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from "@/components/ui/button";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import IBMPlexSansHebrewRegular from "./IBMPlexSansHebrew-Regular-base64.js";
import { Bold, Italic, Heading1, Heading2, Pilcrow, List, ListOrdered, Quote, Link as LinkIcon, Undo2, Redo2, Strikethrough, Underline as UnderlineIcon, Minus, AlignRight, AlignCenter, AlignLeft } from 'lucide-react';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TextAlign from '@tiptap/extension-text-align';

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
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  let y = height - 60; // Start a bit lower for top margin
  const leftMargin = 60;
  const rightMargin = 60;
  const lineSpacing = 8;

  // Helper to wrap text to fit within maxWidth
  function wrapText(text: string, fontSize: number, maxWidth: number) {
    const words = text.split(' ');
    let lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = customFont.widthOfTextAtSize(testLine, fontSize);
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

  // Helper to draw text with alignment and wrapping
  function drawAlignedText(text: string, fontSize: number, align: string = 'right', extraY = 0, bold = false) {
    if (!text.trim()) return;
    const drawFontSize = bold ? fontSize + 1.5 : fontSize;
    const maxWidth = width - leftMargin - rightMargin;
    const lines = wrapText(text, drawFontSize, maxWidth);
    for (const line of lines) {
      let x = leftMargin;
      if (align === 'right') {
        x = width - rightMargin - customFont.widthOfTextAtSize(line, drawFontSize);
      } else if (align === 'center') {
        x = (width - customFont.widthOfTextAtSize(line, drawFontSize)) / 2;
      }
      page.drawText(line, {
        x,
        y: y + extraY,
        size: drawFontSize,
        font: customFont,
      });
      y -= drawFontSize + lineSpacing;
      extraY = 0;
    }
  }

  // Helper to find nearest alignment up the DOM tree
  function findAlign(el: Element | null): string {
    while (el) {
      const style = (el.getAttribute && el.getAttribute('style')) || '';
      if (style.includes('text-align:center')) return 'center';
      if (style.includes('text-align:left')) return 'left';
      if (style.includes('text-align:right')) return 'right';
      const dataAlign = (el.getAttribute && el.getAttribute('data-text-align')) || '';
      if (dataAlign === 'center') return 'center';
      if (dataAlign === 'left') return 'left';
      if (dataAlign === 'right') return 'right';
      el = el.parentElement;
    }
    return 'right'; // Default for Hebrew
  }

  // Parse HTML and render with structure and alignment
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const elements = Array.from(tempDiv.childNodes);

  for (const el of elements) {
    if (el.nodeType === 1) { // Element
      const tag = el.nodeName.toLowerCase();
      let text = el.textContent || '';
      const align = findAlign(el as Element);
      if (tag === 'h1') {
        drawAlignedText(text, 20, align, 0, true);
        y -= 8;
        page.drawLine({
          start: { x: leftMargin, y: y + 10 },
          end: { x: width - rightMargin, y: y + 10 },
          thickness: 1,
        });
        y -= 10;
      } else if (tag === 'h2') {
        y -= 6;
        drawAlignedText(text, 16, align, 0, true);
        y -= 4;
      } else if (tag === 'h3') {
        y -= 4;
        drawAlignedText(text, 14, align, 0, true);
      } else if (tag === 'p') {
        drawAlignedText(text, 12, align);
      } else if (tag === 'ul') {
        const items = Array.from(el.childNodes).filter(n => n.nodeType === 1 && (n as HTMLElement).nodeName.toLowerCase() === 'li');
        for (const item of items) {
          const itemText = item.textContent || '';
          const itemAlign = findAlign(item as Element) || align;
          drawAlignedText('• ' + itemText, 12, itemAlign, 0, false);
        }
        y -= 2;
      } else if (tag === 'ol') {
        const items = Array.from(el.childNodes).filter(n => n.nodeType === 1 && (n as HTMLElement).nodeName.toLowerCase() === 'li');
        let idx = 1;
        for (const item of items) {
          const itemText = item.textContent || '';
          const itemAlign = findAlign(item as Element) || align;
          drawAlignedText(idx + '. ' + itemText, 12, itemAlign, 0, false);
          idx++;
        }
        y -= 2;
      } else if (tag === 'b' || tag === 'strong') {
        drawAlignedText(text, 12, align, 0, true);
      } else if (tag === 'br') {
        y -= 10;
      } else if (tag === 'blockquote') {
        drawAlignedText(text, 12, align, 0, false);
        y -= 4;
      } else if (tag === 'hr') {
        page.drawLine({
          start: { x: leftMargin, y: y },
          end: { x: width - rightMargin, y: y },
          thickness: 1,
        });
        y -= 12;
      } else {
        drawAlignedText(text, 12, align);
      }
    } else if (el.nodeType === 3) { // Text node
      const text = el.textContent || '';
      // Use parent element's alignment for text nodes
      const parentAlign = el.parentElement ? findAlign(el.parentElement) : 'right';
      drawAlignedText(text, 12, parentAlign);
    }
    y -= 2;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'contract.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const contractTemplate = `<h1 style=\"text-align:center;\">חוזה שכירות</h1>
<p>שנערך ונחתם ב_______, ביום ___________ בחודש ___________ בשנת ___________.</p>
<p>בין</p>
<p>______________________________________, ת.ז. מס' _________________________.<br/>
מרחוב _________________________________ ב- _____________________________.<br/>
להלן לשם הקיצור: \"בעל הדירה\"<br/>
מצד אחד</p>
<p>לבין</p>
<p>1. ____________________________________, ת.ז. מס' _________________________.<br/>
2. ____________________________________, ת.ז. מס' _________________________.<br/>
שניהם 'ביחד ולחוד '<br/>
מרחוב _________________________________ ב- _____________________________.<br/>
יכונו להלן יחדיו: \"השוכר \"<br/>
מצד שני</p>
<!-- ... (rest of your contract template here, you can add more HTML as needed) ... -->`;

export default function ContractEditor() {
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
    content: contractTemplate,
  });

  return (
    <div className="tiptap-editor-wrapper">
      {/* Styled Toolbar */}
      <div className="tiptap-toolbar flex flex-wrap gap-2 p-2 mb-4 bg-gray-100 rounded-lg shadow-sm border border-gray-200">
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor?.can().chain().focus().toggleBold().run()}
          title="מודגש"
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor?.can().chain().focus().toggleItalic().run()}
          title="נטוי"
        >
          <Italic className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          disabled={!editor?.can().chain().focus().toggleUnderline().run()}
          title="קו תחתון"
        >
          <UnderlineIcon className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          disabled={!editor?.can().chain().focus().toggleStrike().run()}
          title="קו חוצה"
        >
          <Strikethrough className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!editor?.can().chain().focus().toggleHeading({ level: 1 }).run()}
          title="כותרת 1"
        >
          <Heading1 className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor?.can().chain().focus().toggleHeading({ level: 2 }).run()}
          title="כותרת 2"
        >
          <Heading2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().setParagraph().run()}
          disabled={!editor?.can().chain().focus().setParagraph().run()}
          title="פסקה"
        >
          <Pilcrow className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={!editor?.can().chain().focus().toggleBulletList().run()}
          title="רשימה לא מסודרת"
        >
          <List className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={!editor?.can().chain().focus().toggleOrderedList().run()}
          title="רשימה מסודרת"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          disabled={!editor?.can().chain().focus().toggleBlockquote().run()}
          title="ציטוט"
        >
          <Quote className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          disabled={!editor?.can().chain().focus().setHorizontalRule().run()}
          title="קו אופקי"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().chain().focus().undo().run()}
          title="בטל"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().chain().focus().redo().run()}
          title="חזור"
        >
          <Redo2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          disabled={!editor?.can().chain().focus().setTextAlign('right').run()}
          title="יישור לימין"
        >
          <AlignRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          disabled={!editor?.can().chain().focus().setTextAlign('center').run()}
          title="מרכז"
        >
          <AlignCenter className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-white border border-gray-300 shadow-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center"
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          disabled={!editor?.can().chain().focus().setTextAlign('left').run()}
          title="יישור לשמאל"
        >
          <AlignLeft className="w-5 h-5" />
        </button>
      </div>
      <EditorContent editor={editor} className="tiptap" />
      <div className="flex gap-2 mt-6">
        <Button
          onClick={() => generateAndDownloadPdf(editor?.getHTML() || "")}
          className="btn btn-primary"
        >
          הורד חוזה PDF 
        </Button>
      </div>
    </div>
  );
} 
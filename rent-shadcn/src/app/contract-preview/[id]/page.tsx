import React from "react";
import ContractPreviewClient from './ContractPreviewClient';
import { type Metadata } from 'next';

interface PageProps {
  params: { id: string };
}

export default function ContractPreviewPage({ params }: PageProps) {
  const { id } = params;
  return <ContractPreviewClient id={id} />;
}

// Remove or implement generateStaticParams if you need static generation
// export async function generateStaticParams() {
//   return [];
// } 
import React from "react";
import ContractPreviewClient from './ContractPreviewClient';

interface ContractPreviewPageProps {
  params: { id: string };
}

export default function ContractPreviewPage({ params }: ContractPreviewPageProps) {
  return <ContractPreviewClient id={params.id} />;
}

// Remove or implement generateStaticParams if you need static generation
// export async function generateStaticParams() {
//   return [];
// } 
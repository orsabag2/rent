import ContractPreviewClient from './ContractPreviewClient';

export default function Page({ params }: { params: { id: string } }) {
  return <ContractPreviewClient id={params.id} />;
}

// Remove or implement generateStaticParams if you need static generation
// export async function generateStaticParams() {
//   return [];
// } 
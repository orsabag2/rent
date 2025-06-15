import ContractPreviewClient from './ContractPreviewClient';

export default async function ContractPreviewPage(propsPromise: Promise<{ params: { id: string } }>) {
  const { params } = await propsPromise;
  const { id } = params;
  return <ContractPreviewClient id={id} />;
} 
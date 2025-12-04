import ProofDetail from '@/components/ProofDetail';

interface PageProps {
  params: Promise<{ hash: string }>;
}

export default async function ProofPage({ params }: PageProps) {
  const { hash } = await params;

  // In a real implementation, you would fetch proof data from an API
  // For now, we'll use the hash from the URL
  return <ProofDetail hash={hash} />;
}


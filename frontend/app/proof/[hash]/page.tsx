import ProofDetail from '@/components/ProofDetail';

interface PageProps {
  params: { hash: string };
}

export default function ProofPage({ params }: PageProps) {
  const { hash } = params;

  // In a real implementation, you would fetch proof data from an API
  // For now, we'll use the hash from the URL
  return <ProofDetail hash={hash} />;
}


import ProofDetail from '@/components/ProofDetail';

interface PageProps {
  params: Promise<{ hash: string }> | { hash: string };
}

export default async function ProofPage({ params }: PageProps) {
  let hash: string;
  
  try {
    // Handle both Promise and direct params (for Next.js version compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    hash = resolvedParams.hash;
    
    // Decode the hash in case it's URL-encoded
    if (hash) {
      try {
        hash = decodeURIComponent(hash);
      } catch {
        // If decode fails, use original hash
      }
    }
    
    // Validate hash exists
    if (!hash || hash.length === 0) {
      hash = 'unknown';
    }
  } catch (error) {
    console.error('Error loading proof page params:', error);
    hash = 'unknown';
  }

  // In a real implementation, you would fetch proof data from an API
  // For now, we'll use the hash from the URL
  return <ProofDetail hash={hash} />;
}


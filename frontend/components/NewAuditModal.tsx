'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';

interface NewAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (targetAddress: string, intensity: string) => Promise<void>;
}

export default function NewAuditModal({ isOpen, onClose, onDeploy }: NewAuditModalProps) {
  const toast = useToast();
  const [targetAddress, setTargetAddress] = useState('agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d');
  const [intensity, setIntensity] = useState('deep');
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    targetAddress?: string;
    intensity?: string;
  }>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTargetAddress('agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d');
      setIntensity('deep');
      setError(null);
      setValidationErrors({});
      setIsDeploying(false);
    }
  }, [isOpen]);

  // Validate input
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    
    if (!targetAddress || targetAddress.trim().length === 0) {
      errors.targetAddress = 'Target address is required';
    } else if (targetAddress.trim().length < 10) {
      errors.targetAddress = 'Target address is too short';
    }
    
    if (!intensity || !['quick', 'deep'].includes(intensity)) {
      errors.intensity = 'Invalid intensity value';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setIsDeploying(true);
    try {
      await onDeploy(targetAddress.trim(), intensity);
      // onDeploy handles success notification, just close modal
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy audit';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    if (!isDeploying) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 w-full max-w-md shadow-2xl modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Deploy Security Swarm</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Deployment failed</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="targetAddress" className="block text-sm font-medium mb-2 text-gray-300">
              Target Address / Agent Endpoint
            </label>
            <input
              id="targetAddress"
              type="text"
              value={targetAddress}
              onChange={(e) => {
                setTargetAddress(e.target.value);
                if (validationErrors.targetAddress) {
                  setValidationErrors((prev) => ({ ...prev, targetAddress: undefined }));
                }
              }}
              placeholder="agent1q..."
              className={`w-full px-4 py-2 bg-black border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors duration-200 mono text-sm ${
                validationErrors.targetAddress
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-[#27272a] focus:border-gray-600'
              }`}
              disabled={isDeploying}
              required
            />
            {validationErrors.targetAddress && (
              <p className="mt-1 text-xs text-red-400">{validationErrors.targetAddress}</p>
            )}
          </div>

          <div>
            <label htmlFor="intensity" className="block text-sm font-medium mb-2 text-gray-300">
              Intensity
            </label>
            <select
              id="intensity"
              value={intensity}
              onChange={(e) => {
                setIntensity(e.target.value);
                if (validationErrors.intensity) {
                  setValidationErrors((prev) => ({ ...prev, intensity: undefined }));
                }
              }}
              disabled={isDeploying}
              className={`w-full px-4 py-2 bg-black border rounded-lg text-white focus:outline-none transition-colors duration-200 ${
                validationErrors.intensity
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-[#27272a] focus:border-gray-600'
              }`}
            >
              <option value="quick">Quick Scan (ASI-Mini)</option>
              <option value="deep">Deep Probe (ASI-Agentic)</option>
            </select>
            {validationErrors.intensity && (
              <p className="mt-1 text-xs text-red-400">{validationErrors.intensity}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {intensity === 'quick'
                ? 'Fast vulnerability scan using ASI-Mini'
                : 'Comprehensive deep analysis using ASI-Agentic'}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeploying}
              className="flex-1 px-4 py-3 bg-[#09090b] border border-[#27272a] text-white rounded-lg font-medium hover:bg-[#18181b] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeploying}
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeploying ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Deploying...</span>
                </>
              ) : (
                'Deploy Swarm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






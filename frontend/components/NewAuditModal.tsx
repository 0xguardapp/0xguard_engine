'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { useAccount } from 'wagmi';
import { CreateAuditRequest, CreateAuditResponse } from '@/types';

interface NewAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (targetAddress: string, intensity: string) => Promise<void>;
  onCreate?: (audit: CreateAuditResponse) => Promise<void>; // New callback for creating audit
}

export default function NewAuditModal({ isOpen, onClose, onDeploy, onCreate }: NewAuditModalProps) {
  const toast = useToast();
  const { address } = useAccount();
  const [mode, setMode] = useState<'create' | 'deploy'>('create'); // Toggle between create and deploy modes
  
  // Create audit form fields
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [priority, setPriority] = useState('');
  
  // Deploy audit form fields
  const [targetAddress, setTargetAddress] = useState('agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d');
  const [intensity, setIntensity] = useState('deep');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    projectName?: string;
    targetUrl?: string;
    targetAddress?: string;
    intensity?: string;
  }>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setProjectName('');
      setDescription('');
      setTargetUrl('');
      setTags('');
      setDifficulty('');
      setPriority('');
      setTargetAddress('agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d');
      setIntensity('deep');
      setMode('create');
      setError(null);
      setValidationErrors({});
      setIsCreating(false);
      setIsDeploying(false);
    }
  }, [isOpen]);

  // Validate create audit form
  const validateCreateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    
    if (!projectName || projectName.trim().length === 0) {
      errors.projectName = 'Project name is required';
    }
    
    if (!targetUrl || targetUrl.trim().length === 0) {
      errors.targetUrl = 'Target URL/Repo is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate deploy audit form
  const validateDeployForm = (): boolean => {
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

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateCreateForm()) {
      return;
    }

    if (!address) {
      setError('Wallet not connected. Please connect your wallet first.');
      toast.error('Wallet not connected');
      return;
    }

    setIsCreating(true);
    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      const request: CreateAuditRequest = {
        name: projectName.trim(),
        description: description.trim() || undefined,
        target: targetUrl.trim(),
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        difficulty: difficulty || undefined,
        priority: priority || undefined,
        wallet: address,
      };

      const response = await fetch('/api/create-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create audit');
      }

      if (onCreate) {
        await onCreate(data);
      }
      
      toast.success('Audit created successfully!');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create audit';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeployAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateDeployForm()) {
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
    if (!isDeploying && !isCreating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 w-full max-w-md shadow-2xl modal-enter max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">
              {mode === 'create' ? 'Create New Audit' : 'Deploy Security Swarm'}
            </h2>
            <div className="flex gap-1 bg-[#18181b] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  mode === 'create' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setMode('deploy')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  mode === 'deploy' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Deploy
              </button>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Close"
            disabled={isDeploying || isCreating}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreateAudit} className="space-y-4">
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
                <p className="text-sm text-red-400 font-medium">{mode === 'create' ? 'Creation failed' : 'Deployment failed'}</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Create Audit Form */}
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium mb-2 text-gray-300">
              Project Name *
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (validationErrors.projectName) {
                  setValidationErrors((prev) => ({ ...prev, projectName: undefined }));
                }
              }}
              placeholder="My Security Audit Project"
              className={`w-full px-4 py-2 bg-black border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors duration-200 text-sm ${
                validationErrors.projectName
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-[#27272a] focus:border-gray-600'
              }`}
              disabled={isCreating}
              required
            />
            {validationErrors.projectName && (
              <p className="mt-1 text-xs text-red-400">{validationErrors.projectName}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the audit project..."
              rows={3}
              className="w-full px-4 py-2 bg-black border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors duration-200 text-sm resize-none"
              disabled={isCreating}
            />
          </div>

          <div>
            <label htmlFor="targetUrl" className="block text-sm font-medium mb-2 text-gray-300">
              Target URL / Repo *
            </label>
            <input
              id="targetUrl"
              type="text"
              value={targetUrl}
              onChange={(e) => {
                setTargetUrl(e.target.value);
                if (validationErrors.targetUrl) {
                  setValidationErrors((prev) => ({ ...prev, targetUrl: undefined }));
                }
              }}
              placeholder="https://github.com/org/repo or https://example.com"
              className={`w-full px-4 py-2 bg-black border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors duration-200 text-sm ${
                validationErrors.targetUrl
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-[#27272a] focus:border-gray-600'
              }`}
              disabled={isCreating}
              required
            />
            {validationErrors.targetUrl && (
              <p className="mt-1 text-xs text-red-400">{validationErrors.targetUrl}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tags" className="block text-sm font-medium mb-2 text-gray-300">
                Tags
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="security, web3, smart-contract"
                className="w-full px-4 py-2 bg-black border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors duration-200 text-sm"
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated</p>
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium mb-2 text-gray-300">
                Difficulty / Priority
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2 bg-black border border-[#27272a] rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors duration-200 text-sm"
                disabled={isCreating}
              >
                <option value="">Select...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {address && (
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
              <p className="text-sm mono text-gray-300 font-mono">{address}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 px-4 py-3 bg-[#09090b] border border-[#27272a] text-white rounded-lg font-medium hover:bg-[#18181b] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !address}
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                'Create Audit'
              )}
            </button>
          </div>
        </form>
        ) : (
          <form onSubmit={handleDeployAudit} className="space-y-4">
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

          {/* Deploy Audit Form (existing) */}
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
        )}
      </div>
    </div>
  );
}






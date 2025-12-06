'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Image from 'next/image';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/useToast';
import { Audit } from '@/types';
import Link from 'next/link';

interface UserSettings {
  notifications: boolean;
  autoRefresh: boolean;
}

export default function ProfilePage() {
  const { isConnected, address, getTruncatedAddress } = useWallet();
  const toast = useToast();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    notifications: true,
    autoRefresh: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Fetch audits
  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const response = await fetch('/api/audits');
        const data = await response.json();
        setAudits(data.audits || []);
      } catch (error) {
        console.error('Error fetching audits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, []);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoading(true);
        setSettingsError(null);
        
        const userAddress = address || 'default';
        const response = await fetch(`/api/settings?address=${encodeURIComponent(userAddress)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch settings: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setSettingsError(error instanceof Error ? error.message : 'Failed to load settings');
        // Use defaults on error
        setSettings({
          notifications: true,
          autoRefresh: true,
        });
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [address]);

  // Handle settings change
  const handleSettingChange = async (setting: keyof UserSettings, value: boolean) => {
    const newSettings = {
      ...settings,
      [setting]: value,
    };
    
    // Optimistic update
    setSettings(newSettings);
    setSettingsError(null);
    
    try {
      setSettingsSaving(true);
      
      const userAddress = address || 'default';
      const response = await fetch(`/api/settings?address=${encodeURIComponent(userAddress)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [setting]: value,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save settings' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to save settings`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        toast.success(`Settings saved successfully`);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Revert optimistic update
      setSettings(settings);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setSettingsError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSettingsSaving(false);
    }
  };

  const stats = {
    totalAudits: audits.length,
    activeAudits: audits.filter(a => a.status === 'active').length,
    completedAudits: audits.filter(a => a.status === 'completed').length,
    totalVulnerabilities: audits.reduce((sum, a) => sum + (a.vulnerabilityCount || 0), 0),
    averageRiskScore: audits.length > 0
      ? Math.round(audits.reduce((sum, a) => sum + (a.riskScore || 0), 0) / audits.length)
      : 0,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: Audit['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <AuthGuard>
      <Header />
      <DashboardLayout>
        <div className="space-y-6">
          {/* User Information Section */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
            <div className="flex items-start gap-6">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#27272a]">
                <Image
                  src="/a10449a3-3a09-4686-bee2-96074c95c47d.png"
                  alt="Profile"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight mb-2">User Profile</h1>
                {isConnected && address ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full pulse-green"></div>
                      <span className="text-sm text-gray-400">Connected</span>
                    </div>
                    <p className="text-sm mono text-gray-300">{address}</p>
                    <p className="text-xs text-gray-500">{getTruncatedAddress()}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Not connected. Connect your wallet to get started.</p>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4">
              <div className="text-2xl font-semibold mb-1">{stats.totalAudits}</div>
              <div className="text-xs text-gray-400">Total Audits</div>
            </div>
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4">
              <div className="text-2xl font-semibold mb-1">{stats.activeAudits}</div>
              <div className="text-xs text-gray-400">Active Audits</div>
            </div>
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4">
              <div className="text-2xl font-semibold mb-1">{stats.completedAudits}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4">
              <div className="text-2xl font-semibold mb-1">{stats.totalVulnerabilities}</div>
              <div className="text-xs text-gray-400">Vulnerabilities Found</div>
            </div>
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4">
              <div className="text-2xl font-semibold mb-1">{stats.averageRiskScore}</div>
              <div className="text-xs text-gray-400">Avg Risk Score</div>
            </div>
          </div>

          {/* Audit History Section */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 tracking-tight">Audit History</h2>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading audit history...</div>
            ) : audits.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No audits yet. Start your first audit to get started.</div>
            ) : (
              <div className="space-y-3">
                {audits.map((audit) => (
                  <Link
                    key={audit.id}
                    href={`/audit/${encodeURIComponent(audit.targetAddress)}`}
                    className="block bg-black border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium mono text-gray-300 truncate">
                            {audit.targetAddress.slice(0, 10)}...{audit.targetAddress.slice(-8)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(audit.status)}`}>
                            {audit.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Created: {formatDate(audit.createdAt)}</span>
                          {audit.vulnerabilityCount !== undefined && (
                            <span>{audit.vulnerabilityCount} vulnerabilities</span>
                          )}
                          {audit.riskScore !== undefined && (
                            <span>Risk: {audit.riskScore}</span>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 tracking-tight">Settings</h2>
            
            {/* Settings Error Message */}
            {settingsError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
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
                  <p className="text-sm text-red-400 font-medium">Settings error</p>
                  <p className="text-xs text-red-300 mt-1">{settingsError}</p>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                  <div className="text-gray-400">Loading settings...</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Notifications Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">Notifications</div>
                    <div className="text-xs text-gray-400">Receive alerts for audit updates</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.notifications}
                      onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                      disabled={settingsSaving || settingsLoading}
                    />
                    <div className={`w-11 h-6 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white ${
                      settingsSaving || settingsLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}></div>
                  </label>
                </div>
                
                {/* Auto-refresh Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">Auto-refresh</div>
                    <div className="text-xs text-gray-400">Automatically update audit status</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.autoRefresh}
                      onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                      disabled={settingsSaving || settingsLoading}
                    />
                    <div className={`w-11 h-6 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white ${
                      settingsSaving || settingsLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}></div>
                  </label>
                </div>
                
                {/* Saving Indicator */}
                {settingsSaving && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-[#27272a]">
                    <div className="w-3 h-3 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                    <span>Saving settings...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

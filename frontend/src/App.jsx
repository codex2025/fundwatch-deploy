import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AnomalyDashboard from './pages/AnomalyDashboard';
import VisualIntelligence from './pages/VisualIntelligence';
import AgencyDrilldown from './pages/AgencyDrilldown';
import InvestigationPanel from './pages/InvestigationPanel';
import AuditLog from './pages/AuditLog';
import LiveMode from './live/LiveMode';
import DatasetUploadModal from './components/DatasetUploadModal';
import { fetchStats, fetchAnomalies, fetchAgencies } from './api/client';
import { Shield, Sparkles, Activity, Layers, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  async function loadAppData() {
    setLoading(true);
    try {
      const [statsData, anomaliesData, agenciesData] = await Promise.all([
        fetchStats(),
        fetchAnomalies(),
        fetchAgencies()
      ]);
      setStats(statsData);
      setAnomalies(anomaliesData || []);
      setAgencies(agenciesData || []);

      if (anomaliesData && anomaliesData.length > 0) {
        setSelectedAnomaly(anomaliesData[0]);
      }
    } catch (err) {
      console.error("Failed to load app data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppData();
  }, []);

  const handleSelectAnomalyForDrilldown = (anomaly) => {
    setSelectedAnomaly(anomaly);
    setActiveTab('drilldown');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInvestigateAnomaly = (anomaly) => {
    setSelectedAnomaly(anomaly);
    setActiveTab('investigation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadSuccess = (data) => {
    loadAppData();
    setActiveTab('visuals');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Dataset Upload Modal */}
      <DatasetUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-gradient-soft border border-sky-500/30 flex items-center justify-center mx-auto animate-spin shadow-glow">
              <Activity className="w-6 h-6 text-sky-300" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              Initializing FundWatch MPLADS Spending Intelligence Engine...
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Running 4-dimension math engine (S1: MAD Z-score, S2: IQR, S3: P2P, S4: Velocity)
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <AnomalyDashboard
                anomalies={anomalies}
                stats={stats}
                onSelectAnomaly={handleSelectAnomalyForDrilldown}
                onInvestigate={handleInvestigateAnomaly}
              />
            )}

            {activeTab === 'visuals' && (
              <VisualIntelligence
                onSelectAnomaly={handleSelectAnomalyForDrilldown}
              />
            )}

            {activeTab === 'drilldown' && (
              <AgencyDrilldown
                selectedAgency={selectedAnomaly || anomalies[0]}
                onBack={() => setActiveTab('dashboard')}
                onInvestigate={handleInvestigateAnomaly}
              />
            )}

            {activeTab === 'investigation' && (
              <InvestigationPanel
                anomaly={selectedAnomaly || anomalies[0]}
                allAnomalies={anomalies}
                onSelectAnomaly={(anom) => setSelectedAnomaly(anom)}
                onBackToDrilldown={() => setActiveTab('drilldown')}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLog />
            )}

            {activeTab === 'live' && (
              <LiveMode />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="font-display font-semibold text-slate-400">FUNDWATCH</span>
            <span>— Explainable MPLADS Spending-Anomaly Detection System</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="glass-pill px-2.5 py-1 text-slate-400">MoSPI Problem Statement 10</span>
            <span className="glass-pill px-2.5 py-1 text-emerald-400/90 font-mono">MAD Z-Score &amp; IQR Fenced</span>
            <span className="glass-pill px-2.5 py-1 text-sky-400 font-mono">100% Grounded AI Copilot</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

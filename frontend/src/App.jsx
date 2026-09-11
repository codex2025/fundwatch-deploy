import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceProvider } from './app/WorkspaceContext';
import AppShell from './components/layout/AppShell';
import PageContainer from './components/layout/PageContainer';
import { Panel, LoadingState, EmptyState } from './components/ui';

import Overview from './pages/Overview';
import Anomalies from './pages/Anomalies';
import Investigation from './pages/Investigation';
import Agencies from './pages/Agencies';
import Spending from './pages/Spending';
import Geography from './pages/Geography';
import DataQuality from './pages/DataQuality';
import Dataset from './pages/Dataset';

// Deep analysis pulls in the heavier Recharts surfaces; Live Mode pulls in the
// Firebase auth tree. Both are split out so the default route stays light.
const DeepAnalysis = lazy(() => import('./pages/DeepAnalysis'));
const LiveMode = lazy(() => import('./live/LiveMode'));

function RouteFallback() {
  return (
    <PageContainer>
      <Panel><LoadingState label="Loading view" rows={6} /></Panel>
    </PageContainer>
  );
}

function NotFound() {
  return (
    <PageContainer>
      <Panel>
        <EmptyState
          title="This page does not exist"
          description="The address you followed is not part of the FundWatch workspace."
          action={<a href="/" className="btn-accent btn-sm">Return to the command centre</a>}
        />
      </Panel>
    </PageContainer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="anomalies" element={<Anomalies />} />
              <Route path="investigation" element={<Investigation />} />
              <Route path="investigation/:anomalyId" element={<Investigation />} />
              <Route path="agencies" element={<Agencies />} />
              {/* Agency deep-link resolves through the investigation workspace. */}
              <Route path="agencies/:agencyId" element={<Agencies />} />
              <Route path="spending" element={<Spending />} />
              <Route path="geography" element={<Geography />} />
              <Route path="data-quality" element={<DataQuality />} />
              <Route path="deep-analysis" element={<DeepAnalysis />} />
              <Route path="dataset" element={<Dataset />} />

              {/* Live Mode owns its own auth provider and role routing. */}
              <Route path="live" element={<LiveMode />} />
              <Route path="cases" element={<LiveMode initialTab="queue" />} />
              <Route path="audit" element={<LiveMode initialTab="audit" />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </WorkspaceProvider>
    </BrowserRouter>
  );
}

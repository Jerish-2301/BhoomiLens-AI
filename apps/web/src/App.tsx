import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DocumentUploader } from './components/documents/DocumentUploader';
import { AuthPage } from './components/auth/AuthPage';
import { useAuth } from './lib/auth';
import { Leaf } from 'lucide-react';
import { 
  DocumentsPage, 
  LandRecordsPage, 
  GisIntelligencePage, 
  AiIntelligencePage, 
  VerificationPage, 
  AnalyticsPage, 
  AuditPage, 
  AdminPage 
} from './pages';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './lib/firebase';

function Dashboard() {
  const [stats, setStats] = useState({
    documents: 0,
    extracted: 0,
    verification: 0,
    conflicts: 0,
  });

  useEffect(() => {
    // 1. Documents Processed
    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => {
      setStats(s => ({ ...s, documents: snap.size }));
    });

    // 2. Successfully Extracted
    const unsubRecords = onSnapshot(collection(db, 'landRecords'), (snap) => {
      setStats(s => ({ ...s, extracted: snap.size }));
    });

    // 3. Verification Pending
    const qVerification = query(collection(db, 'verificationTasks'), where('status', '==', 'PENDING'));
    const unsubVerification = onSnapshot(qVerification, (snap) => {
      setStats(s => ({ ...s, verification: snap.size }));
    });

    // 4. High-Risk Conflicts (mocked for now as we don't have this collection active)
    const unsubConflicts = onSnapshot(collection(db, 'recordConflicts'), (snap) => {
      setStats(s => ({ ...s, conflicts: snap.size }));
    });

    return () => {
      unsubDocs();
      unsubRecords();
      unsubVerification();
      unsubConflicts();
    };
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative">
      <div className="absolute -top-4 right-0 rotate-3 z-10 hidden sm:block">
        <div className="bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded shadow-lg flex items-center gap-1 border-2 border-amber-600">
           ✨ SMART INDIA HACKATHON PROTOTYPE
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">From Legacy Records to Trusted Land Intelligence.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Documents Processed', value: stats.documents, trend: 'All time', alert: false },
          { label: 'Successfully Extracted', value: stats.extracted, trend: 'All time', alert: false },
          { label: 'Verification Pending', value: stats.verification, trend: 'Requires attention', alert: stats.verification > 0 },
          { label: 'High-Risk Conflicts', value: stats.conflicts, trend: 'Requires attention', alert: stats.conflicts > 0 },
        ].map((stat, i) => (
          <div key={i} className="glass-card-hover p-6 flex flex-col gap-2 group">
            <div className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {stat.label}
              {stat.alert && <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>}
            </div>
            <div className="text-4xl font-bold font-heading gradient-text group-hover:scale-105 transition-transform duration-300 origin-left">{stat.value}</div>
            <div className={`text-xs mt-1 ${stat.alert ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <DocumentUploader />
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg animate-pulse">
        <Leaf className="w-8 h-8" />
      </div>
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;

  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/records" element={<LandRecordsPage />} />
          <Route path="/gis" element={<GisIntelligencePage />} />
          <Route path="/ai" element={<AiIntelligencePage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;

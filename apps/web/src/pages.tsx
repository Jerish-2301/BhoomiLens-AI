import { FileText, Bot, CheckCircle, Activity, ShieldAlert, Settings, FileSearch, Search, Filter, Eye, X, Download, AlertTriangle, Target, Sparkles, FileSearch2, ClipboardList, Trash2, MapPin } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, where, deleteDoc, doc as firestoreDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { db, storage } from './lib/firebase';
import { openDocument, hasBlobUrl, getBlobUrl } from './lib/documentStore';
import { useAuth } from './lib/auth';
import './components/gis/GisIntelligence.css';
export { GisIntelligencePage } from './components/gis/GisIntelligencePage';

export function PageHeader({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <h1 className="text-4xl font-heading font-bold gradient-text pb-1">{title}</h1>
        <p className="text-lg text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

export function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-3 bg-secondary/10 min-h-[400px]">
      <div className="text-muted-foreground">
        <p className="text-lg font-medium">{title} Module is under active development.</p>
        <p className="text-sm max-w-md mt-2">This view will connect to the NestJS API endpoints constructed in Phase 6.</p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Digitized Document View Modal
// ----------------------------------------------------------------------
function DigitizedViewModal({
  doc,
  onClose,
}: {
  doc: any | null;
  onClose: () => void;
}) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;

    if (doc.path) {
      // 1. Try local blob first (same-session upload — always works offline)
      const localBlob = getBlobUrl(doc.id);
      if (localBlob) {
        setDownloadUrl(localBlob);
        setPreviewError(null);
        return;
      }

      // 2. Try Firebase Storage (only works with real credentials)
      const storageRef = ref(storage, doc.path);
      getDownloadURL(storageRef)
        .then(url => {
          setDownloadUrl(url);
          setPreviewError(null);
        })
        .catch(err => {
          console.warn('Storage preview unavailable:', err?.code || err?.message);
          // Don't show technical errors — just note that preview needs same-session upload
          setPreviewError('storage-unavailable');
        });
    } else {
      setPreviewError('storage-unavailable');
    }
  }, [doc]);

  if (!doc) return null;
  const d = doc.digitized;
  const isImage = doc.mimeType?.startsWith('image/') || doc.originalName?.match(/\.(jpg|jpeg|png|gif)$/i);
  const isPdf = doc.mimeType === 'application/pdf' || doc.originalName?.match(/\.pdf$/i);
  const canPreview = !!downloadUrl && (isImage || isPdf);
  const confidence = d?.confidence ? Math.round(d.confidence * 100) : null;

  const fields = [
    { label: 'Document Type', value: d?.documentType, icon: '📋' },
    { label: 'Survey / Khasra No.', value: d?.surveyNumber, icon: '🔢' },
    { label: 'Owner / Khatedar', value: d?.ownerName, icon: '👤' },
    { label: 'Area', value: d?.area ? `${d.area} ${d.areaUnit ?? ''}`.trim() : undefined, icon: '📐' },
    { label: 'Village / Mouza', value: d?.village, icon: '🏘️' },
    { label: 'Taluka / Tehsil', value: d?.taluka, icon: '🗺️' },
    { label: 'District', value: d?.district, icon: '📍' },
    { label: 'State', value: d?.state, icon: '🏛️' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-6xl max-h-[92vh] glass-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-primary/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">{doc.originalName}</p>
              <p className="text-xs text-muted-foreground">AI Digitized Land Record</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {confidence !== null && (
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                confidence >= 85 ? 'bg-primary/10 text-primary border-primary/20' :
                confidence >= 60 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                'bg-destructive/10 text-destructive border-destructive/20'
              }`}>
                {confidence}% Confidence
              </div>
            )}
            {downloadUrl && (
              <a href={downloadUrl} download={doc.originalName} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90">
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left: Original Document */}
          <div className="border-b lg:border-b-0 lg:border-r flex flex-col">
            <div className="px-5 py-3 border-b bg-secondary/20 flex items-center gap-2 text-sm font-semibold">
              <FileSearch2 className="w-4 h-4 text-muted-foreground" />
              Original Document
            </div>
            <div className="flex-1 flex items-center justify-center bg-secondary/5 p-4 min-h-[400px]">
              {canPreview && isImage && (
                <img src={downloadUrl!} alt={doc.originalName}
                  className="max-w-full max-h-[40vh] lg:max-h-[60vh] object-contain rounded-lg shadow" />
              )}
              {canPreview && isPdf && (
                <iframe src={downloadUrl!} title={doc.originalName} className="w-full h-[40vh] lg:h-[60vh] border-0 rounded-lg" />
              )}
              {!canPreview && (
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-muted-foreground opacity-60" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">{doc.originalName}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Original preview is only available in the same session it was uploaded.
                  </p>
                  <div className="bg-secondary/40 rounded-xl p-4 text-left text-sm space-y-2">
                    <p className="font-medium text-foreground flex items-center gap-2">📋 How to view it:</p>
                    <ol className="text-muted-foreground space-y-1 pl-4 list-decimal text-xs">
                      <li>Go to <strong>Dashboard</strong></li>
                      <li>Drop the same file into the uploader</li>
                      <li>Click <strong>Digitize</strong> — OCR will run again</li>
                      <li>Come back here and click <strong>✨ View Digitized</strong></li>
                    </ol>
                  </div>
                  
                  {previewError === 'storage-unavailable' && (
                    <div className="mt-4 bg-secondary/50 border border-border rounded-xl p-3 text-xs text-left text-muted-foreground flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">ℹ️</span>
                      <span>Preview is only available for files uploaded in this browser session. Re-upload the file from the Dashboard to preview it here.</span>
                    </div>
                  )}

                  <a href="/"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Go to Dashboard →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right: Digitized Fields */}
          <div className="flex flex-col">
            <div className="px-5 py-3 border-b bg-primary/5 flex items-center gap-2 text-sm font-semibold text-primary">
              <ClipboardList className="w-4 h-4" />
              Digitized Record
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {!d ? (
                <div className="flex flex-col items-center justify-center h-full py-10 px-5 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">Not Digitized Yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This document was uploaded before the AI digitization feature was added.
                    </p>
                  </div>
                  <div className="w-full bg-secondary/40 rounded-xl p-4 text-left text-sm space-y-3">
                    <p className="font-semibold text-foreground">✅ To digitize this document:</p>
                    <ol className="text-muted-foreground text-xs space-y-2 pl-4 list-decimal">
                      <li>Close this dialog</li>
                      <li>Go to the <strong className="text-foreground">Dashboard</strong></li>
                      <li>Drag &amp; drop the same file into the upload area</li>
                      <li>Click <strong className="text-foreground">"Digitize Documents"</strong></li>
                      <li>AI OCR will extract all fields automatically</li>
                    </ol>
                  </div>
                  <a href="/"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Sparkles className="w-4 h-4" />
                    Go to Dashboard to Digitize
                  </a>
                </div>
              ) : (
                <>
                  {fields.map(({ label, value, icon }) => (
                    <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                        <p className={`text-sm font-semibold mt-0.5 ${
                          value ? 'text-foreground' : 'text-muted-foreground italic'
                        }`}>
                          {value || 'Not detected'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Raw OCR Text */}
                  {d.rawText && (
                    <details className="mt-4">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-2 py-2">
                        <FileText className="w-3.5 h-3.5" />
                        View raw OCR text
                      </summary>
                      <pre className="mt-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {d.rawText}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 1. Document Management
// ----------------------------------------------------------------------
export function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [digitizedDoc, setDigitizedDoc] = useState<any | null>(null);

  async function handleDeleteDocument(docId: string, docName: string) {
    if (!window.confirm(`Delete "${docName}"?\n\nThis will permanently remove the document record. This action cannot be undone.`)) return;
    try {
      await deleteDoc(firestoreDoc(db, 'documents', docId));
    } catch (e) {
      console.error(e);
      alert('Failed to delete document. Please try again.');
    }
  }

  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = docs.filter(d => {
    const matchesSearch = d.originalName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function formatDate(ts: any) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  }

  function formatSize(bytes: number) {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function getFileIcon(mimeType: string) {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    return '📁';
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Document Management" description="View and manage uploaded land record files." icon={FileText} />

      {/* Digitized View Modal */}
      {digitizedDoc && (
        <DigitizedViewModal doc={digitizedDoc} onClose={() => setDigitizedDoc(null)} />
      )}

      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-1">
        <div className="relative w-full sm:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search documents by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card/50 backdrop-blur-sm border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-secondary/50 rounded-md">
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none flex items-center gap-2 pl-10 pr-10 py-2.5 bg-card/50 backdrop-blur-sm border rounded-xl text-sm font-medium hover:bg-card transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="UPLOADED">Uploaded</option>
              <option value="PROCESSING">Processing</option>
              <option value="DIGITIZED">Digitized</option>
              <option value="VERIFIED">Verified</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground opacity-50 text-xs">▼</div>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton Loader
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-5 bg-card border rounded-xl shadow-sm animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-secondary rounded" />
                  <div className="h-3 w-24 bg-secondary/50 rounded" />
                </div>
              </div>
              <div className="hidden md:block h-3 w-24 bg-secondary rounded" />
              <div className="hidden md:block h-3 w-16 bg-secondary rounded" />
              <div className="h-6 w-24 bg-secondary rounded-full" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center p-16 bg-card border border-dashed rounded-2xl shadow-sm text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <FileSearch2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold font-heading text-foreground">No documents found</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              {docs.length === 0 
                ? "Your document library is empty. Head over to the Dashboard to upload and digitize some land records."
                : "No documents match your current search and filter criteria."}
            </p>
          </div>
        ) : (
          // List Items
          filtered.map((doc, i) => {
            const isDigitized = doc.status === 'DIGITIZED';
            const isProcessing = doc.status === 'PROCESSING';
            const isVerified = doc.status === 'VERIFIED';
            
            return (
              <div 
                key={doc.id} 
                className="group flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Info Section */}
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-secondary/50 shrink-0 shadow-inner
                    ${isDigitized ? 'bg-primary/5 border border-primary/10' : ''}`}
                  >
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-sm" title={doc.originalName}>
                      {doc.originalName}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">{doc.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata & Actions Section */}
                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 ml-16 md:ml-0">
                  <div className="hidden lg:block text-sm font-medium text-muted-foreground w-20 text-right">
                    {formatSize(doc.size)}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="w-32 flex justify-start md:justify-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors tracking-wide ${
                      isVerified   ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      doc.status === 'UPLOADED'   ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      isProcessing ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                      isDigitized  ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.1)]' :
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {isProcessing && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping absolute" />}
                      {isProcessing && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 relative" />}
                      
                      {isDigitized && <Sparkles className="w-3 h-3 text-primary" />}
                      {isVerified && <CheckCircle className="w-3 h-3" />}
                      
                      {doc.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:-translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <button
                      onClick={() => setDigitizedDoc(doc)}
                      title={doc.digitized ? 'View Digitized Record' : 'View Document'}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm ${
                        isDigitized
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {isDigitized ? <><Sparkles className="w-3.5 h-3.5" /> View</> : <><Eye className="w-3.5 h-3.5" /> View</>}
                    </button>
                    {hasBlobUrl(doc.id) && (
                      <button
                        onClick={() => openDocument(doc.id)}
                        title="Download original"
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.originalName)}
                      title="Delete document"
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



// ----------------------------------------------------------------------
// 2. Land Records Explorer
// ----------------------------------------------------------------------
export function LandRecordsPage() {
  const [records, setRecords] = useState<{ id: string; surveyNumber: string; owner: string; area: string; village: string; district: string; confidence: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function handleDeleteRecord(recordId: string, surveyNumber: string) {
    if (!window.confirm(`Delete Survey ${surveyNumber || recordId}?\n\nThis will permanently remove this land record. This action cannot be undone.`)) return;
    try {
      await deleteDoc(firestoreDoc(db, 'landRecords', recordId));
    } catch (e) {
      console.error(e);
      alert('Failed to delete land record. Please try again.');
    }
  }

  useEffect(() => {
    const q = query(collection(db, 'landRecords'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Land Records Explorer" description="Search and filter verified land records." icon={FileSearch} />
      
      {loading ? (
        <div className="p-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center bg-secondary/10">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground text-sm">Loading land records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center bg-secondary/10">
          <p className="text-muted-foreground text-sm">No land records found. Records will appear here once data is imported.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {records.map((rec) => (
            <div key={rec.id} className="bg-card border rounded-xl p-5 hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -z-10 group-hover:bg-primary/10 transition-colors" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-heading font-bold text-foreground">Survey {rec.surveyNumber || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground">{rec.owner || 'Unknown Owner'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xs">
                  {rec.confidence ? Math.round(rec.confidence * 100) : 0}%
                </div>
              </div>
              <div className="space-y-2 mt-4 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-medium">{rec.area || '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Village</span>
                  <span className="font-medium">{rec.village || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">District</span>
                  {rec.district ? (
                    <button
                      onClick={() => navigate(`/gis?district=${encodeURIComponent(rec.district)}`)}
                      title={`View ${rec.district} on map`}
                      className="font-medium text-primary hover:underline flex items-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      {rec.district}
                    </button>
                  ) : (
                    <span className="font-medium">—</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button className="flex-1 py-2 bg-secondary/50 hover:bg-primary hover:text-primary-foreground text-foreground rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  onClick={() => handleDeleteRecord(rec.id, rec.surveyNumber)}
                  title="Delete land record"
                  className="px-3 py-2 bg-destructive/10 hover:bg-destructive hover:text-white text-destructive rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// GisIntelligencePage is now in components/gis/GisIntelligencePage.tsx



// ----------------------------------------------------------------------
// 4. AI Intelligence
// ----------------------------------------------------------------------
export function AiIntelligencePage() {
  const [globalConfidence, setGlobalConfidence] = useState<number | null>(null);
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [landRecords, setLandRecords] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    // Documents
    const unsubDocs = onSnapshot(
      query(collection(db, 'documents'), orderBy('createdAt', 'desc')),
      (snap) => {
        setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setDocsLoading(false);
      },
      (err) => { console.error(err); setDocsLoading(false); }
    );

    // Land records for confidence
    const unsubRecords = onSnapshot(collection(db, 'landRecords'), (snap) => {
      const recs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLandRecords(recs);
      if (snap.empty) { setGlobalConfidence(null); return; }
      let total = 0;
      snap.forEach(doc => { total += (doc.data().confidence || 0); });
      setGlobalConfidence(total / snap.size);
    }, (error) => console.error(error));

    // Low confidence fields
    const qLow = query(collection(db, 'extractedFields'), where('confidence', '<', 0.7));
    const unsubFields = onSnapshot(qLow, (snap) => {
      setLowConfidenceCount(snap.size);
    }, (error) => console.error(error));

    return () => { unsubDocs(); unsubRecords(); unsubFields(); };
  }, []);

  // --- Derived stats from real data ---
  const totalDocs = documents.length;
  const digitizedDocs = documents.filter(d => d.status === 'DIGITIZED' || d.status === 'VERIFIED').length;
  const processingDocs = documents.filter(d => d.status === 'PROCESSING').length;
  const uploadedDocs = documents.filter(d => d.status === 'UPLOADED').length;
  const verifiedDocs = documents.filter(d => d.status === 'VERIFIED').length;

  // Uploads per day for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const uploadsPerDay = last7Days.map(day => {
    const dayStr = day.toDateString();
    const count = documents.filter(doc => {
      if (!doc.createdAt) return false;
      const ts = doc.createdAt.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
      return ts.toDateString() === dayStr;
    }).length;
    return { label: day.toLocaleDateString('en-US', { weekday: 'short' }), count };
  });
  const maxUploads = Math.max(...uploadsPerDay.map(d => d.count), 1);

  // Confidence buckets from land records
  const confidenceBuckets = [
    { label: '90–100%', min: 0.9, max: 1.01, color: 'bg-emerald-500' },
    { label: '75–89%', min: 0.75, max: 0.9, color: 'bg-primary' },
    { label: '60–74%', min: 0.6, max: 0.75, color: 'bg-amber-500' },
    { label: '< 60%',  min: 0,   max: 0.6,  color: 'bg-destructive' },
  ].map(b => ({
    ...b,
    count: landRecords.filter(r => (r.confidence ?? 0) >= b.min && (r.confidence ?? 0) < b.max).length,
  }));
  const maxBucket = Math.max(...confidenceBuckets.map(b => b.count), 1);

  // Status breakdown bars
  const statusBreakdown = [
    { label: 'Verified',    count: verifiedDocs,    color: 'bg-emerald-500' },
    { label: 'Digitized',   count: digitizedDocs - verifiedDocs, color: 'bg-primary' },
    { label: 'Processing',  count: processingDocs,  color: 'bg-amber-500' },
    { label: 'Uploaded',    count: uploadedDocs,    color: 'bg-blue-500' },
  ].filter(s => s.count > 0);
  const maxStatus = Math.max(...statusBreakdown.map(s => s.count), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="AI Intelligence & OCR Diagnostics" description="Model performance, extraction confidence, and real-time inference metrics." icon={Bot} />

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: totalDocs, icon: '📄', color: 'text-foreground' },
          { label: 'Digitized / Verified', value: digitizedDocs, icon: '✨', color: 'text-primary' },
          { label: 'Avg. Confidence', value: globalConfidence !== null ? `${Math.round(globalConfidence * 100)}%` : '—', icon: '🎯', color: 'text-emerald-500' },
          { label: 'Low Confidence', value: lowConfidenceCount, icon: '⚠️', color: 'text-destructive' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-1">
            <span className="text-2xl">{stat.icon}</span>
            <span className={`text-3xl font-heading font-bold ${stat.color}`}>{docsLoading ? '…' : stat.value}</span>
            <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Uploads per Day — Bar Chart */}
        <div className="bg-card border rounded-xl p-6 shadow-sm col-span-2">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Uploads per Day
          </h3>
          <p className="text-xs text-muted-foreground mb-5">Documents uploaded in the last 7 days</p>

          {docsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : totalDocs === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <FileText className="w-10 h-10 opacity-30" />
              <p>No documents uploaded yet.</p>
              <p className="text-xs">Upload a land record from the Dashboard to see data here.</p>
            </div>
          ) : (
            <>
              {/* Y-axis labels + bars */}
              <div className="flex gap-3 items-end h-48 border-b border-l border-border/50 pl-1 pb-1">
                {uploadsPerDay.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border text-foreground text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-10">
                      {day.count} upload{day.count !== 1 ? 's' : ''}
                    </div>
                    {/* Count label */}
                    {day.count > 0 && (
                      <span className="text-[10px] font-bold text-primary">{day.count}</span>
                    )}
                    {/* Bar */}
                    <div
                      className="w-full rounded-t-md bg-primary/80 group-hover:bg-primary transition-all duration-500 ease-out"
                      style={{ height: `${(day.count / maxUploads) * 160}px`, minHeight: day.count > 0 ? '4px' : '0px' }}
                    />
                  </div>
                ))}
              </div>
              {/* X labels */}
              <div className="flex gap-3 mt-2 pl-1">
                {uploadsPerDay.map((day, i) => (
                  <div key={i} className="flex-1 text-center text-xs text-muted-foreground font-medium">{day.label}</div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right column: stats cards */}
        <div className="space-y-4">
          {/* Confidence Score */}
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Global Confidence Score</h3>
            <div className="text-4xl font-heading font-bold text-primary">
              {globalConfidence !== null ? `${Math.round(globalConfidence * 100)}%` : '—'}
            </div>
            {globalConfidence !== null && (
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
                  style={{ width: `${Math.round(globalConfidence * 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {globalConfidence !== null ? 'Live average across all processed records' : 'No data yet'}
            </p>
          </div>

          {/* Low Confidence */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-medium text-destructive flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" /> Low Confidence Fields
            </h3>
            <div className="text-3xl font-heading font-bold text-foreground">{lowConfidenceCount}</div>
            <p className="text-xs text-muted-foreground mt-2">Routed to Verification Queue</p>
          </div>
        </div>
      </div>

      {/* Second row: Confidence Distribution + Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Confidence Distribution */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Confidence Distribution
          </h3>
          <p className="text-xs text-muted-foreground mb-5">Land records grouped by OCR confidence score</p>
          {landRecords.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No land records digitized yet.</div>
          ) : (
            <div className="space-y-3">
              {confidenceBuckets.map(bucket => (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{bucket.label}</span>
                  <div className="flex-1 h-5 bg-secondary/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bucket.color} transition-all duration-700`}
                      style={{ width: `${(bucket.count / maxBucket) * 100}%`, minWidth: bucket.count > 0 ? '6px' : '0' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-6 shrink-0">{bucket.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Document Status Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mb-5">Current pipeline status of all uploaded records</p>
          {totalDocs === 0 ? (
            <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No documents uploaded yet.</div>
          ) : (
            <div className="space-y-3">
              {statusBreakdown.map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{s.label}</span>
                  <div className="flex-1 h-5 bg-secondary/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all duration-700`}
                      style={{ width: `${(s.count / maxStatus) * 100}%`, minWidth: s.count > 0 ? '6px' : '0' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-6 shrink-0">{s.count}</span>
                </div>
              ))}
              {/* Total pill */}
              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>Total</span>
                <span className="font-bold text-foreground">{totalDocs} document{totalDocs !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. Verification Queue
// ----------------------------------------------------------------------
export function VerificationPage() {
  const [verificationTasks, setVerificationTasks] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [allLandRecords, setAllLandRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [editedFields, setEditedFields] = useState<any>({});

  // Load all three collections in real-time
  useEffect(() => {
    let docsLoaded = false, recordsLoaded = false, tasksLoaded = false;
    const checkDone = () => { if (docsLoaded && recordsLoaded && tasksLoaded) setLoading(false); };

    const unsubTasks = onSnapshot(
      query(collection(db, 'verificationTasks'), where('status', '==', 'PENDING')),
      (snap) => { setVerificationTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); tasksLoaded = true; checkDone(); },
      () => { tasksLoaded = true; checkDone(); }
    );
    const unsubDocs = onSnapshot(
      collection(db, 'documents'),
      (snap) => { setAllDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); docsLoaded = true; checkDone(); },
      () => { docsLoaded = true; checkDone(); }
    );
    const unsubRecords = onSnapshot(
      collection(db, 'landRecords'),
      (snap) => { setAllLandRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); recordsLoaded = true; checkDone(); },
      () => { recordsLoaded = true; checkDone(); }
    );
    return () => { unsubTasks(); unsubDocs(); unsubRecords(); };
  }, []);

  // Build unified queue: formal verificationTasks + any DIGITIZED doc whose land record has confidence < 0.9 or has errors
  const queue: any[] = (() => {
    const taskDocIds = new Set(verificationTasks.map((t: any) => t.documentId));

    // Formal tasks
    const formalItems = verificationTasks.map((task: any) => {
      const doc = allDocuments.find(d => d.id === task.documentId);
      const record = allLandRecords.find(r => r.documentId === task.documentId);
      return { ...task, _doc: doc, _record: record, _source: 'task' };
    });

    // DIGITIZED or VERIFICATION_REQUIRED docs not already in a task
    const inlineItems = allDocuments
      .filter(doc =>
        (doc.status === 'DIGITIZED' || doc.status === 'VERIFICATION_REQUIRED') &&
        !taskDocIds.has(doc.id)
      )
      .map(doc => {
        const record = allLandRecords.find(r => r.documentId === doc.id);
        if (!record) return null;
        const validObj = (() => { try { return record.validationResult ? JSON.parse(record.validationResult) : null; } catch { return null; } })();
        const hasErrors = validObj?.errors?.length > 0;
        const lowConf = (record.confidence ?? 1) < 0.9;
        if (!hasErrors && !lowConf) return null;
        return {
          id: `inline-${doc.id}`,
          documentId: doc.id,
          status: 'PENDING',
          createdAt: doc.createdAt,
          _doc: doc,
          _record: record,
          _source: 'inline',
        };
      })
      .filter(Boolean);

    return [...formalItems, ...inlineItems];
  })();

  // When activeTask changes, resolve blob URL from documentStore or firebase storage
  useEffect(() => {
    if (!activeTask) { setActiveDocUrl(null); setActiveRecord(null); return; }
    const docId = activeTask.documentId;

    // Try local blob first (same session upload) — getBlobUrl is already imported at top of file
    const local = getBlobUrl(docId);
    if (local) { setActiveDocUrl(local); }

    // Set the active record from already-loaded data
    const record = allLandRecords.find(r => r.documentId === docId) ?? activeTask._record ?? null;
    setActiveRecord(record ? { ...record } : null);

    // If no local blob, try Firebase Storage
    if (!local) {
      const doc = allDocuments.find(d => d.id === docId);
      if (doc?.path) {
        import('firebase/storage').then(({ getDownloadURL, ref }) => {
          getDownloadURL(ref(storage, doc.path)).then(setActiveDocUrl).catch(() => setActiveDocUrl(null));
        });
      } else {
        setActiveDocUrl(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTask]);

  function formatDate(ts: any) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  const handleApprove = async () => {
    if (!activeRecord || !activeTask) return;
    try {
      const { doc, updateDoc, addDoc, serverTimestamp } = await import('firebase/firestore');

      // Update land record
      const recordRef = doc(db, 'landRecords', activeRecord.id);
      await updateDoc(recordRef, { ...editedFields, status: 'VERIFIED', updatedAt: new Date() });

      // Update verification task (only if it's a real task, not inline)
      if (activeTask._source === 'task') {
        const taskRef = doc(db, 'verificationTasks', activeTask.id);
        await updateDoc(taskRef, { status: 'COMPLETED', updatedAt: new Date() });
      }

      // Update document status
      const docRef = doc(db, 'documents', activeTask.documentId);
      await updateDoc(docRef, { status: 'VERIFIED', updatedAt: new Date() });

      setActiveTask(null);
      setActiveRecord(null);
      setEditedFields({});
    } catch (e) {
      console.error(e);
      alert('Failed to approve record. Check console for details.');
    }
  };

  const handleReject = async () => {
    if (!activeTask) return;
    if (!window.confirm('Reject this record? The document will be marked as rejected.')) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      if (activeTask._source === 'task') {
        await updateDoc(doc(db, 'verificationTasks', activeTask.id), { status: 'REJECTED', updatedAt: new Date() });
      }
      await updateDoc(doc(db, 'documents', activeTask.documentId), { status: 'REJECTED', updatedAt: new Date() });
      setActiveTask(null);
      setActiveRecord(null);
      setEditedFields({});
    } catch (e) {
      console.error(e);
      alert('Failed to reject record.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Verification Queue" description="Human-in-the-loop review for low confidence OCR extractions." icon={CheckCircle} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Task List */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-[680px]">
          <div className="p-4 border-b bg-secondary/30 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-sm">Pending Review ({queue.length})</h3>
            {queue.length > 0 && (
              <span className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium animate-pulse">
                {queue.length} need review
              </span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {loading ? (
              <div className="p-8 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Loading tasks…
              </div>
            ) : queue.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">All clear!</p>
                  <p className="text-xs text-muted-foreground mt-1">No pending verifications.</p>
                </div>
                <div className="w-full bg-secondary/30 rounded-xl p-3 text-left">
                  <p className="text-xs font-semibold text-foreground mb-2">How tasks appear here:</p>
                  <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                    <li>Upload a land record from the <strong className="text-foreground">Dashboard</strong></li>
                    <li>AI runs OCR and extracts fields</li>
                    <li>Low confidence results appear here for review</li>
                  </ol>
                </div>
              </div>
            ) : (
              queue.map((task: any, i: number) => {
                const rec = task._record;
                const conf = rec?.confidence;
                const confPct = conf !== undefined ? Math.round(conf * 100) : null;
                const isActive = activeTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => { setActiveTask(task); setEditedFields({}); }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 border-primary/40 shadow-sm'
                        : 'hover:bg-secondary/30 border-border/50 hover:border-border'
                    }`}
                  >
                    {/* Doc name */}
                    <p className="text-sm font-semibold text-foreground truncate mb-1" title={task._doc?.originalName}>
                      {task._doc?.originalName ?? `Document ${task.documentId.slice(0, 8)}…`}
                    </p>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] text-muted-foreground">{formatDate(task.createdAt)}</span>
                      {confPct !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                          confPct >= 85 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : confPct >= 65 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                        }`}>{confPct}% conf</span>
                      )}
                    </div>
                    {rec && (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {rec.surveyNumber && <p>📋 Survey {rec.surveyNumber}</p>}
                        {rec.ownerName && <p>👤 {rec.ownerName}</p>}
                        {rec.district && <p>📍 {rec.village ? `${rec.village}, ` : ''}{rec.district}</p>}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] text-amber-600 font-medium">Needs human review</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col - Review Workspace */}
        <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm h-[680px] flex flex-col overflow-hidden">
          {!activeTask ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground opacity-30" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Select a task to review</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {queue.length > 0
                    ? `${queue.length} task${queue.length !== 1 ? 's' : ''} waiting — click one to open the review workspace.`
                    : 'No pending tasks. Upload a document from the Dashboard to get started.'}
                </p>
              </div>
              {queue.length === 0 && (
                <a href="/" className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                  <Sparkles className="w-4 h-4" /> Go to Dashboard
                </a>
              )}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              {/* Document Preview */}
              <div className="border-r flex flex-col bg-secondary/10">
                <div className="px-4 py-3 border-b bg-secondary/20 flex items-center gap-2 text-xs font-semibold text-muted-foreground flex-shrink-0">
                  <FileSearch2 className="w-3.5 h-3.5" /> Original Document
                </div>
                <div className="flex-1 flex items-center justify-center overflow-hidden bg-white/30">
                  {activeDocUrl ? (
                    (() => {
                      const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(activeTask._doc?.originalName ?? '');
                      return isImg
                        ? <img src={activeDocUrl} alt="Document" className="max-w-full max-h-full object-contain p-2" />
                        : <iframe src={activeDocUrl} className="w-full h-full border-0" title="Document Preview" />;
                    })()
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-14 h-14 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-7 h-7 text-muted-foreground opacity-40" />
                      </div>
                      <p className="text-xs font-medium text-foreground">{activeTask._doc?.originalName ?? 'Document'}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 max-w-[160px] mx-auto">
                        Preview available only for files uploaded in this browser session.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Field Editor */}
              <div className="flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b bg-primary/5 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" /> Extracted Fields
                  </span>
                  {activeRecord?.confidence !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      activeRecord.confidence >= 0.85 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : activeRecord.confidence >= 0.65 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {Math.round(activeRecord.confidence * 100)}% Confidence
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeRecord ? (
                    <>
                      {[
                        { key: 'surveyNumber', label: 'Survey / Khasra No.', icon: '🔢' },
                        { key: 'ownerName',    label: 'Owner / Khatedar',    icon: '👤' },
                        { key: 'area',         label: 'Area',                icon: '📐' },
                        { key: 'village',      label: 'Village / Mouza',     icon: '🏘️' },
                        { key: 'district',     label: 'District',            icon: '📍' },
                        { key: 'state',        label: 'State',               icon: '🏛️' },
                      ].map(({ key, label, icon }) => {
                        const orig = String(activeRecord[key] ?? '');
                        const val  = editedFields[key] !== undefined ? editedFields[key] : orig;
                        const edited = val !== orig;
                        return (
                          <div key={key} className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              {icon} {label}
                              {edited && <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Edited</span>}
                            </label>
                            <input
                              type="text"
                              value={val}
                              onChange={e => setEditedFields((p: any) => ({ ...p, [key]: e.target.value }))}
                              placeholder={`Enter ${label}`}
                              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 transition-all ${
                                edited
                                  ? 'border-amber-400 bg-amber-500/5 focus:ring-amber-300'
                                  : 'bg-card border-border focus:border-primary focus:ring-primary/20'
                              }`}
                            />
                          </div>
                        );
                      })}

                      {/* Validation result */}
                      {activeRecord.validationResult && (() => {
                        try {
                          const vr = JSON.parse(activeRecord.validationResult);
                          return (
                            <div className="space-y-2 mt-1">
                              {vr.errors?.length > 0 && (
                                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-xs">
                                  <strong className="text-destructive flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" /> Errors</strong>
                                  <ul className="list-disc pl-4 space-y-0.5 text-destructive/80">{vr.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
                                </div>
                              )}
                              {vr.warnings?.length > 0 && (
                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs">
                                  <strong className="text-amber-600 flex items-center gap-1 mb-1">⚠️ Warnings</strong>
                                  <ul className="list-disc pl-4 space-y-0.5 text-amber-600/80">{vr.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
                                </div>
                              )}
                              {vr.passedRules?.length > 0 && (
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs">
                                  <strong className="text-emerald-600 flex items-center gap-1 mb-1">✅ Passed Rules</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {vr.passedRules.map((r: string) => <span key={r} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded text-[10px] font-mono">{r}</span>)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading record data…
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t bg-secondary/10 flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => { setActiveTask(null); setActiveRecord(null); setEditedFields({}); }}
                    className="px-3 py-2 border rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    ← Back
                  </button>
                  <div className="flex gap-2">
                    <button onClick={handleReject} className="px-3 py-2 border border-destructive/30 text-destructive rounded-lg text-xs hover:bg-destructive/5 transition-colors">
                      Reject
                    </button>
                    <button onClick={handleApprove} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve & Verify
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  // ── Raw data ──────────────────────────────────────────────────────────
  const [documents,    setDocuments]    = useState<any[]>([]);
  const [landRecords,  setLandRecords]  = useState<any[]>([]);
  const [verTasks,     setVerTasks]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    let d = false, r = false, t = false;
    const done = () => { if (d && r && t) setLoading(false); };

    const u1 = onSnapshot(collection(db, 'documents'),
      s => { setDocuments(s.docs.map(x => ({ id: x.id, ...x.data() }))); d = true; done(); },
      () => { d = true; done(); });
    const u2 = onSnapshot(collection(db, 'landRecords'),
      s => { setLandRecords(s.docs.map(x => ({ id: x.id, ...x.data() }))); r = true; done(); },
      () => { r = true; done(); });
    const u3 = onSnapshot(collection(db, 'verificationTasks'),
      s => { setVerTasks(s.docs.map(x => ({ id: x.id, ...x.data() }))); t = true; done(); },
      () => { t = true; done(); });

    return () => { u1(); u2(); u3(); };
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────
  const totalDocs       = documents.length;
  const uploadedDocs    = documents.filter(d => d.status === 'UPLOADED').length;
  const processingDocs  = documents.filter(d => d.status === 'PROCESSING').length;
  const digitizedDocs   = documents.filter(d => d.status === 'DIGITIZED').length;
  const verifiedDocs    = documents.filter(d => d.status === 'VERIFIED').length;
  const rejectedDocs    = documents.filter(d => d.status === 'REJECTED').length;
  const pendingReviews  = verTasks.filter(t => t.status === 'PENDING').length;

  const avgConfidence = landRecords.length > 0
    ? landRecords.reduce((sum, r) => sum + (r.confidence ?? 0), 0) / landRecords.length
    : null;

  // Processing success rate
  const processedDocs = documents.filter(d => d.status !== 'UPLOADED' && d.status !== 'PROCESSING').length;
  const successRate   = processedDocs > 0 ? Math.round((verifiedDocs / processedDocs) * 100) : null;

  // ── 14-day upload bar chart ───────────────────────────────────────────
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const uploadsPerDay = last14Days.map(day => {
    const count = documents.filter(doc => {
      if (!doc.createdAt) return false;
      const ts = doc.createdAt.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
      return ts.toDateString() === day.toDateString();
    }).length;
    return {
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      date: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count,
    };
  });
  const maxUploads = Math.max(...uploadsPerDay.map(d => d.count), 1);

  // ── District distribution (top 6) ────────────────────────────────────
  const districtMap: Record<string, number> = {};
  for (const rec of landRecords) {
    const d = (rec.district || 'Unknown').trim();
    districtMap[d] = (districtMap[d] ?? 0) + 1;
  }
  const topDistricts = Object.entries(districtMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxDistrict = Math.max(...topDistricts.map(d => d[1]), 1);

  // ── Confidence distribution buckets ──────────────────────────────────
  const confBuckets = [
    { label: '90–100%', min: 0.9,  max: 1.01, color: 'bg-emerald-500' },
    { label: '75–89%',  min: 0.75, max: 0.9,  color: 'bg-primary'     },
    { label: '60–74%',  min: 0.6,  max: 0.75, color: 'bg-amber-500'   },
    { label: '< 60%',   min: 0,    max: 0.6,  color: 'bg-destructive'  },
  ].map(b => ({
    ...b,
    count: landRecords.filter(r => (r.confidence ?? 0) >= b.min && (r.confidence ?? 0) < b.max).length,
  }));
  const maxConf = Math.max(...confBuckets.map(b => b.count), 1);

  // ── Status donut segments (pure CSS trick) ────────────────────────────
  const statusSegments = [
    { label: 'Verified',   count: verifiedDocs,   color: '#10b981' },
    { label: 'Digitized',  count: digitizedDocs,  color: 'hsl(var(--primary))' },
    { label: 'Processing', count: processingDocs, color: '#f59e0b' },
    { label: 'Uploaded',   count: uploadedDocs,   color: '#3b82f6' },
    { label: 'Rejected',   count: rejectedDocs,   color: '#ef4444' },
  ].filter(s => s.count > 0);

  // Build conic-gradient for donut
  let conicParts: string[] = [];
  let cumulative = 0;
  const total = statusSegments.reduce((sum, s) => sum + s.count, 0);
  for (const seg of statusSegments) {
    const pct = total > 0 ? (seg.count / total) * 100 : 0;
    conicParts.push(`${seg.color} ${cumulative}% ${cumulative + pct}%`);
    cumulative += pct;
  }
  const donutStyle: React.CSSProperties = total > 0
    ? { background: `conic-gradient(${conicParts.join(', ')})` }
    : { background: 'hsl(var(--secondary))' };

  // KPI delta helpers
  function kpiTrend(value: number | null, suffix = '') {
    if (value === null) return <span className="text-muted-foreground text-sm">—</span>;
    return <span className="text-2xl font-heading font-bold">{value}{suffix}</span>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="System Analytics"
        description="Real-time insights into document processing, OCR performance, and verification throughput."
        icon={Activity}
      />

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Documents',
            value: loading ? null : totalDocs,
            sub: 'All time ingested',
            icon: '📄',
            color: 'text-foreground',
          },
          {
            label: 'OCR Processed',
            value: loading ? null : processedDocs,
            sub: totalDocs > 0 ? `${Math.round((processedDocs / totalDocs) * 100)}% of uploads` : '—',
            icon: '🤖',
            color: 'text-primary',
          },
          {
            label: 'Verified Records',
            value: loading ? null : verifiedDocs,
            sub: landRecords.length > 0 ? `${Math.round((verifiedDocs / landRecords.length) * 100)}% of records` : '—',
            icon: '✅',
            color: 'text-emerald-600',
          },
          {
            label: 'Avg. Confidence',
            value: loading ? null : avgConfidence !== null ? Math.round(avgConfidence * 100) : null,
            sub: avgConfidence !== null ? (avgConfidence >= 0.85 ? 'High accuracy' : avgConfidence >= 0.65 ? 'Moderate — review needed' : 'Low — flag for re-scan') : 'No records yet',
            icon: '🎯',
            color: avgConfidence !== null ? (avgConfidence >= 0.85 ? 'text-emerald-600' : avgConfidence >= 0.65 ? 'text-amber-600' : 'text-destructive') : 'text-muted-foreground',
            suffix: avgConfidence !== null ? '%' : '',
          },
        ].map(stat => (
          <div key={stat.label} className="bg-card border rounded-xl p-5 shadow-sm flex flex-col gap-1.5 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <span className="text-2xl">{stat.icon}</span>
            {loading ? (
              <div className="h-8 w-20 bg-secondary animate-pulse rounded-lg" />
            ) : (
              <span className={`text-3xl font-heading font-bold ${stat.color}`}>
                {stat.value !== null && stat.value !== undefined ? `${stat.value}${stat.suffix ?? ''}` : '—'}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-medium leading-tight">{stat.label}</span>
            <span className="text-[11px] text-muted-foreground/70">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* ── 14-Day Upload Chart + Status Donut ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upload bar chart — 14 days */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Upload Activity
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Documents uploaded in the last 14 days</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-heading font-bold text-primary">{totalDocs}</p>
              <p className="text-[10px] text-muted-foreground">total</p>
            </div>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center mt-4">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : totalDocs === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm mt-4">
              <Activity className="w-10 h-10 opacity-20" />
              <p>No uploads yet. Head to the Dashboard to upload land records.</p>
            </div>
          ) : (
            <div className="mt-5">
              {/* Bars */}
              <div className="flex gap-1 items-end h-44 border-b border-l border-border/50 pl-1 pb-1">
                {uploadsPerDay.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 relative group">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border text-foreground text-[10px] rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-10">
                      <p className="font-semibold">{day.date}</p>
                      <p>{day.count} upload{day.count !== 1 ? 's' : ''}</p>
                    </div>
                    {day.count > 0 && (
                      <span className="text-[8px] font-bold text-primary leading-none">{day.count}</span>
                    )}
                    <div
                      className="w-full rounded-t-md bg-primary/75 hover:bg-primary transition-all duration-500 ease-out min-h-0"
                      style={{ height: `${(day.count / maxUploads) * 148}px`, minHeight: day.count > 0 ? '4px' : '0px' }}
                    />
                  </div>
                ))}
              </div>
              {/* X labels — show every other one on mobile */}
              <div className="flex gap-1 mt-1.5 pl-1">
                {uploadsPerDay.map((day, i) => (
                  <div key={i} className={`flex-1 text-center text-[9px] text-muted-foreground ${i % 2 === 0 ? '' : 'opacity-0 md:opacity-100'}`}>
                    {day.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Donut */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-base mb-1 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Pipeline Status
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Document status breakdown</p>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : total === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <Target className="w-8 h-8 opacity-20" />
              <p className="text-xs">No documents yet</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Donut */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <div
                  className="w-36 h-36 rounded-full transition-all duration-700"
                  style={donutStyle}
                />
                {/* Hole */}
                <div className="absolute w-24 h-24 rounded-full bg-card flex flex-col items-center justify-center">
                  <span className="text-2xl font-heading font-bold text-foreground">{total}</span>
                  <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">total</span>
                </div>
              </div>
              {/* Legend */}
              <div className="w-full space-y-1.5">
                {statusSegments.map(seg => (
                  <div key={seg.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                      <span className="text-muted-foreground">{seg.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">{seg.count}</span>
                      <span className="text-muted-foreground/60">({Math.round((seg.count / total) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confidence Distribution + District Map ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Confidence distribution */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> OCR Confidence Distribution
          </h3>
          <p className="text-xs text-muted-foreground mb-5">Land records grouped by extraction confidence</p>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : landRecords.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 opacity-20" />
              <p className="text-xs">No records digitized yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {confBuckets.map(bucket => (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{bucket.label}</span>
                  <div className="flex-1 h-6 bg-secondary/40 rounded-full overflow-hidden relative group cursor-default">
                    <div
                      className={`h-full rounded-full ${bucket.color} transition-all duration-700`}
                      style={{ width: `${(bucket.count / maxConf) * 100}%`, minWidth: bucket.count > 0 ? '6px' : '0' }}
                    />
                    {bucket.count > 0 && (
                      <span className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold text-white mix-blend-luminosity pointer-events-none">
                        {bucket.count} record{bucket.count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-foreground w-6 shrink-0">{bucket.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Avg confidence progress bar */}
          {avgConfidence !== null && (
            <div className="mt-5 pt-4 border-t">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-muted-foreground font-medium">Overall Average</span>
                <span className={`font-bold ${avgConfidence >= 0.85 ? 'text-emerald-600' : avgConfidence >= 0.65 ? 'text-amber-600' : 'text-destructive'}`}>
                  {Math.round(avgConfidence * 100)}%
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${avgConfidence >= 0.85 ? 'bg-emerald-500' : avgConfidence >= 0.65 ? 'bg-amber-500' : 'bg-destructive'}`}
                  style={{ width: `${Math.round(avgConfidence * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* District distribution */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Top Districts
          </h3>
          <p className="text-xs text-muted-foreground mb-5">Land records by district (top 6)</p>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : topDistricts.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <MapPin className="w-8 h-8 opacity-20" />
              <p className="text-xs">No district data yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topDistricts.map(([district, count], i) => (
                <div key={district} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-muted-foreground w-4 text-right shrink-0">#{i + 1}</span>
                  <span className="text-xs text-foreground font-medium w-24 shrink-0 truncate" title={district}>{district}</span>
                  <div className="flex-1 h-5 bg-secondary/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 hover:bg-primary transition-all duration-700"
                      style={{ width: `${(count / maxDistrict) * 100}%`, minWidth: '4px' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-6 shrink-0 text-right">{count}</span>
                </div>
              ))}
              {Object.keys(districtMap).length > 6 && (
                <p className="text-[10px] text-muted-foreground text-right pt-1">
                  +{Object.keys(districtMap).length - 6} more districts
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Processing Pipeline Funnel ────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base mb-1 flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-primary" /> Processing Pipeline
        </h3>
        <p className="text-xs text-muted-foreground mb-6">Document flow from upload to verified record</p>

        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex items-center gap-0 overflow-x-auto">
            {[
              { label: 'Uploaded',    count: totalDocs,      color: 'bg-blue-500/15 border-blue-500/30 text-blue-600', dot: 'bg-blue-500' },
              { label: 'Processing',  count: processedDocs,  color: 'bg-primary/10 border-primary/20 text-primary',    dot: 'bg-primary' },
              { label: 'Digitized',   count: digitizedDocs,  color: 'bg-violet-500/10 border-violet-500/20 text-violet-600', dot: 'bg-violet-500' },
              { label: 'Verified',    count: verifiedDocs,   color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', dot: 'bg-emerald-500' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-0 min-w-0">
                <div className={`flex-shrink-0 border rounded-xl px-5 py-4 text-center min-w-[120px] ${step.color}`}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${step.dot}`} />
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{step.label}</p>
                  </div>
                  <p className="text-3xl font-heading font-bold">{step.count}</p>
                  {totalDocs > 0 && (
                    <p className="text-[10px] opacity-60 mt-0.5">{Math.round((step.count / totalDocs) * 100)}%</p>
                  )}
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-shrink-0 flex items-center px-1">
                    <div className="h-px w-6 bg-border" />
                    <span className="text-muted-foreground text-xs">›</span>
                    <div className="h-px w-6 bg-border" />
                  </div>
                )}
              </div>
            ))}
            {rejectedDocs > 0 && (
              <>
                <div className="flex-shrink-0 flex items-center px-1">
                  <div className="h-px w-6 bg-border" />
                  <span className="text-muted-foreground text-xs">›</span>
                  <div className="h-px w-6 bg-border" />
                </div>
                <div className="flex-shrink-0 border rounded-xl px-5 py-4 text-center min-w-[120px] bg-destructive/10 border-destructive/20 text-destructive">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Rejected</p>
                  </div>
                  <p className="text-3xl font-heading font-bold">{rejectedDocs}</p>
                  {totalDocs > 0 && (
                    <p className="text-[10px] opacity-60 mt-0.5">{Math.round((rejectedDocs / totalDocs) * 100)}%</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Summary row */}
        {!loading && totalDocs > 0 && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{pendingReviews}</strong> pending human review{pendingReviews !== 1 ? 's' : ''}
            </span>
            {successRate !== null && (
              <span>
                <strong className={`${successRate >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{successRate}%</strong> verification success rate
              </span>
            )}
            {avgConfidence !== null && (
              <span>
                Global OCR confidence: <strong className="text-foreground">{Math.round(avgConfidence * 100)}%</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 7. Audit Logs
// ----------------------------------------------------------------------
export function AuditPage() {
  const [documents, setDocuments]   = useState<any[]>([]);
  const [landRecords, setLandRecords] = useState<any[]>([]);
  const [tasks, setTasks]           = useState<any[]>([]);
  const [dbLogs, setDbLogs]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('ALL');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    let d = false, r = false, t = false, l = false;
    const done = () => { if (d && r && t && l) setLoading(false); };

    const u1 = onSnapshot(collection(db, 'documents'),
      s => { setDocuments(s.docs.map(x => ({ id: x.id, ...x.data() }))); d = true; done(); },
      () => { d = true; done(); });
    const u2 = onSnapshot(collection(db, 'landRecords'),
      s => { setLandRecords(s.docs.map(x => ({ id: x.id, ...x.data() }))); r = true; done(); },
      () => { r = true; done(); });
    const u3 = onSnapshot(collection(db, 'verificationTasks'),
      s => { setTasks(s.docs.map(x => ({ id: x.id, ...x.data() }))); t = true; done(); },
      () => { t = true; done(); });
    const u4 = onSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')),
      s => { setDbLogs(s.docs.map(x => ({ id: x.id, ...x.data() }))); l = true; done(); },
      () => { l = true; done(); });

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Build synthetic audit events from real data
  const events = (() => {
    const ev: any[] = [];

    // From auditLogs collection (seeded/real)
    for (const log of dbLogs) {
      const ts = log.timestamp?.toDate ? log.timestamp.toDate() : (log.createdAt?.toDate ? log.createdAt.toDate() : null);
      ev.push({
        id: log.id,
        ts,
        actor: log.userId || log.user || 'System',
        action: log.action || 'SYSTEM_EVENT',
        resource: log.resourceType ? `${log.resourceType}: ${log.resourceId || ''}` : (log.target || log.metadata || '—'),
        category: 'SYSTEM',
        severity: 'INFO',
      });
    }

    // Document uploads
    for (const doc of documents) {
      const ts = doc.createdAt?.toDate ? doc.createdAt.toDate() : null;
      ev.push({
        id: `doc-upload-${doc.id}`,
        ts,
        actor: doc.uploadedBy || 'Operator',
        action: 'DOCUMENT_UPLOADED',
        resource: doc.originalName || doc.id,
        category: 'DOCUMENT',
        severity: 'INFO',
      });

      if (doc.status === 'DIGITIZED' || doc.status === 'VERIFIED' || doc.status === 'REJECTED') {
        const ts2 = doc.updatedAt?.toDate ? doc.updatedAt.toDate() : null;
        ev.push({
          id: `doc-status-${doc.id}`,
          ts: ts2,
          actor: doc.status === 'VERIFIED' ? 'Verifier' : 'AI Engine',
          action: doc.status === 'VERIFIED' ? 'RECORD_VERIFIED' : doc.status === 'REJECTED' ? 'RECORD_REJECTED' : 'OCR_COMPLETED',
          resource: doc.originalName || doc.id,
          category: 'PROCESSING',
          severity: doc.status === 'REJECTED' ? 'WARN' : 'SUCCESS',
        });
      }
    }

    // Land record extractions
    for (const rec of landRecords) {
      const ts = rec.createdAt?.toDate ? rec.createdAt.toDate() : null;
      const conf = rec.confidence ?? 1;
      ev.push({
        id: `rec-extract-${rec.id}`,
        ts,
        actor: 'AI / OCR Engine',
        action: 'FIELDS_EXTRACTED',
        resource: `Survey ${rec.surveyNumber || '—'} · ${rec.ownerName || '—'} · ${rec.district || '—'}`,
        category: 'PROCESSING',
        severity: conf < 0.65 ? 'WARN' : conf < 0.85 ? 'INFO' : 'SUCCESS',
      });

      if (rec.status === 'VERIFIED') {
        const ts2 = rec.updatedAt?.toDate ? rec.updatedAt.toDate() : null;
        ev.push({
          id: `rec-verify-${rec.id}`,
          ts: ts2,
          actor: 'Verifier',
          action: 'LAND_RECORD_APPROVED',
          resource: `Survey ${rec.surveyNumber || '—'} · ${rec.village || '—'}, ${rec.district || '—'}`,
          category: 'VERIFICATION',
          severity: 'SUCCESS',
        });
      }
    }

    // Verification tasks
    for (const task of tasks) {
      const ts = task.createdAt?.toDate ? task.createdAt.toDate() : null;
      ev.push({
        id: `task-create-${task.id}`,
        ts,
        actor: 'System',
        action: 'VERIFICATION_TASK_CREATED',
        resource: `Document ID: ${task.documentId?.slice(0, 12) || '—'}…`,
        category: 'VERIFICATION',
        severity: 'INFO',
      });
      if (task.status === 'COMPLETED' || task.status === 'REJECTED') {
        const ts2 = task.updatedAt?.toDate ? task.updatedAt.toDate() : null;
        ev.push({
          id: `task-done-${task.id}`,
          ts: ts2,
          actor: 'Verifier',
          action: task.status === 'COMPLETED' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
          resource: `Document ID: ${task.documentId?.slice(0, 12) || '—'}…`,
          category: 'VERIFICATION',
          severity: task.status === 'COMPLETED' ? 'SUCCESS' : 'WARN',
        });
      }
    }

    // Sort by timestamp desc, nulls last
    return ev.sort((a, b) => {
      if (!a.ts && !b.ts) return 0;
      if (!a.ts) return 1;
      if (!b.ts) return -1;
      return b.ts.getTime() - a.ts.getTime();
    });
  })();

  const categories = ['ALL', 'DOCUMENT', 'PROCESSING', 'VERIFICATION', 'SYSTEM'];
  const filtered = events.filter(e => {
    const matchCat = filter === 'ALL' || e.category === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || e.action.toLowerCase().includes(q) || e.resource.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const severityStyle: Record<string, string> = {
    SUCCESS: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    INFO:    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    WARN:    'bg-amber-500/10 text-amber-600 border-amber-500/20',
    ERROR:   'bg-destructive/10 text-destructive border-destructive/20',
  };
  const severityDot: Record<string, string> = {
    SUCCESS: 'bg-emerald-500', INFO: 'bg-blue-500', WARN: 'bg-amber-500', ERROR: 'bg-destructive',
  };

  const actionIcon: Record<string, string> = {
    DOCUMENT_UPLOADED: '📤',
    OCR_COMPLETED: '🤖',
    FIELDS_EXTRACTED: '🔍',
    RECORD_VERIFIED: '✅',
    RECORD_REJECTED: '❌',
    LAND_RECORD_APPROVED: '✅',
    VERIFICATION_TASK_CREATED: '📋',
    VERIFICATION_APPROVED: '✅',
    VERIFICATION_REJECTED: '🚫',
    SYSTEM_EVENT: '⚙️',
    SYSTEM_BOOTSTRAP: '🚀',
  };

  function fmtDate(ts: Date | null) {
    if (!ts) return '—';
    return ts.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function exportCSV() {
    const rows = [
      ['Timestamp', 'Actor', 'Action', 'Resource / Target', 'Category', 'Severity'],
      ...filtered.map(e => [fmtDate(e.ts), e.actor, e.action, e.resource, e.category, e.severity]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bhoomilens-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // Stats
  const successCount = events.filter(e => e.severity === 'SUCCESS').length;
  const warnCount    = events.filter(e => e.severity === 'WARN').length;
  const docCount     = events.filter(e => e.category === 'DOCUMENT').length;
  const verCount     = events.filter(e => e.category === 'VERIFICATION').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Immutable Audit Logs" description="Cryptographically verifiable trail of all system actions on land records." icon={ShieldAlert} />

      {/* What is this? explainer */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-foreground mb-1">Why Audit Logs matter for land records</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Every action on a land record — upload, OCR extraction, human verification, approval or rejection — is permanently logged here.
            This creates a <strong className="text-foreground">legally traceable chain of custody</strong> required by DILRMP (Digital India Land Records Modernisation Programme).
            These logs help detect tampering, resolve ownership disputes, and ensure government compliance.
          </p>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',   value: events.length,  icon: '📊', color: 'text-foreground' },
          { label: 'Verified',       value: successCount,   icon: '✅', color: 'text-emerald-600' },
          { label: 'Flagged',        value: warnCount,      icon: '⚠️', color: 'text-amber-600' },
          { label: 'Verifications',  value: verCount,       icon: '👤', color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xl">{s.icon}</span>
            <span className={`text-3xl font-heading font-bold ${s.color}`}>{loading ? '…' : s.value}</span>
            <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search logs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-card border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 w-48"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary/20 text-muted-foreground border-b">
            <tr>
              <th className="px-4 py-3 font-semibold w-44">Timestamp</th>
              <th className="px-4 py-3 font-semibold w-32">Actor</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Resource / Target</th>
              <th className="px-4 py-3 font-semibold text-right w-28">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Loading audit trail…
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-secondary/40 flex items-center justify-center">
                      <ShieldAlert className="w-7 h-7 text-muted-foreground opacity-40" />
                    </div>
                    <p className="font-medium text-foreground text-sm">No audit events yet</p>
                    <p className="text-muted-foreground text-xs max-w-xs">
                      Audit events are generated automatically when you upload documents, run OCR, or verify land records from the Dashboard.
                    </p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((log, i) => (
              <tr
                key={log.id}
                className={`hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/5'}`}
              >
                <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{fmtDate(log.ts)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 bg-secondary/50 border rounded-md px-1.5 py-0.5 font-medium text-foreground">
                    {log.actor}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm">{actionIcon[log.action] ?? '•'}</span>
                    <span className="font-mono font-semibold text-foreground">{log.action}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[260px] truncate" title={log.resource}>
                  {log.resource}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${severityStyle[log.severity] ?? severityStyle.INFO}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${severityDot[log.severity] ?? 'bg-blue-500'}`} />
                    {log.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t bg-secondary/10 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {filtered.length} of {events.length} events</span>
            <span className="font-mono text-[10px]">🔒 All timestamps in local time · Read-only ledger</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 8. Administration
// ----------------------------------------------------------------------
export function AdminPage() {
  // ── Auth gate state ───────────────────────────────────────────────────
  const { user } = useAuth();
  const [gateEmail,    setGateEmail]    = useState('');
  const [gatePassword, setGatePassword] = useState('');
  const [gateError,    setGateError]    = useState('');
  const [gateShake,    setGateShake]    = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unlocked,     setUnlocked]     = useState(false);

  // Pre-fill email from logged-in user
  useEffect(() => {
    if (user?.email) setGateEmail(user.email);
  }, [user]);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const emailOk = gateEmail.trim().toLowerCase() === (user?.email ?? '').toLowerCase();
    const passOk  = gatePassword === 'Admin';
    if (emailOk && passOk) {
      setGateError('');
      setUnlocked(true);
    } else {
      setGateError(
        !emailOk ? 'Email does not match your account.' : 'Incorrect password.'
      );
      setGateShake(true);
      setTimeout(() => setGateShake(false), 600);
    }
  }

  // ── Gate screen ───────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div
          className={`w-full max-w-md transition-transform duration-100 ${gateShake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
          style={gateShake ? { animation: 'shake 0.5s ease-in-out' } : {}}
        >
          {/* Card */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-8 pt-8 pb-6 border-b border-border/50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-inner">
                  <Settings className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-heading font-bold text-foreground">Administration Console</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">Restricted access — verify your identity</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>This area contains sensitive system configuration. All actions are logged.</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUnlock} className="px-8 py-7 space-y-5">
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">✉️</span>
                  <input
                    type="email"
                    value={gateEmail}
                    onChange={e => { setGateEmail(e.target.value); setGateError(''); }}
                    placeholder="your@email.com"
                    autoComplete="username"
                    className="w-full pl-9 pr-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-card transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔑</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={gatePassword}
                    onChange={e => { setGatePassword(e.target.value); setGateError(''); }}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-card transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs"
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {gateError && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  {gateError}
                </div>
              )}

              {/* Hint */}
              <div className="text-[11px] text-muted-foreground/60 bg-secondary/20 rounded-lg px-3 py-2 space-y-0.5">
                <p>📧 <strong>Username:</strong> your registered email</p>
                <p>🔐 <strong>Password:</strong> Admin</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Access Administration Console
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-4">
            Unauthorized access attempts are recorded and reportable under IT Act 2000.
          </p>
        </div>

        {/* Shake keyframes — injected inline */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            15%       { transform: translateX(-8px); }
            30%       { transform: translateX(8px); }
            45%       { transform: translateX(-6px); }
            60%       { transform: translateX(6px); }
            75%       { transform: translateX(-3px); }
            90%       { transform: translateX(3px); }
          }
        `}</style>
      </div>
    );
  }

  // ── Admin Console (shown after successful auth) ────────────────────────
  return <AdminConsoleContent />;
}

function AdminConsoleContent() {
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.displayName || data.name || 'Unknown User',
          email: data.email || 'No Email',
          role: data.role || 'OPERATOR',
          active: data.active !== false
        };
      }));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Administration Console" description="Manage roles, users, and global system configuration." icon={Settings} />
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
          <CheckCircle className="w-3.5 h-3.5" />
          Authenticated
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-bold">User Management</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/10 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name &amp; Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No users found.
                    </td>
                  </tr>
                ) : users.map((u, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="font-bold">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select className="bg-secondary/30 border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary" defaultValue={u.role}>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="GIS_OFFICER">GIS_OFFICER</option>
                        <option value="VERIFIER">VERIFIER</option>
                        <option value="OPERATOR">OPERATOR</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`inline-block w-3 h-3 rounded-full ${u.active ? 'bg-primary' : 'bg-muted-foreground'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-card border rounded-xl p-5 shadow-sm">
             <h3 className="font-bold mb-4">System Settings</h3>
             <div className="space-y-4 text-sm">
               <div className="flex justify-between items-center border-b pb-3">
                 <span className="font-medium text-muted-foreground">Auto-Verify Threshold</span>
                 <span className="font-bold text-primary border rounded px-2 py-1 bg-primary/5">0.95</span>
               </div>
               <div className="flex justify-between items-center border-b pb-3">
                 <span className="font-medium text-muted-foreground">Maintenance Mode</span>
                 <div className="w-8 h-4 bg-secondary rounded-full relative cursor-pointer">
                    <div className="w-3 h-3 bg-muted-foreground rounded-full absolute left-0.5 top-0.5" />
                  </div>
               </div>
               <button className="w-full py-2 bg-destructive/10 text-destructive rounded-lg font-bold hover:bg-destructive/20 transition-colors">
                 Purge Temporary Cache
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}


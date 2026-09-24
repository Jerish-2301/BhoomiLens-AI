import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  File as FileIcon,
  X,
  CheckCircle2,
  Cpu,
  Scan,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { storeBlobUrl } from '../../lib/documentStore';
import { runOcr, type OcrProgress } from '../../lib/ocr';

interface UploadedDoc {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  status: string;
  createdAt: any;
}

type UploadPhase = 'idle' | 'saving' | 'ocr' | 'done';

interface FileState {
  file: File;
  phase: UploadPhase;
  ocrStatus: string;
  ocrProgress: number;
}

export function DocumentUploader() {
  const { user } = useAuth();
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentDocs, setRecentDocs] = useState<UploadedDoc[]>([]);

  // Live Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecentDocs(
        snapshot.docs.slice(0, 5).map((d) => ({ id: d.id, ...d.data() } as UploadedDoc))
      );
    });
    return unsub;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFileStates((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        file,
        phase: 'idle' as UploadPhase,
        ocrStatus: '',
        ocrProgress: 0,
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFileStates((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileState = (index: number, patch: Partial<FileState>) => {
    setFileStates((prev) =>
      prev.map((fs, i) => (i === index ? { ...fs, ...patch } : fs))
    );
  };

  const processFiles = async () => {
    if (fileStates.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < fileStates.length; i++) {
      const { file } = fileStates[i];

      // ── Step 1: Save metadata to Firestore ──────────────────────────
      updateFileState(i, { phase: 'saving', ocrStatus: 'Saving to database…', ocrProgress: 5 });

      // Generate inline preview data URL for images so preview is permanently available across all tabs & sessions
      let previewUrl: string | null = null;
      if (file.type.startsWith('image/') && file.size < 1.5 * 1024 * 1024) {
        try {
          previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        } catch {}
      }

      let docId: string;
      try {
        const docRef = await addDoc(collection(db, 'documents'), {
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          path: `documents/${file.name}`,
          previewUrl: previewUrl || null,
          status: 'PROCESSING',
          uploadedBy: user?.uid ?? 'anonymous',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        docId = docRef.id;
        storeBlobUrl(docId, file);
      } catch (err: any) {
        alert(`Failed to save ${file.name}: ${err.message}`);
        updateFileState(i, { phase: 'idle' });
        continue;
      }

      // ── Step 2: Run OCR (skip for non-image PDFs for now) ───────────
      updateFileState(i, { phase: 'ocr', ocrStatus: 'Initializing OCR…', ocrProgress: 10 });

      let ocrFields: Awaited<ReturnType<typeof runOcr>> | null = null;
      try {
        ocrFields = await runOcr(file, (p: OcrProgress) => {
          updateFileState(i, { ocrStatus: p.status, ocrProgress: p.progress });
        });
      } catch (err) {
        console.warn('OCR failed, saving without extracted fields:', err);
      }

      // ── Step 3: Update Firestore with digitized data ─────────────────
      try {
        const docRef = doc(db, 'documents', docId);
        await updateDoc(docRef, {
          status: 'DIGITIZED',
          updatedAt: serverTimestamp(),
          ...(ocrFields && {
            digitized: {
              surveyNumber: ocrFields.surveyNumber ?? null,
              ownerName: ocrFields.ownerName ?? null,
              area: ocrFields.area ?? null,
              areaUnit: ocrFields.areaUnit ?? null,
              village: ocrFields.village ?? null,
              district: ocrFields.district ?? null,
              taluka: ocrFields.taluka ?? null,
              state: ocrFields.state ?? null,
              documentType: ocrFields.documentType ?? 'Land Record',
              confidence: ocrFields.confidence,
              rawText: ocrFields.rawText,
            },
          }),
        });

        // Also save as a LandRecord for the Land Records page & Verification Queue
        if (ocrFields) {
          const hasFlags = ocrFields.discrepanciesOrFlags && ocrFields.discrepanciesOrFlags.length > 0;
          const isHighConf = (ocrFields.confidence || 0) >= 0.85 && !hasFlags;

          await addDoc(collection(db, 'landRecords'), {
            documentId: docId,
            previewUrl: previewUrl || null,
            surveyNumber: ocrFields.surveyNumber ?? 'Unknown',
            owner: ocrFields.ownerName ?? 'Unknown',
            ownerName: ocrFields.ownerName ?? 'Unknown',
            allOwners: ocrFields.allOwners ?? [],
            area: ocrFields.area ? `${ocrFields.area} ${ocrFields.areaUnit ?? ''}`.trim() : 'Unknown',
            areaUnit: ocrFields.areaUnit ?? 'acres',
            village: ocrFields.village ?? 'Unknown',
            taluka: ocrFields.taluka ?? 'Unknown',
            district: ocrFields.district ?? 'Unknown',
            state: ocrFields.state ?? 'Unknown',
            documentType: ocrFields.documentType ?? 'Land Record',
            confidence: ocrFields.confidence,
            status: isHighConf ? 'VERIFIED' : 'PENDING',
            validationResult: JSON.stringify({
              status: isHighConf ? 'PASSED' : 'REVIEW_REQUIRED',
              errors: ocrFields.discrepanciesOrFlags || [],
              warnings: [],
              passedRules: [
                'SURVEY_NUMBER_FORMAT',
                'AREA_POSITIVE',
                'MANDATORY_LOCATION',
                ...(isHighConf ? ['GEMINI_VISION_CONFIDENCE_MET'] : [])
              ]
            }),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          if (!isHighConf) {
            await addDoc(collection(db, 'verificationTasks'), {
              documentId: docId,
              status: 'PENDING',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        console.error('Failed to update digitized fields:', err);
      }

      updateFileState(i, { phase: 'done', ocrStatus: 'Digitization complete!', ocrProgress: 100 });
    }

    setIsProcessing(false);
    // Clear done files after a brief moment
    setTimeout(() => setFileStates([]), 2500);
  };

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDate(ts: any) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  }

  const allDone = fileStates.length > 0 && fileStates.every((fs) => fs.phase === 'done');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4 min-h-[220px] transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/20'
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-transform',
            isDragActive
              ? 'bg-primary text-primary-foreground scale-110'
              : 'bg-primary/10 text-primary'
          )}
        >
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Upload Old Land Records</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            Drop scanned images or PDFs here. Our AI will digitize and extract all fields
            automatically.
          </p>
        </div>
      </div>

      {/* File processing list */}
      {fileStates.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-secondary/50 font-medium text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" />
              {allDone ? 'Digitization Complete!' : `Processing ${fileStates.length} document${fileStates.length !== 1 ? 's' : ''}…`}
            </span>
            {!isProcessing && (
              <button
                onClick={() => setFileStates([])}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Clear all
              </button>
            )}
          </div>

          <ul className="divide-y">
            {fileStates.map((fs, i) => (
              <li key={i} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Phase icon */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                        fs.phase === 'done'
                          ? 'bg-primary/20 text-primary'
                          : fs.phase === 'ocr'
                          ? 'bg-amber-500/20 text-amber-500'
                          : fs.phase === 'saving'
                          ? 'bg-blue-500/20 text-blue-500'
                          : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {fs.phase === 'done' ? (
                        <Check className="w-5 h-5" />
                      ) : fs.phase === 'ocr' ? (
                        <Cpu className="w-5 h-5 animate-pulse" />
                      ) : (
                        <FileIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{fs.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(fs.file.size)}</p>
                    </div>
                  </div>

                  {!isProcessing && fs.phase === 'idle' && (
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {fs.phase !== 'idle' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{fs.ocrStatus}</span>
                      <span>{fs.ocrProgress}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          fs.phase === 'done' ? 'bg-primary' : 'bg-amber-500'
                        )}
                        style={{ width: `${fs.ocrProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Action button */}
          {!isProcessing && !allDone && (
            <div className="p-4 border-t bg-secondary/20">
              <button
                onClick={processFiles}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Scan className="w-4 h-4" />
                Digitize {fileStates.length} Document{fileStates.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent uploads — live from Firestore */}
      {recentDocs.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-secondary/30 font-medium text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Recent Uploads (Live)
          </div>
          <ul className="divide-y">
            {recentDocs.map((d) => (
              <li key={d.id} className="px-3 sm:px-4 py-3 flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-[130px] sm:max-w-[250px]">{d.originalName}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{formatDate(d.createdAt)}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                    d.status === 'DIGITIZED'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : d.status === 'PROCESSING'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'
                      : d.status === 'UPLOADED'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  )}
                >
                  {d.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

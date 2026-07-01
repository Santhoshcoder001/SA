import React, { useState, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { parseDocxFile, parsePdfFile } from '../utils/fileParser';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const FileUploader: React.FC = () => {
  const { uploadWords } = useGameState();
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccessCount(null);
    setFileName(file.name);

    try {
      let wordsExtracted: string[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'docx') {
        wordsExtracted = await parseDocxFile(file, 'tamil');
      } else if (extension === 'pdf') {
        wordsExtracted = await parsePdfFile(file, 'tamil');
      } else {
        throw new Error('ஆவண வடிவம் ஆதரிக்கப்படவில்லை. Please upload a .docx or .pdf file.');
      }

      if (wordsExtracted.length === 0) {
        throw new Error('கோப்பிலிருந்து தமிழ் வார்த்தைகள் எதையும் கண்டறிய முடியவில்லை. No Tamil words found in the document.');
      }

      uploadWords(wordsExtracted);
      setSuccessCount(wordsExtracted.length);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while parsing the file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Simulate file upload with premium vocabulary sets
  const handleSimulateUpload = () => {
    setLoading(true);
    setError(null);
    setSuccessCount(null);
    setFileName('மாதிரி_தமிழ்_ஆவணம்.pdf (Simulated)');

    setTimeout(() => {
      const simulatedWords = [
        'இளநீர்', // Tender coconut
        'ஆப்பிள்', // Apple
        'கணிதவியல்', // Mathematics
        'தொழில்நுட்பம்', // Technology
        'விண்கலம்', // Spacecraft
        'சுழல்காற்று', // Cyclone
        'செயற்கைக்கோள்', // Satellite
        'மின்சாரம்', // Electricity
        'அறிவியல்', // Science
        'சுற்றுலாப்பயணம்' // Tourism trip
      ];
      uploadWords(simulatedWords);
      setSuccessCount(simulatedWords.length);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-850 dark:bg-slate-900/40">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <UploadCloud className="h-5 w-5 text-brand-500" /> கோப்பிலிருந்து சொற்களைப் பதிவேற்று <span className="text-slate-400 font-normal">| Upload Word List</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Import custom Tamil vocabulary from DOCX or PDF files.</p>
        </div>
        
        {/* Simulation Demo Button */}
        <button
          onClick={handleSimulateUpload}
          className="rounded-xl px-3.5 py-1.5 text-xs font-bold bg-indigo-50 border border-indigo-200/50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-950/20 dark:text-indigo-400 flex items-center gap-1.5 transition-all cursor-pointer self-start md:self-auto"
        >
          <Sparkles className="h-3.5 w-3.5" /> மாதிரி கோப்பு (Simulate Upload)
        </button>
      </div>

      {/* Drag & Drop Main Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 px-4 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-brand-500 bg-brand-50/20 dark:border-brand-400 dark:bg-brand-950/10 scale-[0.99]'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 hover:bg-slate-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              கோப்பை பகுப்பாய்வு செய்கிறது... (Extracting words from file...)
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-2xl bg-brand-50 p-3.5 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 mb-1 shadow-sm">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              கோப்பை இங்கே இழுத்துப் போடவும் அல்லது உலாவவும்
            </p>
            <p className="text-[10px] text-slate-400">
              PDF or Word (.docx) formats only • Max size 5MB
            </p>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      {error && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-700 dark:border-rose-950/20 dark:bg-rose-950/10 dark:text-rose-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
          <div>
            <span className="font-bold">பிழை (Error):</span> {error}
          </div>
        </div>
      )}

      {successCount !== null && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-success-100 bg-success-50/50 p-3 text-xs text-success-700 dark:border-success-950/20 dark:bg-success-950/10 dark:text-success-400">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success-500" />
          <div>
            <span className="font-bold">பகுப்பாய்வு முடிந்தது! (Parsed Successfully):</span> {fileName} கோப்பிலிருந்து <span className="font-extrabold text-success-600 dark:text-success-400">{successCount}</span> புதிய தனித்துவமான தமிழ் சொற்கள் கண்டறியப்பட்டு சேர்க்கப்பட்டன!
          </div>
        </div>
      )}
    </div>
  );
};

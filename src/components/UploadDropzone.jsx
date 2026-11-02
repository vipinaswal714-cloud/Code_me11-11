import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Zap,
  Sparkles,
  AlertCircle,
  Activity,
  Layers,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { UPLOAD_NOTICE } from '../constants/privacyNotices';
import {
  generateSalesSampleData,
  generateLargeDataset,
  generateDuplicatesAndMissingData,
  generateOnlyTextData
} from '../utils/sampleData';
import { parseSpreadsheet, processJsonDataset, MAX_FILE_SIZE_BYTES } from '../utils/dataParser';

export default function UploadDropzone({ onDataLoaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleProcessFile = async (file) => {
    if (!file) return;

    // Check extension: strictly allow only expected spreadsheet formats
    const validExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setError(`Unsupported file format. Please upload an Excel or CSV spreadsheet (${validExts.join(', ')}).`);
      return;
    }

    // Check file size limit (50 MB) upfront
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed 50 MB limit.`);
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMsg(`Parsing ${file.name} with SheetJS...`);

    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.rawData.length === 0) {
        throw new Error('The spreadsheet is empty or has no readable data rows.');
      }
      onDataLoaded(parsed);
    } catch (err) {
      console.warn('[Metrica Parser]', err.message);
      setError(err.message || 'Failed to parse the file. Please ensure it is a valid spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = async (type) => {
    setError(null);
    setIsLoading(true);

    try {
      let rawData = [];
      let filename = 'Metrica_Sample.xlsx';

      if (type === 'sales') {
        setLoadingMsg('Generating realistic Global Sales dataset (1,200 records)...');
        rawData = generateSalesSampleData(1200);
        filename = 'Global_Sales_Q1_Q4.xlsx';
      } else if (type === 'large') {
        setLoadingMsg('Generating 100,000 transaction records for stress testing...');
        // allow UI to render spinner before blocking compute
        await new Promise(r => setTimeout(r, 50));
        rawData = generateLargeDataset(100000);
        filename = 'HighVolume_Transactions_100k.csv';
      } else if (type === 'dirty') {
        setLoadingMsg('Generating dataset with intentional duplicates & missing values...');
        rawData = generateDuplicatesAndMissingData(600);
        filename = 'Dirty_Dataset_Duplicates_Nulls.xlsx';
      } else if (type === 'text') {
        setLoadingMsg('Generating text & categorical dataset (Support Tickets)...');
        rawData = generateOnlyTextData(400);
        filename = 'Customer_Support_Tickets.csv';
      }

      // Fast direct profile and summary
      const finalParsed = processJsonDataset(rawData, filename);
      onDataLoaded(finalParsed);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load sample dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-200">
      {/* Title & Tagline */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-metrica-500/10 text-metrica-600 dark:text-metrica-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Zap className="w-3.5 h-3.5" />
          Browser-Native Analytics Studio
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Drop in spreadsheets. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-metrica-600 via-cyan-500 to-metrica-500">
            Instant Power BI Dashboards.
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Fast client-side SheetJS parsing, automated KPI generation, dynamic interactive charts, data cleaning, and AI intelligence.
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-metrica-500 bg-metrica-50/50 dark:bg-metrica-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-metrica-400 hover:bg-slate-50/80 dark:hover:bg-slate-900'
        } custom-card-shadow custom-card-shadow-hover`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv, .tsv, .txt"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleProcessFile(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-metrica-500/10 text-metrica-600 dark:text-metrica-400 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-bold text-slate-800 dark:text-slate-100">
              Drag & drop your Excel or CSV file here
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Supports <code className="font-mono text-slate-600 dark:text-slate-300">.xlsx</code>, <code className="font-mono text-slate-600 dark:text-slate-300">.xls</code>, or <code className="font-mono text-slate-600 dark:text-slate-300">.csv</code> up to 100,000+ rows
            </p>
          </div>

          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-metrica-600 hover:bg-metrica-700 text-white font-semibold text-xs shadow-md transition-all pointer-events-none"
          >
            Browse Files from Computer
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <p className="text-[11px] leading-tight text-center font-medium">
              {UPLOAD_NOTICE}{' '}
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/privacy');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-metrica-600 dark:text-metrica-400 underline underline-offset-2 hover:text-metrica-700 font-semibold"
              >
                Privacy Notice
              </a>
            </p>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-glass rounded-3xl flex flex-col items-center justify-center gap-3 z-20">
            <div className="w-10 h-10 border-4 border-metrica-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {loadingMsg}
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Quick Demo Sample Data Presets */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 justify-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Or explore instant sample datasets:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Sample 1: Sales */}
          <button
            onClick={() => handleLoadSample('sales')}
            disabled={isLoading}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-metrica-500 hover:bg-metrica-50/30 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Recommended
              </span>
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-metrica-600 dark:group-hover:text-metrica-400">
              Global Sales & Revenue
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              1,200 rows with dates, products, margins & regions
            </p>
          </button>

          {/* Sample 2: 100k Stress Test */}
          <button
            onClick={() => handleLoadSample('large')}
            disabled={isLoading}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-cyan-500 hover:bg-cyan-50/30 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Activity className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                100,000 Rows
              </span>
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
              Performance Stress Test
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Tests high-volume aggregation & rendering speeds
            </p>
          </button>

          {/* Sample 3: Dirty Data */}
          <button
            onClick={() => handleLoadSample('dirty')}
            disabled={isLoading}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Layers className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                Cleaning Test
              </span>
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
              Dirty Data with Nulls
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Deliberate duplicate rows & empty cells to clean
            </p>
          </button>

          {/* Sample 4: Only Text */}
          <button
            onClick={() => handleLoadSample('text')}
            disabled={isLoading}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Text Only
              </span>
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              Support Tickets
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Categorical frequencies with zero numeric measures
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

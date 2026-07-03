import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../hooks/useGameStore';
import { dbService } from '../services/db';
import { speechService } from '../services/speechService';
import { parseDocxFile, parsePdfFile, parseJsonFile, type PdfExtractionMode } from '../utils/fileParser';
import { segmentWord } from '../utils/wordSegmenter';
import type { LearningItem, Difficulty } from '../types';
import { playClickSound, playSuccessSound, playErrorSound } from '../utils/soundEffects';
import { 
  FileText, Upload, Trash2, Search, ArrowUpDown, Volume2, 
  Edit3, Trash, Check, X, CheckSquare, Square
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ImportWords: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, settings } = useGameStore();

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Parsed words list (for the active language)
  const [importedWords, setImportedWords] = useState<LearningItem[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    duplicatesRemoved: 0,
    blanksRemoved: 0
  });

  // Controls states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'az' | 'za' | 'newest' | 'oldest' | 'random'>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  /** PDF extraction mode: 'filtered' (language-aware) or 'raw' (generic all-text) */
  const [pdfMode, setPdfMode] = useState<PdfExtractionMode>('filtered');
  /** Raw preview lines from last extraction (shown before committing) */
  const [rawPreview, setRawPreview] = useState<string[]>([]);

  // Load previously imported words for the current language on mount
  const loadImportedWords = useCallback(async () => {
    if (!activeLanguageId) return;
    const items = await dbService.getLearningItems(activeLanguageId, 'words');
    // Filter items that belong to the "Imported" category
    const imported = items.filter(item => item.category === 'Imported');
    setImportedWords(imported);
  }, [activeLanguageId]);

  useEffect(() => {
    if (!activeLanguageId) {
      navigate('/');
      return;
    }
    loadImportedWords();
  }, [activeLanguageId, navigate, loadImportedWords]);

  // Drag and drop handlers
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

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const browsedFile = e.target.files?.[0];
    if (browsedFile) {
      validateAndSetFile(browsedFile);
    }
  };

  const validateAndSetFile = (targetFile: File) => {
    const extension = targetFile.name.split('.').pop()?.toLowerCase();
    if (extension === 'docx' || extension === 'pdf' || extension === 'json') {
      setFile(targetFile);
      setRawPreview([]);
    } else {
      playErrorSound(settings.soundEnabled);
      alert('Supported formats: .docx  .pdf  .json');
    }
  };

  const handleClearFile = () => {
    playClickSound(settings.soundEnabled);
    setFile(null);
  };

  // Perform Document Word Extraction
  const handleImport = async () => {
    if (!file || !activeLanguageId) return;
    playClickSound(settings.soundEnabled);
    setLoading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let wordsExtracted: string[] = [];

      if (ext === 'docx') {
        const result = await parseDocxFile(file, activeLanguageId);
        wordsExtracted = result.words;
        setRawPreview(result.rawPreview);
      } else if (ext === 'pdf') {
        const result = await parsePdfFile(file, activeLanguageId, pdfMode);
        wordsExtracted = result.words;
        setRawPreview(result.rawPreview);
      } else if (ext === 'json') {
        const result = await parseJsonFile(file, activeLanguageId);
        wordsExtracted = result.words;
        setRawPreview(result.rawPreview);
      }

      if (wordsExtracted.length === 0) {
        throw new Error('No valid words found in the document matching current language script!');
      }

      // Read current words in database to detect system duplicates
      const currentDbItems = await dbService.getLearningItems(activeLanguageId, 'words');
      const existingDbWords = currentDbItems.map(item => item.word.toUpperCase().trim());

      let dupCount = 0;
      let blankCount = 0;

      // Process word extraction list
      const uniqueInputWords = new Set<string>();
      wordsExtracted.forEach(word => {
        const clean = word.trim().toUpperCase();
        if (!clean) {
          blankCount++;
          return;
        }
        if (uniqueInputWords.has(clean) || existingDbWords.includes(clean)) {
          dupCount++;
          return;
        }
        uniqueInputWords.add(clean);
      });

      if (uniqueInputWords.size === 0) {
        throw new Error('All words in the document are already present in the database (duplicate-only file)!');
      }

      // Map to learning items database structure
      const timestamp = new Date().toISOString();
      const itemsToSave: LearningItem[] = Array.from(uniqueInputWords).map((word, idx) => {
        const letters = segmentWord(word, activeLanguageId);

        // Auto difficulty assigner
        let difficulty: Difficulty = 'easy';
        if (letters.length >= 5 && letters.length <= 7) difficulty = 'medium';
        else if (letters.length >= 8) difficulty = 'hard';

        return {
          id: `import-${Date.now()}-${idx}-${word}`,
          language: activeLanguageId,
          subject: 'words',
          category: 'Imported',
          word,
          meaning: '',
          difficulty,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      });

      // Save to local database (IndexedDB)
      await dbService.bulkSaveLearningItems(itemsToSave);

      // Update UI lists
      await loadImportedWords();
      setStats({
        total: itemsToSave.length,
        duplicatesRemoved: dupCount,
        blanksRemoved: blankCount
      });

      playSuccessSound(settings.soundEnabled);
      confetti({ particleCount: 150, spread: 80 });
      setFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      playErrorSound(settings.soundEnabled);
      alert(`Import Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Speak word TTS helper
  const handleSpeak = (word: string) => {
    speechService.speak(word, activeLanguageId || 'english', settings);
  };

  // Delete single word
  const handleDeleteWord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this word?')) return;
    playClickSound(settings.soundEnabled);
    await dbService.deleteLearningItem(id);
    setImportedWords(prev => prev.filter(w => w.id !== id));
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  // Inline edit word handlers
  const handleStartEdit = (item: LearningItem) => {
    playClickSound(settings.soundEnabled);
    setEditingId(item.id);
    setEditValue(item.word);
  };

  const handleSaveEdit = async (item: LearningItem) => {
    if (!editValue.trim()) return;
    playClickSound(settings.soundEnabled);

    const updatedItem: LearningItem = {
      ...item,
      word: editValue.trim().toUpperCase(),
      updatedAt: new Date().toISOString()
    };

    await dbService.saveLearningItem(updatedItem);
    setEditingId(null);
    await loadImportedWords();
  };

  const handleCancelEdit = () => {
    playClickSound(settings.soundEnabled);
    setEditingId(null);
  };

  // Multi-selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    playClickSound(settings.soundEnabled);
    if (selectedIds.length === filteredAndSortedWords.length) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(filteredAndSortedWords.map(w => w.id)); // Select all filtered
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected words?`)) return;
    playClickSound(settings.soundEnabled);

    await dbService.bulkDeleteLearningItems(selectedIds);
    setImportedWords(prev => prev.filter(w => !selectedIds.includes(w.id)));
    setSelectedIds([]);
    alert('Selected words deleted successfully.');
  };

  // Filter & Sort Pipeline
  const filteredAndSortedWords = importedWords
    .filter(item => {
      const matchSearch = item.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.meaning && item.meaning.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'az') return a.word.localeCompare(b.word);
      if (sortBy === 'za') return b.word.localeCompare(a.word);
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'random') return 0.5 - Math.random();
      return 0;
    });

  return (
    <div className="space-y-8 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          📥 Word File Importer
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Load custom words from Microsoft Word (.docx) files
        </p>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: UPLOAD CONTROLLER & STATS */}
        <div className="space-y-6 lg:col-span-1">
          {/* Upload Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border-4 border-sky-100 dark:border-slate-800 p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-black text-indigo-950 dark:text-white uppercase tracking-wider border-b pb-2">
              Upload Document
            </h3>

            {/* Dropzone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-3xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                isDragActive 
                  ? 'border-sky-500 bg-sky-500/10' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-sky-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
              }`}
            >
              <input
                type="file"
                id="file-browse"
                accept=".docx,.pdf,.json"
                className="hidden"
                onChange={handleFileBrowse}
              />
              <Upload className="h-10 w-10 text-sky-500 mb-2 animate-bounce-subtle" />
              
              <label htmlFor="file-browse" className="cursor-pointer">
                <span className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-sm transition-all inline-block active:scale-95">
                  Browse File
                </span>
              </label>
              
              <p className="text-[10px] text-slate-400 mt-3 font-semibold">
                Or drag & drop .docx file here
              </p>
            </div>

            {/* Uploaded File status */}
            {file && (
              <div className="flex items-center justify-between p-3.5 bg-sky-50/50 dark:bg-slate-850/50 rounded-2xl border border-sky-200/50 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-5 w-5 text-sky-500 shrink-0" />
                  <span className="font-extrabold truncate text-slate-700 dark:text-slate-300">{file.name}</span>
                </div>
                <button
                  onClick={handleClearFile}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* PDF mode toggle — only shown when a PDF is selected */}
            {file && file.name.toLowerCase().endsWith('.pdf') && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">PDF Extraction Mode</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPdfMode('filtered')}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold border-2 transition-all ${
                      pdfMode === 'filtered'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-sky-300'
                    }`}
                  >
                    🔤 Language Filter
                    <span className="block text-[9px] font-semibold opacity-60 mt-0.5">Tamil / English only</span>
                  </button>
                  <button
                    onClick={() => setPdfMode('raw')}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold border-2 transition-all ${
                      pdfMode === 'raw'
                        ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-purple-300'
                    }`}
                  >
                    📄 Generic Text
                    <span className="block text-[9px] font-semibold opacity-60 mt-0.5">All readable lines</span>
                  </button>
                </div>
              </div>
            )}

            {/* Raw preview pane — shows first 20 extracted lines after parsing */}
            {rawPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extraction Preview (first {rawPreview.length} lines)</p>
                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 max-h-48 overflow-y-auto">
                  <ol className="space-y-0.5 text-xs font-mono">
                    {rawPreview.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-300 dark:text-slate-600 w-4 shrink-0">{i + 1}</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{line}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleImport}
                disabled={loading || !file}
                className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-black py-3 rounded-2xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? 'Importing...' : 'Import Words'}
              </button>
              <button
                onClick={handleClearFile}
                disabled={!file}
                className="bg-white hover:bg-slate-50 border-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 font-extrabold px-4 rounded-2xl text-xs active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Statistics Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border-4 border-indigo-50 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-indigo-950 dark:text-white uppercase tracking-wider border-b pb-2">
              Upload Statistics
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl shadow-sm text-center">
                <span className="text-[10px] text-slate-400 block mb-1">Words Imported</span>
                <span className="text-xl font-black text-indigo-600 dark:text-sky-400">{stats.total}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl shadow-sm text-center">
                <span className="text-[10px] text-slate-400 block mb-1">Selected Words</span>
                <span className="text-xl font-black text-sky-600">{selectedIds.length}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl shadow-sm text-center col-span-1">
                <span className="text-[10px] text-slate-400 block mb-1">Duplicates Removed</span>
                <span className="text-sm font-black text-rose-500">{stats.duplicatesRemoved}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl shadow-sm text-center col-span-1">
                <span className="text-[10px] text-slate-400 block mb-1">Blanks Removed</span>
                <span className="text-sm font-black text-amber-500">{stats.blanksRemoved}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DISPLAY CARDS LIST */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Filters, search, select controls */}
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border-4 border-slate-100 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-sm font-black text-indigo-950 dark:text-white flex items-center gap-1.5">
                📄 Imported Words ({filteredAndSortedWords.length})
              </span>

              {/* Sorting and Search */}
              <div className="flex flex-wrap gap-2.5 items-center">
                <div className="relative text-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search words..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-slate-850 w-full max-w-[180px] focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850 border rounded-xl px-2 py-1.5 text-xs">
                  <ArrowUpDown className="h-4 w-4 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="az">A → Z</option>
                    <option value="za">Z → A</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="random">Random</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Multi-Selection Toolbar */}
            {filteredAndSortedWords.length > 0 && (
              <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20 px-4 py-3 rounded-2xl border text-xs font-bold">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 hover:text-sky-600 transition-colors"
                >
                  {selectedIds.length === filteredAndSortedWords.length ? (
                    <CheckSquare className="h-4.5 w-4.5 text-sky-500" />
                  ) : (
                    <Square className="h-4.5 w-4.5 text-slate-400" />
                  )}
                  Select All
                </button>

                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.length === 0}
                  className="text-rose-500 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" /> Delete Selected ({selectedIds.length})
                </button>
              </div>
            )}

            {/* Words Cards Grid */}
            <div className="max-h-[480px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredAndSortedWords.length > 0 ? (
                filteredAndSortedWords.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isEditing = editingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border-4 p-4 flex items-center justify-between gap-3 shadow-sm transition-all bg-white dark:bg-slate-850 ${
                        isSelected 
                          ? 'border-sky-400 ring-2 ring-sky-300/30' 
                          : 'border-slate-100 hover:border-sky-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSelect(item.id)}
                          className="shrink-0 text-slate-400 hover:text-sky-500"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-sky-500" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-300 dark:text-slate-650" />
                          )}
                        </button>

                        {/* Word string */}
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="border-2 border-sky-400 rounded-lg px-2 py-0.5 text-sm font-black w-24 bg-white dark:bg-slate-900"
                          />
                        ) : (
                          <div className="truncate">
                            <h4 className="text-sm font-black text-indigo-950 dark:text-white truncate font-tamil">
                              {item.word}
                            </h4>
                            <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full ${
                              item.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                              item.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {item.difficulty}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Controls drawer */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(item)}
                              className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg border border-emerald-200"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg border border-slate-200"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSpeak(item.word)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                              title="Speak word"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                              title="Edit word"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWord(item.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              title="Delete word"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 col-span-2 space-y-1.5">
                  <div className="text-4xl">📭</div>
                  <p className="text-xs font-black">No imported words found matching filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

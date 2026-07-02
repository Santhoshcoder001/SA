import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useGameStore } from '../hooks/useGameStore';
import { dbService } from '../services/db';
import type { Language, Subject, LearningItem, Difficulty } from '../types';
import { segmentWord } from '../utils/wordSegmenter';
import { parseDocxFile, parsePdfFile } from '../utils/fileParser';
import { playClickSound } from '../utils/soundEffects';
import { 
  Languages, Plus, Trash2, Download, FileText, 
  Search, Save 
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { languages, subjects, refreshContent, settings } = useGameStore();

  const [activeTab, setActiveTab] = useState<'langs' | 'subjs' | 'items' | 'bulk'>('items');

  // Filter states
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterSubj, setFilterSubj] = useState<string>('all');
  const [filterDiff, setFilterDiff] = useState<string>('all');
  const [searchWord, setSearchWord] = useState<string>('');

  // Loaded items lists
  const [itemsList, setItemsList] = useState<LearningItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // File Upload states for base64
  const [imageBlob, setImageBlob] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<string>('');

  // Bulk parser states
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLang, setBulkLang] = useState<string>('');
  const [bulkParsing, setBulkParsing] = useState(false);

  // Forms
  const { register: regLang, handleSubmit: submitLang, reset: resetLang } = useForm<Omit<Language, 'isDefault' | 'createdAt'>>();
  const { register: regSubj, handleSubmit: submitSubj, reset: resetSubj } = useForm<Subject>();
  const { register: regItem, handleSubmit: submitItem, reset: resetItem } = useForm<Omit<LearningItem, 'id' | 'createdAt' | 'updatedAt' | 'image' | 'audio'>>();

  // Load items based on filters
  const fetchFilteredItems = useCallback(async () => {
    setLoadingItems(true);
    const lId = filterLang === 'all' ? undefined : filterLang;
    const sId = filterSubj === 'all' ? undefined : filterSubj;
    
    let dbItems = await dbService.getLearningItems(lId, sId);
    
    if (filterDiff !== 'all') {
      dbItems = dbItems.filter(i => i.difficulty === filterDiff);
    }
    if (searchWord.trim() !== '') {
      dbItems = dbItems.filter(i => i.word.toLowerCase().includes(searchWord.toLowerCase()) || (i.meaning && i.meaning.toLowerCase().includes(searchWord.toLowerCase())));
    }

    setItemsList(dbItems);
    setLoadingItems(false);
  }, [filterLang, filterSubj, filterDiff, searchWord]);

  useEffect(() => {
    fetchFilteredItems();
  }, [fetchFilteredItems]);

  // Handle Add Language
  const onAddLanguage = async (data: Omit<Language, 'isDefault' | 'createdAt'>) => {
    playClickSound(settings.soundEnabled);
    const newLang: Language = {
      ...data,
      id: data.id.toLowerCase().trim(),
      isDefault: false,
      createdAt: new Date().toISOString()
    };
    await dbService.saveLanguage(newLang);
    resetLang();
    await refreshContent();
    alert('Language added successfully!');
  };

  // Handle Delete Language
  const onDeleteLanguage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this language and ALL its learning items?')) return;
    playClickSound(settings.soundEnabled);

    // Delete items of this language
    const items = await dbService.getLearningItems(id);
    const ids = items.map(i => i.id);
    await dbService.bulkDeleteLearningItems(ids);

    // Delete language
    await dbService.deleteLanguage(id);
    await refreshContent();
    await fetchFilteredItems();
    alert('Language deleted successfully.');
  };

  // Handle Add Subject
  const onAddSubject = async (data: Subject) => {
    playClickSound(settings.soundEnabled);
    const newSub: Subject = {
      ...data,
      id: data.id.toLowerCase().trim(),
      order: Number(data.order)
    };
    await dbService.saveSubject(newSub);
    resetSubj();
    await refreshContent();
    alert('Subject added successfully!');
  };

  // Handle Delete Subject
  const onDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject and ALL items associated with it?')) return;
    playClickSound(settings.soundEnabled);

    const items = await dbService.getLearningItems(undefined, id);
    const ids = items.map(i => i.id);
    await dbService.bulkDeleteLearningItems(ids);

    await dbService.deleteSubject(id);
    await refreshContent();
    await fetchFilteredItems();
    alert('Subject deleted successfully.');
  };

  // Handle Image upload selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBlob(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Audio upload selection
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioBlob(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Add Learning Item
  const onAddLearningItem = async (data: Omit<LearningItem, 'id' | 'createdAt' | 'updatedAt' | 'image' | 'audio'>) => {
    playClickSound(settings.soundEnabled);
    
    // Auto difficulty classification if set
    let difficulty = data.difficulty;
    const letters = segmentWord(data.word, data.language);
    if (!difficulty || (difficulty as string) === 'auto') {
      if (letters.length <= 4) difficulty = 'easy';
      else if (letters.length <= 7) difficulty = 'medium';
      else difficulty = 'hard';
    }

    const newItem: LearningItem = {
      ...data,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      difficulty,
      image: imageBlob,
      audio: audioBlob,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbService.saveLearningItem(newItem);
    resetItem();
    setImageBlob('');
    setAudioBlob('');
    await fetchFilteredItems();
    alert('Learning item created successfully!');
  };

  const onDeleteItem = async (id: string) => {
    playClickSound(settings.soundEnabled);
    await dbService.deleteLearningItem(id);
    await fetchFilteredItems();
  };

  // Bulk upload words extractor
  const handleBulkExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile || !bulkLang) {
      alert('Please upload a file and select a language!');
      return;
    }
    playClickSound(settings.soundEnabled);
    setBulkParsing(true);

    try {
      let words: string[] = [];
      if (bulkFile.name.endsWith('.docx')) {
        words = await parseDocxFile(bulkFile, bulkLang);
      } else if (bulkFile.name.endsWith('.pdf')) {
        words = await parsePdfFile(bulkFile, bulkLang);
      } else {
        alert('Supported formats are .docx or .pdf');
        setBulkParsing(false);
        return;
      }

      // Convert extracted words to learning items
      const itemsToSave: LearningItem[] = words.map((w, idx) => {
        const letters = segmentWord(w, bulkLang);
        let difficulty: Difficulty = 'easy';
        if (letters.length >= 5 && letters.length <= 7) difficulty = 'medium';
        else if (letters.length >= 8) difficulty = 'hard';

        return {
          id: `item-bulk-${Date.now()}-${idx}`,
          language: bulkLang,
          subject: 'words',
          category: 'Extracted',
          word: w,
          meaning: w.toLowerCase(), // default meaning
          difficulty,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      await dbService.bulkSaveLearningItems(itemsToSave);
      setBulkFile(null);
      setBulkParsing(false);
      await fetchFilteredItems();
      alert(`Success! Extracted and saved ${itemsToSave.length} words.`);
    } catch (err: any) {
      console.error(err);
      alert(`Parsing failed: ${err.message}`);
      setBulkParsing(false);
    }
  };

  // Export full JSON database
  const handleExportJson = async () => {
    playClickSound(settings.soundEnabled);
    const langs = await dbService.getLanguages();
    const subjs = await dbService.getSubjects();
    const items = await dbService.getLearningItems();
    const quiz = await dbService.getQuizQuestions();

    const data = { languages: langs, subjects: subjs, learning_items: items, quiz_questions: quiz };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kids-learning-hub-db-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON database
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClickSound(settings.soundEnabled);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (data.languages) {
          for (const l of data.languages) await dbService.saveLanguage(l);
        }
        if (data.subjects) {
          for (const s of data.subjects) await dbService.saveSubject(s);
        }
        if (data.learning_items) {
          await dbService.bulkSaveLearningItems(data.learning_items);
        }
        if (data.quiz_questions) {
          await dbService.bulkSaveQuizQuestions(data.quiz_questions);
        }

        await refreshContent();
        await fetchFilteredItems();
        alert('Database imported successfully!');
      } catch (err: any) {
        alert(`Failed to import JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg flex items-center gap-4">
        <div className="bg-white/20 p-4 rounded-2xl">
          <Languages className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Content Management Dashboard</h2>
          <p className="text-xs font-semibold text-purple-100">
            Create, edit, delete languages, subjects, or upload custom audio & spelling items.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b-2 border-slate-100 dark:border-slate-800 gap-2 pb-2">
        {(['items', 'langs', 'subjs', 'bulk'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              playClickSound(settings.soundEnabled);
              setActiveTab(tab);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850'
            }`}
          >
            {tab === 'items' && 'Learning Items'}
            {tab === 'langs' && 'Languages'}
            {tab === 'subjs' && 'Subjects'}
            {tab === 'bulk' && 'Bulk Tools'}
          </button>
        ))}
      </div>

      {/* TABS CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        
        {/* TAB 1: LEARNING ITEMS */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add item form */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4 lg:col-span-1">
                <h3 className="text-sm font-black text-indigo-950 dark:text-white flex items-center gap-1.5 border-b pb-2 mb-3">
                  <Plus className="h-4 w-4" /> Add Learning Item
                </h3>

                <form onSubmit={submitItem(onAddLearningItem)} className="space-y-3.5 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Language</span>
                    <select {...regItem('language', { required: true })} className="rounded-xl border p-2 bg-white dark:bg-slate-800">
                      {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Subject / Category</span>
                    <select {...regItem('subject', { required: true })} className="rounded-xl border p-2 bg-white dark:bg-slate-800">
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Category Tag (e.g. Animals, Fruits)</span>
                    <input type="text" {...regItem('category', { required: true })} placeholder="Animals" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Word / Character (Target text)</span>
                    <input type="text" {...regItem('word', { required: true })} placeholder="CAT" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">English Translation Meaning (optional)</span>
                    <input type="text" {...regItem('meaning')} placeholder="A furry domestic animal" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Pronunciation phonetic guide (optional)</span>
                    <input type="text" {...regItem('pronunciation')} placeholder="kat" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Difficulty</span>
                    <select {...regItem('difficulty', { required: true })} className="rounded-xl border p-2 bg-white dark:bg-slate-800">
                      <option value="auto">Auto-classify by length</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Illustrative Cartoon Image</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-sky-50 file:text-sky-700" />
                    {imageBlob && <img src={imageBlob} alt="preview" className="h-16 w-16 object-contain border rounded-xl mt-2 bg-white" />}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-500">Pronunciation Audio (MP3/WAV)</span>
                    <input type="file" accept="audio/*" onChange={handleAudioFileChange} className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-sky-50 file:text-sky-700" />
                    {audioBlob && <span className="text-[10px] text-emerald-500 mt-1">✓ Audio recorded</span>}
                  </div>

                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-1">
                    <Save className="h-4 w-4" /> Save Learning Item
                  </button>
                </form>
              </div>

              {/* Items List Table */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search & Filter header */}
                <div className="flex flex-wrap gap-2.5 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 items-center justify-between">
                  <div className="flex flex-wrap gap-2 items-center text-xs">
                    <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)} className="rounded-xl border p-2 bg-white dark:bg-slate-800">
                      <option value="all">All Languages</option>
                      {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>

                    <select value={filterSubj} onChange={(e) => setFilterSubj(e.target.value)} className="rounded-xl border p-2 bg-white dark:bg-slate-800">
                      <option value="all">All Subjects</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <select value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)} className="rounded-xl border p-2 bg-white dark:bg-slate-800">
                      <option value="all">All Difficulties</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Search box */}
                  <div className="relative text-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search text/meaning..."
                      value={searchWord}
                      onChange={(e) => setSearchWord(e.target.value)}
                      className="pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-slate-800 w-full max-w-[200px]"
                    />
                  </div>
                </div>

                {/* Table display */}
                <div className="max-h-[500px] overflow-y-auto border border-slate-100 dark:border-slate-850 rounded-2xl">
                  {loadingItems ? (
                    <div className="py-12 text-center text-slate-400">Loading filtered items...</div>
                  ) : itemsList.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs font-semibold">
                      <thead>
                        <tr className="border-b bg-slate-50/20 text-slate-400 select-none">
                          <th className="p-3">Grapheme</th>
                          <th className="p-3">Language</th>
                          <th className="p-3">Subject</th>
                          <th className="p-3">Translation</th>
                          <th className="p-3">Difficulty</th>
                          <th className="p-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {itemsList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/20">
                            <td className="p-3 font-black text-indigo-900 dark:text-sky-400 flex items-center gap-2 font-tamil text-sm">
                              {item.image && <img src={item.image} alt="" className="h-8 w-8 object-cover rounded-lg bg-sky-50 border border-slate-200" />}
                              <span>{item.word}</span>
                            </td>
                            <td className="p-3 uppercase tracking-wider text-[10px] text-slate-400">{item.language}</td>
                            <td className="p-3 text-slate-500">{subjects.find(s => s.id === item.subject)?.name || item.subject}</td>
                            <td className="p-3 italic">{item.meaning || '-'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
                                item.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                                item.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {item.difficulty}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button onClick={() => onDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-slate-400">No items match the filters.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: LANGUAGES */}
        {activeTab === 'langs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Add Language Form */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-indigo-950 dark:text-white border-b pb-2 mb-3">
                Create New Language
              </h3>
              <form onSubmit={submitLang(onAddLanguage)} className="space-y-4 text-xs font-semibold">
                <div className="flex flex-col gap-1">
                  <span>Language ID (e.g. french)</span>
                  <input type="text" {...regLang('id', { required: true })} placeholder="french" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-1">
                  <span>Language Name (e.g. French)</span>
                  <input type="text" {...regLang('name', { required: true })} placeholder="French" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-1">
                  <span>Flag Emoji (e.g. 🇫🇷)</span>
                  <input type="text" {...regLang('flag', { required: true })} placeholder="🇫🇷" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-1.5 w-full">
                  <Plus className="h-4.5 w-4.5" /> Save Language
                </button>
              </form>
            </div>

            {/* Languages List */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">
                Active Languages
              </span>
              <div className="space-y-2 max-h-[350px] overflow-y-auto border p-2 rounded-2xl">
                {languages.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl select-none">{l.flag}</span>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white">{l.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {l.id}</span>
                      </div>
                    </div>
                    {!l.isDefault ? (
                      <button onClick={() => onDeleteLanguage(l.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-black px-2 py-0.5 rounded-lg select-none">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECTS */}
        {activeTab === 'subjs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Add Subject Form */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-indigo-950 dark:text-white border-b pb-2 mb-3">
                Create Subject Module
              </h3>
              <form onSubmit={submitSubj(onAddSubject)} className="space-y-4 text-xs font-semibold">
                <div className="flex flex-col gap-1">
                  <span>Subject ID (e.g. spelling)</span>
                  <input type="text" {...regSubj('id', { required: true })} placeholder="spelling" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-1">
                  <span>Subject Name (e.g. Missing Letter)</span>
                  <input type="text" {...regSubj('name', { required: true })} placeholder="Missing Letter" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-1">
                  <span>Icon Key (e.g. Book, Grid, Image, Grid)</span>
                  <input type="text" {...regSubj('icon', { required: true })} placeholder="Book" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-1">
                  <span>Module Route Path (e.g. /subject/missing-letter)</span>
                  <input type="text" {...regSubj('path', { required: true })} placeholder="/subject/missing-letter" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-1">
                  <span>Sorting Order (Sequence order)</span>
                  <input type="number" {...regSubj('order', { required: true })} placeholder="1" className="rounded-xl border p-2 bg-white dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-1">
                  <span>Short Description</span>
                  <textarea {...regSubj('description', { required: true })} placeholder="Fill blanks in a word." className="rounded-xl border p-2 bg-white dark:bg-slate-800 h-16" />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-1.5 w-full">
                  <Plus className="h-4.5 w-4.5" /> Save Subject
                </button>
              </form>
            </div>

            {/* Subjects List */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">
                Active Modules
              </span>
              <div className="space-y-2 max-h-[450px] overflow-y-auto border p-2 rounded-2xl">
                {subjects.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white">
                        {s.name} <span className="text-slate-400 font-normal">({s.order})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{s.description}</p>
                    </div>
                    {/* Exclude default paths from easy delete */}
                    {!s.path.startsWith('/subject/') || s.order > 10 ? (
                      <button onClick={() => onDeleteSubject(s.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-black px-2 py-0.5 rounded-lg select-none">
                        Core
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BULK TOOLS */}
        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-semibold">
            {/* Database backups */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-indigo-950 dark:text-white border-b pb-2 mb-2">
                Database JSON Backup & Restore
              </h3>
              
              <div className="space-y-3">
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Export the entire language learning deck (including images/audio) to a single JSON backup. You can import this file on another device.
                </p>

                <button onClick={handleExportJson} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-1.5 w-full">
                  <Download className="h-4.5 w-4.5" /> Export Database JSON
                </button>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                  <span className="block text-[11px] text-slate-500">Restore/Import Database JSON:</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-sky-50 file:text-sky-700 w-full" />
                </div>
              </div>
            </div>

            {/* PDF/Word Extractor */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-indigo-950 dark:text-white border-b pb-2 mb-2 flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-sky-500" /> Extractor: Parse Word / PDF Documents
              </h3>

              <form onSubmit={handleBulkExtract} className="space-y-3">
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Select a Word (.docx) or PDF (.pdf) file, pick the target language, and clicking Extract will auto-parse the text, extract unique words matching the script range, and save them.
                </p>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400">Target Language</span>
                  <select value={bulkLang} onChange={(e) => setBulkLang(e.target.value)} className="rounded-xl border p-2 bg-white dark:bg-slate-800">
                    <option value="">Select Language</option>
                    {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400">DOCX or PDF File</span>
                  <input type="file" accept=".docx,.pdf" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-sky-50 file:text-sky-700 w-full" />
                </div>

                <button 
                  type="submit" 
                  disabled={bulkParsing || !bulkFile || !bulkLang}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-1.5 w-full disabled:opacity-50"
                >
                  {bulkParsing ? 'Parsing Document...' : 'Extract & Save Words'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

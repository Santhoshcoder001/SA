import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { getTamilVoices } from '../utils/soundEffects';
import { X, Upload, Trash2, Copy, Check, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetProgress, exportProgress, importProgress, geminiApiKeyExists, clearCache } = useGameState();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'backup'>('audio');

  useEffect(() => {
    // Load speech voices
    const loadVoices = () => {
      setVoices(getTamilVoices());
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleExport = () => {
    const dataStr = exportProgress();
    navigator.clipboard.writeText(dataStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const success = importProgress(importText.trim());
    if (success) {
      setImportText('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="glass-panel relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800/80 dark:bg-slate-905"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                அமைப்புகள் <span className="text-slate-400 font-normal">| Settings</span>
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Links */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <button
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
                  activeTab === 'audio'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                ஒலி மற்றும் குரல் (Audio & Voice)
              </button>
              <button
                onClick={() => setActiveTab('backup')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
                  activeTab === 'backup'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                காப்புப்பிரதி (Backup & Reset)
              </button>
            </div>

            {/* Content Body */}
            <div className="max-h-[350px] overflow-y-auto p-5">
              {activeTab === 'audio' && (
                <div className="space-y-4">
                  {/* Master Sound */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">ஒலி விளைவுகள் (Sound Effects)</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Play win/lose feedback tones</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        settings.soundEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Text To Speech Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">தானியங்கி குரல் (Auto Pronunciation)</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Speak words using Text-To-Speech</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ ttsEnabled: !settings.ttsEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        settings.ttsEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          settings.ttsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {settings.ttsEnabled && (
                    <>
                      {/* TTS Provider Select */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          குரல் இயந்திரம் (Speech Engine)
                        </label>
                        <select
                          value={settings.ttsProvider}
                          onChange={(e) => updateSettings({ ttsProvider: e.target.value as 'browser' | 'gemini' })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <option value="browser">கணினி ஒலி (Free Browser TTS)</option>
                          <option value="gemini">Gemini TTS API (Multilingual)</option>
                        </select>
                      </div>

                      {settings.ttsProvider === 'browser' ? (
                        /* TTS Voice Selection (Browser SpeechSynthesis) */
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            குரல் தெரிவு (Speech Voice)
                          </label>
                          {voices.length > 0 ? (
                            <select
                              value={settings.ttsVoice}
                              onChange={(e) => updateSettings({ ttsVoice: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                            >
                              <option value="default">Default System Voice</option>
                              {voices.map((voice) => (
                                <option key={voice.name} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-start gap-2 rounded-xl bg-amber-50/50 p-2.5 dark:bg-amber-950/10 border border-amber-200/20">
                              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                                Tamil TTS Voice not detected in your browser. The app will attempt to use standard phonetic voices. You can also view word spellings.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Gemini Custom Configuration */
                        <div className="space-y-3.5">
                          {/* Voice ID input */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Gemini Voice Name
                            </label>
                            <input
                              type="text"
                              value={settings.geminiVoiceName}
                              onChange={(e) => updateSettings({ geminiVoiceName: e.target.value.trim() || 'Kore' })}
                              placeholder="e.g. Kore"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                            />
                          </div>

                          {/* API Key Status Indicator */}
                          <div className="text-[11px] leading-relaxed">
                            {geminiApiKeyExists ? (
                              <div className="flex items-center gap-1.5 text-success-600 dark:text-success-400 font-semibold">
                                <span className="h-2 w-2 rounded-full bg-success-500"></span>
                                API Key detected in root .env
                              </div>
                            ) : (
                              <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-450 font-semibold">
                                <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                                <span>API Key not found. Please add <code>VITE_GEMINI_API_KEY</code> to the <code>.env</code> file in your project root and restart the server.</span>
                              </div>
                            )}
                          </div>

                          {/* Clear Cache Button */}
                          <button
                            onClick={clearCache}
                            className="rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold py-1.5 px-3 w-full text-center transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                          >
                            ஒலி சேமிப்பை நீக்கு (Clear Audio Cache)
                          </button>
                        </div>
                      )}

                      {/* TTS Rate Control */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>பேச்சு வேகம் (Speech Rate)</span>
                          <span className="text-brand-500 font-mono">{settings.ttsSpeed}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={settings.ttsSpeed}
                          onChange={(e) => updateSettings({ ttsSpeed: parseFloat(e.target.value) })}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-800 accent-brand-500"
                        />
                      </div>

                      {/* TTS Pitch Control */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>சுருதி (Speech Pitch)</span>
                          <span className="text-brand-500 font-mono">{settings.pitch}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={settings.pitch}
                          onChange={(e) => updateSettings({ pitch: parseFloat(e.target.value) })}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-800 accent-brand-500"
                        />
                      </div>

                      {/* TTS Volume Control */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>ஒலி அளவு (Speech Volume)</span>
                          <span className="text-brand-500 font-mono">{Math.round(settings.volume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="1.0"
                          step="0.1"
                          value={settings.volume}
                          onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-800 accent-brand-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'backup' && (
                <div className="space-y-4">
                  {/* Backup Export */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">தரவுகளை ஏற்றுமதி (Export Progress)</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExport}
                        className="flex-1 btn-secondary text-xs py-2 bg-slate-50 hover:bg-slate-100"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-success-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> Copy Backup Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Backup Import */}
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">தரவுகளை இறக்குமதி (Import Progress)</h3>
                    <textarea
                      placeholder="Paste backup code here..."
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      className="h-16 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    />
                    <button
                      onClick={handleImport}
                      disabled={!importText.trim()}
                      className="w-full btn-primary text-xs py-2.5 disabled:opacity-40"
                    >
                      <Upload className="h-4 w-4" /> Import Backup
                    </button>
                  </div>

                  {/* Factory Reset */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={resetProgress}
                      className="w-full rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 px-4 py-2.5 text-xs font-semibold text-red-600 dark:bg-red-950/10 dark:border-red-950/20 dark:hover:bg-red-950/20 flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" /> மீட்டமை (Reset All Data)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 flex justify-end dark:border-slate-800 dark:bg-slate-900/20">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                சரி (Done)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

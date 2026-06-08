import React, { useState } from 'react';
import GovernanceGameDE from './GovernanceGame.de';
import GovernanceGameEN from './GovernanceGame.en';

type Language = 'de' | 'en' | null;

export default function App() {
  const [language, setLanguage] = useState<Language>(null);

  if (language === 'de') {
    return (
      <>
        <LanguageSwitch current="de" onSelect={setLanguage} />
        <GovernanceGameDE />
      </>
    );
  }

  if (language === 'en') {
    return (
      <>
        <LanguageSwitch current="en" onSelect={setLanguage} />
        <GovernanceGameEN />
      </>
    );
  }

  return <LanguageStart onSelect={setLanguage} />;
}

function LanguageStart({ onSelect }: { onSelect: (language: Language) => void }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6 font-sans">
      <section className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-blue-400 mb-3">SAI Governance Challenge</p>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">Choose language</h1>
        <p className="text-slate-400 mb-8">
          Select the version you want to play. Each player runs the simulation independently in their own browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelect('de')}
            className="rounded-xl border border-blue-500 bg-blue-900/40 hover:bg-blue-800/50 p-5 text-left transition"
          >
            <div className="text-2xl font-black text-white mb-1">Deutsch</div>
            <div className="text-sm text-slate-300">Deutsche Spielversion öffnen</div>
          </button>

          <button
            type="button"
            onClick={() => onSelect('en')}
            className="rounded-xl border border-emerald-500 bg-emerald-900/40 hover:bg-emerald-800/50 p-5 text-left transition"
          >
            <div className="text-2xl font-black text-white mb-1">English</div>
            <div className="text-sm text-slate-300">Open English game version</div>
          </button>
        </div>
      </section>
    </main>
  );
}

function LanguageSwitch({ current, onSelect }: { current: Exclude<Language, null>; onSelect: (language: Language) => void }) {
  return (
    <div className="fixed top-3 right-3 z-[100] flex gap-2 rounded-full bg-slate-950/80 border border-slate-700 p-1 backdrop-blur-md shadow-xl">
      <button
        type="button"
        onClick={() => onSelect('de')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition ${current === 'de' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => onSelect('en')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition ${current === 'en' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="px-3 py-1 rounded-full text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
      >
        Menu
      </button>
    </div>
  );
}

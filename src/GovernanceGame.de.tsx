import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Globe, ThermometerSnowflake, Droplets, Wheat, AlertTriangle, Info, ArrowRight, Play, AlertOctagon, BookOpen, Activity, Scale } from 'lucide-react';

const INITIAL_STATE = {
  temperatur: 1.6, // Start 2030 (leicht über 1.5)
  eis: 70, // % des historischen Arktiseises
  c3c4: 80, // % Nahrungssicherheit
  monsun: 85, // % Stabilität des hydrologischen Zyklus
};

const GovernanceGame = () => {
  // --- Game State ---
  const [year, setYear] = useState(2030);
  const [isGameOver, setIsGameOver] = useState(false);
  const [terminationShock, setTerminationShock] = useState(false);
  
  // --- Indicators ---
  const [indicators, setIndicators] = useState(INITIAL_STATE);
  const [previousIndicators, setPreviousIndicators] = useState(INITIAL_STATE);
  
  // --- UI State ---
  const [showDecadeReport, setShowDecadeReport] = useState(false);

  // --- History for Charts ---
  const [history, setHistory] = useState([
    { year: 2030, temperatur: 1.6, eis: 70, c3c4: 80, monsun: 85, ohneSAI: 1.6 }
  ]);

  // --- Player Choices (Current Decade) ---
  const [targetTemp, setTargetTemp] = useState('1.5'); // 1.5, 1.0, pause
  const [season, setSeason] = useState('iANNUAL'); // iANNUAL, iSPRING, iAUTUMN
  const [latitude, setLatitude] = useState('tropical'); // tropical, polar

  // --- Track all choices for end-game analysis ---
  const [strategyLog, setStrategyLog] = useState([]);

  // --- Logic: Process Decade ---
  const processDecade = () => {
    // 1. Check for Termination Shock (Paused after aggressive cooling)
    const prevTemp = history[history.length - 1].temperatur;
    if (targetTemp === 'pause' && prevTemp < 1.6 && year > 2030) {
      setTerminationShock(true);
      setIsGameOver(true);
      return;
    }

    const nextYear = year + 10;
    
    // Log choice
    setStrategyLog(prev => [...prev, { year, targetTemp, season, latitude }]);

    // Calculate new base warming (without SAI)
    const newOhneSAI = 1.6 + ((nextYear - 2030) * 0.25); // Steigt pro Jahrzehnt

    // Calculate new indicators based on choices
    let newTemp = indicators.temperatur;
    let newEis = indicators.eis;
    let newC3C4 = indicators.c3c4;
    let newMonsun = indicators.monsun;

    // --- Apply Physics/Chemistry based on Papers ---
    
    // TARGET TEMP
    if (targetTemp === '1.5') {
      newTemp = 1.5;
      newC3C4 -= 2; // Leichter Stress durch Aerosole
    } else if (targetTemp === '1.0') {
      newTemp = 1.0;
      newC3C4 += 5; // C3 Pflanzen (Reis/Weizen) in Asien profitieren massiv von weniger Hitze
      newMonsun -= 15; // Massiver Eingriff in den Wasserkreislauf
    } else if (targetTemp === 'pause') {
      newTemp = newOhneSAI;
      newEis -= 20;
    }

    // SEASONALITY (Visioni et al.)
    if (targetTemp !== 'pause') {
      if (season === 'iSPRING') {
        newMonsun -= 10; // Trocknet Amazonas stärker aus
        newEis -= 5; // Weniger effektiv für Sommer-Eis
      } else if (season === 'iAUTUMN') {
        newEis += 15; // Stellt Arktis Eis im September optimal her
        newMonsun += 5; // Schont indischen Monsun besser
      } else {
        newEis += 5; // iANNUAL baseline
      }
    }

    // LATITUDE (Polar Region Review & Cohen et al.)
    if (targetTemp !== 'pause') {
      if (latitude === 'polar') {
        newEis += 20; // Maximaler Schutz für Kryosphäre
        newMonsun -= 25; // Verschiebt ITCZ massiv! Dürre im Globalen Süden
        newC3C4 -= 15; // C4 Pflanzen (Mais) in Westafrika vertrocknen
      } else {
        // Tropical - Standard Brewer-Dobson Zirkulation
        newC3C4 -= 5; // Leichte Überkühlung der Tropen
      }
    }

    // Cap values
    newEis = Math.max(0, Math.min(100, newEis));
    newC3C4 = Math.max(0, Math.min(100, newC3C4));
    newMonsun = Math.max(0, Math.min(100, newMonsun));

    const newData = {
      temperatur: Number(newTemp.toFixed(2)),
      eis: Number(newEis.toFixed(0)),
      c3c4: Number(newC3C4.toFixed(0)),
      monsun: Number(newMonsun.toFixed(0)),
    };

    setPreviousIndicators(indicators); // Speichere alte Werte für den Bericht
    setIndicators(newData);
    setHistory(prev => [...prev, { year: nextYear, ...newData, ohneSAI: Number(newOhneSAI.toFixed(2)) }]);
    setYear(nextYear);
    
    // Zeige das Zwischenbericht-Modal an
    setShowDecadeReport(true);
  };

  const closeDecadeReport = () => {
    setShowDecadeReport(false);
    if (year >= 2070) {
      setIsGameOver(true);
    }
  };

  const resetGame = () => {
    setYear(2030);
    setIndicators(INITIAL_STATE);
    setPreviousIndicators(INITIAL_STATE);
    setHistory([{ year: 2030, ...INITIAL_STATE, ohneSAI: 1.6 }]);
    setIsGameOver(false);
    setTerminationShock(false);
    setStrategyLog([]);
    setShowDecadeReport(false);
    setTargetTemp('1.5');
    setSeason('iANNUAL');
    setLatitude('tropical');
  };

  // Hilfsfunktion zur Farbgebung im Zwischenbericht
  const getDiffColor = (key, diff) => {
    if (diff === 0) return 'text-slate-500';
    // Bei Temperatur ist ein Anstieg (diff > 0) schlecht (rot), sinken ist blau (Kühlung)
    if (key === 'temperatur') return diff > 0 ? 'text-red-400' : 'text-blue-400';
    // Bei allen anderen Prozentwerten ist ein Anstieg gut (grün) und ein Abfall schlecht (rot)
    return diff > 0 ? 'text-emerald-400' : 'text-red-400';
  };

  // --- Scientific Explanations Component (Post-Game) ---
  const ScientificReport = () => {
    // Analyze dominant strategies
    const polarCount = strategyLog.filter(s => s.latitude === 'polar').length;
    const autumnCount = strategyLog.filter(s => s.season === 'iAUTUMN').length;
    const springCount = strategyLog.filter(s => s.season === 'iSPRING').length;
    const aggressiveCount = strategyLog.filter(s => s.targetTemp === '1.0').length;

    return (
      <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen className="text-blue-400"/> Wissenschaftliche Auswertung (Jahr 2070)
        </h3>
        <p className="mb-6 text-slate-400 italic">Hier erfahren Sie die fachlichen Zusammenhänge, warum sich die globalen Indikatoren über die Jahrzehnte so entwickelt haben, wie Sie es in den Zwischenberichten beobachten konnten.</p>
        
        {/* Temperatur & Basis-Klima */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-red-300 text-lg mb-2 flex items-center gap-2"><ThermometerSnowflake size={18}/> Die Temperatur-Illusion</h4>
          <p className="mb-2"><strong>Resultat:</strong> Die globale Durchschnittstemperatur liegt bei +{indicators.temperatur.toFixed(1)}°C über dem vorindustriellen Niveau.</p>
          <p>
            Obwohl die globale Durchschnittstemperatur ein wichtiges politisches Ziel ist, kaschiert sie die zugrunde liegende Physik: <strong>Eine durch Aerosole auf 1,5°C gekühlte Welt ist klimatisch nicht identisch mit einer vorindustriellen 1,5°C-Welt.</strong> 
            Während Treibhausgase wie CO₂ die langwellige Wärmeabstrahlung global und rund um die Uhr blockieren, reflektieren stratosphärische Aerosole die kurzwellige Sonneneinstrahlung nur tagsüber. 
            {aggressiveCount > 1 
              ? " Durch Ihre aggressive Kühlungsstrategie haben Sie den globalen Temperaturgradienten (den Unterschied zwischen Äquator und Polen) stark verändert. Dies dämpft die Verdunstung und verlangsamt den globalen Wasserkreislauf extrem." 
              : " Selbst bei Ihrer moderaten Kühlung ändert sich die Verteilung der Energie im Erdsystem. Die Reduktion der Sonneneinstrahlung bremst die globale Verdunstung und führt zu einem trägeren Wasserkreislauf, auch wenn die Durchschnittstemperatur stabil bleibt."}
          </p>
        </div>

        {/* Arktis & Kryosphäre */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-blue-300 text-lg mb-2 flex items-center gap-2"><Globe size={18}/> Arktis & Ozeanzirkulation</h4>
          <p className="mb-2"><strong>Resultat:</strong> Das arktische Meereis liegt bei {indicators.eis}%.</p>
          <p>
            {polarCount > 1 || autumnCount > 1 
              ? "Ihre gezielten Maßnahmen haben das Meereis stabilisiert. Laut Visioni et al. ist die Injektion im Herbst (iAUTUMN) besonders effektiv, da sie den Strahlungsantrieb genau dann maximiert, wenn das Eis im polaren Sommer am verwundbarsten ist. Polare Injektionen verhindern zudem das Auftauen des Permafrosts effizienter als tropische Ansätze."
              : "Durch die tropische Standard-Injektion wurde die Arktis 'unterkühlt'. Studien (z.B. Polar Regions Review) zeigen, dass sich Aerosole vom Äquator durch die Brewer-Dobson-Zirkulation verteilen, was die Tropen stark kühlt, aber an den Polen nicht ausreicht, um den Eisverlust durch Treibhausgase vollständig zu stoppen."}
          </p>
        </div>

        {/* Hydrologie & ITCZ */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-cyan-300 text-lg mb-2 flex items-center gap-2"><Droplets size={18}/> Globaler Wasserkreislauf & Monsun</h4>
          <p className="mb-2"><strong>Resultat:</strong> Stabilität des Wasserkreislaufs bei {indicators.monsun}%.</p>
          <p>
            {polarCount > 1
              ? "ACHTUNG: Ihre polaren Injektionen haben den globalen Temperaturgradienten zwischen Nord- und Südhalbkugel gestört. Dies zwingt die Innertropische Konvergenzzone (ITCZ) dazu, sich in die wärmere Hemisphäre zu verschieben. Die Folge sind katastrophale Dürren in der afrikanischen Sahelzone und im Amazonasgebiet."
              : springCount > 1
              ? "Die iSPRING-Strategie ist zwar extrem effizient (benötigt 23% weniger Schwefeldioxid), hat jedoch laut Modellierungen zu einer signifikanten Reduktion der Niederschläge im Amazonasbecken geführt, was das Risiko von Waldbränden erhöht."
              : "Durch den Verzicht auf asymmetrische Injektionen blieb die ITCZ relativ stabil. Dennoch schwächt jede Form von SAI den globalen hydrologischen Zyklus leicht ab (weniger Verdunstung bei gleicher CO2-Konzentration)."}
          </p>
        </div>

        {/* Landwirtschaft C3/C4 */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-amber-300 text-lg mb-2 flex items-center gap-2"><Wheat size={18}/> Landwirtschaft (C3 vs. C4 Pflanzen)</h4>
          <p className="mb-2"><strong>Resultat:</strong> Nahrungsmittelsicherheit bei {indicators.c3c4}%.</p>
          <p>
            {aggressiveCount > 0
              ? "Sie haben die Temperaturen aggressiv gesenkt. Wie Cohen et al. in ihrer regionalen Studie zeigen, profitieren C3-Pflanzen (Reis, Weizen) in Asien enorm von SAI, da Hitzestress (TXx) abnimmt und gleichzeitig der CO2-Düngungseffekt erhalten bleibt."
              : "Moderate Kühlung."}
             {polarCount > 0 || indicators.monsun < 50
              ? " Allerdings kam es zu einer Katastrophe bei C4-Pflanzen (wie Mais) in Westafrika und Mittelamerika. Diese Pflanzen sind resistenter gegen Hitze, aber extrem abhängig von Bodenfeuchtigkeit. Die durch SAI induzierten Dürren haben hier die Erträge massiv einbrechen lassen (Trade-off zwischen Asien und Afrika)."
              : " Ihre ausbalancierte Strategie hat die Bodenfeuchtigkeit in Westafrika weitgehend erhalten, was einen Kollaps der Maisernten verhinderte."}
          </p>
        </div>

        {/* Fazit & Kompromisse */}
        <div className="bg-slate-900 p-6 rounded-xl border-2 border-slate-700 shadow-xl mt-8">
          <h4 className="font-black text-white text-xl mb-4 flex items-center gap-3">
            <Scale className="text-amber-500" size={24}/> 
            Fazit: Die Illusion der optimalen Lösung
          </h4>
          <p className="mb-4">
            Diese Simulation verdeutlicht das zentrale Dilemma der solaren Strahlungsmodifikation (SRM). <strong>Es ist physikalisch unmöglich, alle Klimaindikatoren gleichzeitig auf ihr historisches Niveau zurückzusetzen.</strong> Jede technische Intervention erfordert harte, geopolitische Kompromisse (Trade-offs):
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-300">
            <li><strong>Der Nord-Süd-Konflikt:</strong> Rettet man das arktische Meereis durch polare Injektionen, verschiebt man die tropischen Regengürtel (ITCZ) und riskiert lebensbedrohliche Dürren im Globalen Süden (z.B. in der Sahelzone).</li>
            <li><strong>Das Landwirtschafts-Dilemma:</strong> Kühlt man die Erde aggressiv, um Hitzetote und Ernteausfälle bei Weizen und Reis (C3) in Asien zu verhindern, schwächt man den globalen Monsun ab, was sensible Pflanzen wie Mais (C4) in Afrika gefährdet.</li>
            <li><strong>Der Zeit-Wirtschafts-Konflikt:</strong> Eine effiziente Injektion im Frühjahr spart Milliarden an Kosten für die Supermächte, trocknet aber den Amazonas-Regenwald stark aus.</li>
          </ul>
          <p>
            <strong>Geoengineering ist folglich kein rein technisches, sondern primär ein geopolitisches Problem.</strong> Es gibt keine "perfekte" Einstellung des globalen Thermostats, sondern nur Entscheidungen darüber, <em>welche Regionen</em> und <em>welche Ökosysteme</em> die Last der unweigerlichen Nebenwirkungen tragen müssen. Ohne einen globalen Konsens und Mechanismen zur Entschädigung der Verlierer (z.B. durch einen Loss-and-Damage-Fonds) birgt SAI das Risiko immenser internationaler Konflikte.
          </p>
        </div>

      </div>
    );
  };

  // --- Screens ---
  if (isGameOver && terminationShock) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertOctagon size={80} className="text-red-500 mb-6 animate-bounce" />
        <h1 className="text-5xl font-black text-white mb-4 tracking-tight">TERMINATION SHOCK</h1>
        <div className="max-w-2xl bg-red-950/40 border border-red-800 p-8 rounded-2xl text-slate-300 text-left space-y-4">
          <p className="text-lg font-bold text-red-400">Das Geoengineering-Programm wurde abrupt abgebrochen!</p>
          <p>
            Während der Jahrzehnte der künstlichen Kühlung stieg die CO₂-Konzentration in der Atmosphäre ungebremst weiter an. Das Aerosol-Schild hat diese enorme Energiemenge lediglich maskiert.
          </p>
          <p>
            Da stratosphärische Aerosole eine Lebensdauer von nur 1 bis 2 Jahren haben, wäscht sich der Schwefel nun rasend schnell aus. Die globale Temperatur schnellt innerhalb eines Jahrzehnts um <strong>mehrere Grad Celsius</strong> nach oben. Diese Erwärmungsrate ist historisch beispiellos; Ökosysteme haben keine Zeit zur Anpassung, was zu einem sofortigen globalen Klimakollaps führt.
          </p>
          <button onClick={resetGame} className="mt-6 w-full py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl transition">
            Simulation Neu Starten
          </button>
        </div>
      </div>
    );
  }

  if (isGameOver && year >= 2070 && !showDecadeReport) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 font-sans overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white mb-2">Gipfel Abgeschlossen: 2070</h1>
            <p className="text-slate-400">Die langfristigen Auswirkungen Ihrer Klima-Interventionen.</p>
          </div>

          {/* Final Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Endtemperatur</div>
              <div className={`text-2xl font-black ${indicators.temperatur > 1.5 ? 'text-red-400' : 'text-emerald-400'}`}>+{indicators.temperatur.toFixed(1)}°C</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Arktis-Eis</div>
              <div className={`text-2xl font-black ${indicators.eis < 40 ? 'text-red-400' : 'text-blue-400'}`}>{indicators.eis}%</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Nahrung (C3/C4)</div>
              <div className={`text-2xl font-black ${indicators.c3c4 < 50 ? 'text-red-400' : 'text-amber-400'}`}>{indicators.c3c4}%</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Monsun & Regen</div>
              <div className={`text-2xl font-black ${indicators.monsun < 50 ? 'text-red-400' : 'text-cyan-400'}`}>{indicators.monsun}%</div>
            </div>
          </div>

          <ScientificReport />

          <button onClick={resetGame} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/50 mt-8">
            Neue Simulation Starten
          </button>
        </div>
      </div>
    );
  }

  // --- Main Dashboard (Playing) ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans overflow-x-hidden relative">
      
      {/* --- DECADE REPORT MODAL --- */}
      {showDecadeReport && !isGameOver && !terminationShock && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Activity className="text-blue-400" />
              Statusbericht: {year}
            </h2>
            <p className="text-slate-400 mb-6 text-sm">Dies sind die messbaren Befunde nach Ihren Interventionen in der vergangenen Dekade. Erklärungen für diese Reaktionen erhalten Sie in der Auswertung 2070.</p>

            <div className="space-y-3">
              {/* Temp Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><ThermometerSnowflake size={18}/> Globale Temperatur</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.temperatur.toFixed(1)}°C</span>
                  <span className={`text-sm font-bold ${getDiffColor('temperatur', indicators.temperatur - previousIndicators.temperatur)}`}>
                    ({indicators.temperatur >= previousIndicators.temperatur ? '+' : ''}{(indicators.temperatur - previousIndicators.temperatur).toFixed(1)}°C)
                  </span>
                </div>
              </div>

              {/* Eis Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><Globe size={18}/> Arktis Eis-Volumen</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.eis}%</span>
                  <span className={`text-sm font-bold ${getDiffColor('eis', indicators.eis - previousIndicators.eis)}`}>
                    ({indicators.eis >= previousIndicators.eis ? '+' : ''}{indicators.eis - previousIndicators.eis}%)
                  </span>
                </div>
              </div>

              {/* C3C4 Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><Wheat size={18}/> Landwirtschaft (C3/C4)</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.c3c4}%</span>
                  <span className={`text-sm font-bold ${getDiffColor('c3c4', indicators.c3c4 - previousIndicators.c3c4)}`}>
                    ({indicators.c3c4 >= previousIndicators.c3c4 ? '+' : ''}{indicators.c3c4 - previousIndicators.c3c4}%)
                  </span>
                </div>
              </div>

              {/* Monsun Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><Droplets size={18}/> Wasserkreislauf</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.monsun}%</span>
                  <span className={`text-sm font-bold ${getDiffColor('monsun', indicators.monsun - previousIndicators.monsun)}`}>
                    ({indicators.monsun >= previousIndicators.monsun ? '+' : ''}{indicators.monsun - previousIndicators.monsun}%)
                  </span>
                </div>
              </div>
            </div>

            <button onClick={closeDecadeReport} className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex justify-center items-center gap-2">
              {year >= 2070 ? "Zur globalen Endauswertung" : "Verstanden - Nächste Dekade planen"} <ArrowRight size={18}/>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`mb-8 border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-opacity ${showDecadeReport ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Globe className="text-blue-400" size={32} />
            SAI Governance Challenge
          </h1>
          <p className="text-slate-400 mt-1">Das Dilemma des globalen Thermostats | Status im Jahr: <span className="text-white font-mono">{year}</span></p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm font-medium">Zieljahr: 2070</span>
          </div>
        </div>
      </header>

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-opacity ${showDecadeReport ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        
        {/* LEFT PANEL: Decisions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
              Planung: {year} bis {year + 10}
            </h2>
            
            {/* Ebene 1: Temperaturziel */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-300 mb-3">Ebene 1: Temperaturziel</label>
              <div className="space-y-2">
                <label className={`block p-3 rounded-xl border cursor-pointer transition ${targetTemp === '1.5' ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                  <input type="radio" name="target" className="hidden" checked={targetTemp === '1.5'} onChange={() => setTargetTemp('1.5')} />
                  <div className="font-bold text-blue-300">Stabilisieren bei 1.5°C</div>
                  <div className="text-xs text-slate-400 mt-1">Basis-Geoengineering. Moderater Eingriff.</div>
                </label>
                <label className={`block p-3 rounded-xl border cursor-pointer transition ${targetTemp === '1.0' ? 'bg-emerald-900/40 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                  <input type="radio" name="target" className="hidden" checked={targetTemp === '1.0'} onChange={() => setTargetTemp('1.0')} />
                  <div className="font-bold text-emerald-300">Aggressiv Kühlen (1.0°C)</div>
                  <div className="text-xs text-slate-400 mt-1">Stoppt Hitzewellen, Risiko für Wasserkreislauf.</div>
                </label>
                <label className={`block p-3 rounded-xl border cursor-pointer transition ${targetTemp === 'pause' ? 'bg-red-900/40 border-red-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                  <input type="radio" name="target" className="hidden" checked={targetTemp === 'pause'} onChange={() => setTargetTemp('pause')} />
                  <div className="font-bold text-red-300">SAI Pausieren (Keine Injektion)</div>
                  <div className="text-xs text-slate-400 mt-1">Vorsicht: Kann Termination Shock auslösen!</div>
                </label>
              </div>
            </div>

            {/* Ebene 2: Saisonalität */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                Ebene 2: Saisonalität
                <div className="group relative">
                  <Info size={16} className="text-slate-500" />
                  <div className="absolute right-0 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50 bottom-full mb-2">
                    Jahreszeitliche Anpassung der Aerosol-Injektionen zur Steuerung spezifischer Klimasysteme.
                  </div>
                </div>
              </label>
              <select value={season} onChange={(e) => setSeason(e.target.value)} disabled={targetTemp === 'pause'}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
                <option value="iANNUAL">Ganzjährig (Standard)</option>
                <option value="iSPRING">Frühjahrsinjektion (iSPRING)</option>
                <option value="iAUTUMN">Herbstinjektion (iAUTUMN)</option>
              </select>
            </div>

            {/* Ebene 3: Breitengrad */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                Ebene 3: Injektionsort
                <div className="group relative">
                  <Info size={16} className="text-slate-500" />
                  <div className="absolute right-0 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50 bottom-full mb-2">
                    Die Wahl des geografischen Injektionsortes beeinflusst die globale Verteilung und regionale Temperaturgradienten.
                  </div>
                </div>
              </label>
              <select value={latitude} onChange={(e) => setLatitude(e.target.value)} disabled={targetTemp === 'pause'}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
                <option value="tropical">Tropisch/Äquatorial (Globale Zirkulation)</option>
                <option value="polar">Polar (Gezielter lokaler Einsatz)</option>
              </select>
            </div>

            {/* ACTION BUTTON */}
            <button onClick={processDecade} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50">
              <Play size={18} />
              Jahrzehnt Abschließen
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Data & Charts */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Status Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <ThermometerSnowflake size={24} className={indicators.temperatur > 1.5 ? 'text-red-400' : 'text-blue-400'} />
               <span className="text-xs text-slate-400 mt-2">Globale Temp.</span>
               <span className="text-xl font-bold font-mono text-white">+{indicators.temperatur.toFixed(1)}°C</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <Globe size={24} className={indicators.eis < 40 ? 'text-red-400' : 'text-cyan-400'} />
               <span className="text-xs text-slate-400 mt-2">Arktis Eis</span>
               <span className="text-xl font-bold font-mono text-white">{indicators.eis}%</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center relative group">
               <Wheat size={24} className={indicators.c3c4 < 50 ? 'text-red-400' : 'text-amber-400'} />
               <span className="text-xs text-slate-400 mt-2">Ernten (C3/C4)</span>
               <span className="text-xl font-bold font-mono text-white">{indicators.c3c4}%</span>
               {/* Tooltip für C3/C4 */}
               <div className="absolute top-full mt-2 w-48 p-2 bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible z-50">
                 Allgemeiner Stabilitätsindex der pflanzlichen Landwirtschaft weltweit.
               </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <Droplets size={24} className={indicators.monsun < 50 ? 'text-red-400' : 'text-blue-500'} />
               <span className="text-xs text-slate-400 mt-2">Monsun / Regen</span>
               <span className="text-xl font-bold font-mono text-white">{indicators.monsun}%</span>
            </div>
          </div>

          {/* Charts Container */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex-1 flex flex-col gap-6">
            
            {/* Temp Chart */}
            <div className="w-full h-[250px]">
              <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Temperatur-Trajektorie (°C)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 20, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="year" stroke="#64748b" tick={{fontSize: 12}} type="number" domain={[2030, 2070]} ticks={[2030, 2040, 2050, 2060, 2070]} />
                  <YAxis stroke="#64748b" domain={[0, 3]} tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} itemStyle={{ color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }}/>
                  <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: '1.5°C Ziel', fill: '#10b981', fontSize: 10 }} />
                  <Line type="linear" dataKey="ohneSAI" name="Klima (Ohne SAI)" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} legendType="plainline" />
                  <Line type="linear" dataKey="temperatur" name="Reale Temp." stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} legendType="circle" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Regional Impacts Chart */}
            <div className="w-full h-[250px]">
              <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Regionale Stabilität (%)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 20, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="year" stroke="#64748b" tick={{fontSize: 12}} type="number" domain={[2030, 2070]} ticks={[2030, 2040, 2050, 2060, 2070]} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }}/>
                  <Line type="linear" dataKey="eis" name="Arktis Eis" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4 }} legendType="diamond" />
                  <Line type="linear" dataKey="c3c4" name="C3/C4 Ernten" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4 }} legendType="square" />
                  <Line type="linear" dataKey="monsun" name="Monsun / ITCZ" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} legendType="triangle" />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernanceGame;
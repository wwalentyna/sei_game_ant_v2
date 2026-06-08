import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Globe, ThermometerSnowflake, Droplets, Wheat, AlertTriangle, Info, ArrowRight, Play, AlertOctagon, BookOpen, Activity, Scale } from 'lucide-react';

const INITIAL_STATE = {
  temperature: 1.6, // Start 2030 (slightly above 1.5)
  ice: 70, // % of historical Arctic ice
  c3c4: 80, // % food security
  monsoon: 85, // % stability of the hydrological cycle
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
    { year: 2030, temperature: 1.6, ice: 70, c3c4: 80, monsoon: 85, withoutSAI: 1.6 }
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
    const prevTemp = history[history.length - 1].temperature;
    if (targetTemp === 'pause' && prevTemp < 1.6 && year > 2030) {
      setTerminationShock(true);
      setIsGameOver(true);
      return;
    }

    const nextYear = year + 10;
    
    // Log choice
    setStrategyLog(prev => [...prev, { year, targetTemp, season, latitude }]);

    // Calculate new base warming (without SAI)
    const newWithoutSAI = 1.6 + ((nextYear - 2030) * 0.25); // Increases per decade

    // Calculate new indicators based on choices
    let newTemp = indicators.temperature;
    let newIce = indicators.ice;
    let newC3C4 = indicators.c3c4;
    let newMonsoon = indicators.monsoon;

    // --- Apply Physics/Chemistry based on Papers ---
    
    // TARGET TEMP
    if (targetTemp === '1.5') {
      newTemp = 1.5;
      newC3C4 -= 2; // Slight stress due to aerosols
    } else if (targetTemp === '1.0') {
      newTemp = 1.0;
      newC3C4 += 5; // C3 crops (rice/wheat) in Asia benefit massively from less heat
      newMonsoon -= 15; // Massive intervention in the water cycle
    } else if (targetTemp === 'pause') {
      newTemp = newWithoutSAI;
      newIce -= 20;
    }

    // SEASONALITY (Visioni et al.)
    if (targetTemp !== 'pause') {
      if (season === 'iSPRING') {
        newMonsoon -= 10; // Dries out Amazon more
        newIce -= 5; // Less effective for summer ice
      } else if (season === 'iAUTUMN') {
        newIce += 15; // Optimally restores Arctic ice in September
        newMonsoon += 5; // Better preserves Indian monsoon
      } else {
        newIce += 5; // iANNUAL baseline
      }
    }

    // LATITUDE (Polar Region Review & Cohen et al.)
    if (targetTemp !== 'pause') {
      if (latitude === 'polar') {
        newIce += 20; // Maximum protection for cryosphere
        newMonsoon -= 25; // Shifts ITCZ massively! Drought in the Global South
        newC3C4 -= 15; // C4 crops (maize) in West Africa wither
      } else {
        // Tropical - Standard Brewer-Dobson Circulation
        newC3C4 -= 5; // Slight overcooling of the tropics
      }
    }

    // Cap values
    newIce = Math.max(0, Math.min(100, newIce));
    newC3C4 = Math.max(0, Math.min(100, newC3C4));
    newMonsoon = Math.max(0, Math.min(100, newMonsoon));

    const newData = {
      temperature: Number(newTemp.toFixed(2)),
      ice: Number(newIce.toFixed(0)),
      c3c4: Number(newC3C4.toFixed(0)),
      monsoon: Number(newMonsoon.toFixed(0)),
    };

    setPreviousIndicators(indicators); // Save old values for the report
    setIndicators(newData);
    setHistory(prev => [...prev, { year: nextYear, ...newData, withoutSAI: Number(newWithoutSAI.toFixed(2)) }]);
    setYear(nextYear);
    
    // Show intermediate report modal
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
    setHistory([{ year: 2030, ...INITIAL_STATE, withoutSAI: 1.6 }]);
    setIsGameOver(false);
    setTerminationShock(false);
    setStrategyLog([]);
    setShowDecadeReport(false);
    setTargetTemp('1.5');
    setSeason('iANNUAL');
    setLatitude('tropical');
  };

  // Helper function for coloring in the intermediate report
  const getDiffColor = (key, diff) => {
    if (diff === 0) return 'text-slate-500';
    // For temperature, an increase (diff > 0) is bad (red), decrease is blue (cooling)
    if (key === 'temperature') return diff > 0 ? 'text-red-400' : 'text-blue-400';
    // For all other percentages, an increase is good (green) and a decrease is bad (red)
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
          <BookOpen className="text-blue-400"/> Scientific Evaluation (Year 2070)
        </h3>
        <p className="mb-6 text-slate-400 italic">Here you can learn about the scientific mechanisms explaining why the global indicators developed over the decades exactly as you observed in the intermediate reports.</p>
        
        {/* Temperature & Base Climate */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-red-300 text-lg mb-2 flex items-center gap-2"><ThermometerSnowflake size={18}/> The Temperature Illusion</h4>
          <p className="mb-2"><strong>Result:</strong> The global average temperature is +{indicators.temperature.toFixed(1)}°C above pre-industrial levels.</p>
          <p>
            Although global average temperature is a crucial political target, it masks the underlying physics: <strong>A world cooled to 1.5°C using aerosols is climatically not identical to a pre-industrial 1.5°C world.</strong> 
            While greenhouse gases like CO₂ trap longwave thermal radiation globally and around the clock, stratospheric aerosols only reflect shortwave solar radiation during the day. 
            {aggressiveCount > 1 
              ? " Through your aggressive cooling strategy, you severely altered the global temperature gradient (the difference between the equator and the poles). This dampens evaporation and extremely slows down the global water cycle." 
              : " Even with your moderate cooling, the distribution of energy in the Earth system changes. The reduction in solar radiation slows global evaporation, leading to a more sluggish hydrological cycle, even if the average temperature remains stable."}
          </p>
        </div>

        {/* Arctic & Cryosphere */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-blue-300 text-lg mb-2 flex items-center gap-2"><Globe size={18}/> Arctic & Ocean Circulation</h4>
          <p className="mb-2"><strong>Result:</strong> Arctic sea ice volume is at {indicators.ice}%.</p>
          <p>
            {polarCount > 1 || autumnCount > 1 
              ? "Your targeted measures stabilized the sea ice. According to Visioni et al., injecting in autumn (iAUTUMN) is particularly effective because it maximizes the radiative forcing precisely when the ice is most vulnerable during the polar summer. Polar injections also prevent permafrost thaw more efficiently than tropical approaches."
              : "Due to the standard tropical injection, the Arctic was 'undercooled'. Studies (e.g., Polar Regions Review) show that aerosols distribute from the equator via the Brewer-Dobson circulation, strongly cooling the tropics but failing to provide enough cooling at the poles to fully halt ice loss driven by greenhouse gases."}
          </p>
        </div>

        {/* Hydrology & ITCZ */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-cyan-300 text-lg mb-2 flex items-center gap-2"><Droplets size={18}/> Global Water Cycle & Monsoon</h4>
          <p className="mb-2"><strong>Result:</strong> Stability of the hydrological cycle is at {indicators.monsoon}%.</p>
          <p>
            {polarCount > 1
              ? "WARNING: Your polar injections disrupted the global interhemispheric temperature gradient. This forces the Intertropical Convergence Zone (ITCZ) to shift into the warmer hemisphere. The consequence is catastrophic droughts in the African Sahel and the Amazon basin."
              : springCount > 1
              ? "While the iSPRING strategy is extremely efficient (requiring 23% less sulfur dioxide), modeling shows it led to a significant reduction in precipitation over the Amazon basin, increasing the risk of forest fires."
              : "By avoiding asymmetric injections, the ITCZ remained relatively stable. However, any form of SAI slightly weakens the global hydrological cycle (less evaporation for the same CO2 concentration)."}
          </p>
        </div>

        {/* Agriculture C3/C4 */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="font-bold text-amber-300 text-lg mb-2 flex items-center gap-2"><Wheat size={18}/> Agriculture (C3 vs. C4 Crops)</h4>
          <p className="mb-2"><strong>Result:</strong> Food security index at {indicators.c3c4}%.</p>
          <p>
            {aggressiveCount > 0
              ? "You aggressively lowered temperatures. As Cohen et al. show in their regional study, C3 crops (rice, wheat) in Asia benefit enormously from SAI, as heat stress (TXx) decreases while the CO2 fertilization effect is preserved."
              : "Moderate cooling."}
             {polarCount > 0 || indicators.monsoon < 50
              ? " However, a catastrophe occurred for C4 crops (like maize) in West Africa and Central America. These crops are more resistant to heat but extremely dependent on soil moisture. The droughts induced by SAI caused yields to collapse here (a harsh trade-off between Asia and Africa)."
              : " Your balanced strategy largely preserved soil moisture in West Africa, preventing a collapse of maize harvests."}
          </p>
        </div>

        {/* Conclusion & Trade-offs */}
        <div className="bg-slate-900 p-6 rounded-xl border-2 border-slate-700 shadow-xl mt-8">
          <h4 className="font-black text-white text-xl mb-4 flex items-center gap-3">
            <Scale className="text-amber-500" size={24}/> 
            Conclusion: The Illusion of an Optimal Solution
          </h4>
          <p className="mb-4">
            This simulation illustrates the central dilemma of Solar Radiation Management (SRM). <strong>It is physically impossible to return all climate indicators to their historical baselines simultaneously.</strong> Every technical intervention requires harsh geopolitical compromises (trade-offs):
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-300">
            <li><strong>The North-South Conflict:</strong> Saving Arctic sea ice through polar injections shifts tropical rain belts (ITCZ) and risks life-threatening droughts in the Global South (e.g., the Sahel).</li>
            <li><strong>The Agricultural Dilemma:</strong> Aggressively cooling the Earth to prevent heat deaths and crop failures for wheat and rice (C3) in Asia weakens the global monsoon, endangering sensitive crops like maize (C4) in Africa.</li>
            <li><strong>The Time-Economy Conflict:</strong> An efficient spring injection saves superpowers billions in costs but severely dries out the Amazon rainforest.</li>
          </ul>
          <p>
            <strong>Geoengineering is therefore not a purely technical issue, but primarily a geopolitical one.</strong> There is no "perfect" setting for the global thermostat, only decisions about <em>which regions</em> and <em>which ecosystems</em> must bear the burden of the inevitable side effects. Without global consensus and compensation mechanisms for the losers (e.g., via a Loss and Damage Fund), SAI carries the risk of immense international conflict.
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
          <p className="text-lg font-bold text-red-400">The geoengineering program was abruptly halted!</p>
          <p>
            During the decades of artificial cooling, atmospheric CO₂ concentrations continued to rise unchecked. The aerosol shield merely masked this enormous amount of energy.
          </p>
          <p>
            Since stratospheric aerosols have a lifespan of only 1 to 2 years, the sulfur washes out incredibly fast. The global temperature spikes by <strong>several degrees Celsius</strong> within a single decade. This rate of warming is historically unprecedented; ecosystems have no time to adapt, leading to an immediate global climate collapse.
          </p>
          <button onClick={resetGame} className="mt-6 w-full py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl transition">
            Restart Simulation
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
            <h1 className="text-4xl font-black text-white mb-2">Summit Concluded: 2070</h1>
            <p className="text-slate-400">The long-term impacts of your climate interventions.</p>
          </div>

          {/* Final Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Final Temp.</div>
              <div className={`text-2xl font-black ${indicators.temperature > 1.5 ? 'text-red-400' : 'text-emerald-400'}`}>+{indicators.temperature.toFixed(1)}°C</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Arctic Ice</div>
              <div className={`text-2xl font-black ${indicators.ice < 40 ? 'text-red-400' : 'text-blue-400'}`}>{indicators.ice}%</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Crops (C3/C4)</div>
              <div className={`text-2xl font-black ${indicators.c3c4 < 50 ? 'text-red-400' : 'text-amber-400'}`}>{indicators.c3c4}%</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-sm text-slate-400 mb-1">Monsoon & Rain</div>
              <div className={`text-2xl font-black ${indicators.monsoon < 50 ? 'text-red-400' : 'text-cyan-400'}`}>{indicators.monsoon}%</div>
            </div>
          </div>

          <ScientificReport />

          <button onClick={resetGame} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/50 mt-8">
            Start New Simulation
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
              Status Report: {year}
            </h2>
            <p className="text-slate-400 mb-6 text-sm">These are the measurable findings following your interventions in the past decade. Explanations for these reactions will be provided in the 2070 evaluation.</p>

            <div className="space-y-3">
              {/* Temp Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><ThermometerSnowflake size={18}/> Global Temperature</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.temperature.toFixed(1)}°C</span>
                  <span className={`text-sm font-bold ${getDiffColor('temperature', indicators.temperature - previousIndicators.temperature)}`}>
                    ({indicators.temperature >= previousIndicators.temperature ? '+' : ''}{(indicators.temperature - previousIndicators.temperature).toFixed(1)}°C)
                  </span>
                </div>
              </div>

              {/* Ice Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><Globe size={18}/> Arctic Ice Volume</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.ice}%</span>
                  <span className={`text-sm font-bold ${getDiffColor('ice', indicators.ice - previousIndicators.ice)}`}>
                    ({indicators.ice >= previousIndicators.ice ? '+' : ''}{indicators.ice - previousIndicators.ice}%)
                  </span>
                </div>
              </div>

              {/* C3C4 Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><Wheat size={18}/> Agriculture (C3/C4)</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.c3c4}%</span>
                  <span className={`text-sm font-bold ${getDiffColor('c3c4', indicators.c3c4 - previousIndicators.c3c4)}`}>
                    ({indicators.c3c4 >= previousIndicators.c3c4 ? '+' : ''}{indicators.c3c4 - previousIndicators.c3c4}%)
                  </span>
                </div>
              </div>

              {/* Monsoon Diff */}
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                <span className="text-slate-300 flex items-center gap-2 font-medium"><Droplets size={18}/> Water Cycle</span>
                <div className="text-right flex items-center gap-2">
                  <span className="text-white font-mono text-xl">{indicators.monsoon}%</span>
                  <span className={`text-sm font-bold ${getDiffColor('monsoon', indicators.monsoon - previousIndicators.monsoon)}`}>
                    ({indicators.monsoon >= previousIndicators.monsoon ? '+' : ''}{indicators.monsoon - previousIndicators.monsoon}%)
                  </span>
                </div>
              </div>
            </div>

            <button onClick={closeDecadeReport} className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex justify-center items-center gap-2">
              {year >= 2070 ? "Proceed to Global Evaluation" : "Understood - Plan Next Decade"} <ArrowRight size={18}/>
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
          <p className="text-slate-400 mt-1">The Global Thermostat Dilemma | Current Year: <span className="text-white font-mono">{year}</span></p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm font-medium">Target Year: 2070</span>
          </div>
        </div>
      </header>

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-opacity ${showDecadeReport ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        
        {/* LEFT PANEL: Decisions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
              Planning: {year} to {year + 10}
            </h2>
            
            {/* Level 1: Target Temp */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-300 mb-3">Level 1: Temperature Target</label>
              <div className="space-y-2">
                <label className={`block p-3 rounded-xl border cursor-pointer transition ${targetTemp === '1.5' ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                  <input type="radio" name="target" className="hidden" checked={targetTemp === '1.5'} onChange={() => setTargetTemp('1.5')} />
                  <div className="font-bold text-blue-300">Stabilize at 1.5°C</div>
                  <div className="text-xs text-slate-400 mt-1">Baseline Geoengineering. Moderate intervention.</div>
                </label>
                <label className={`block p-3 rounded-xl border cursor-pointer transition ${targetTemp === '1.0' ? 'bg-emerald-900/40 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                  <input type="radio" name="target" className="hidden" checked={targetTemp === '1.0'} onChange={() => setTargetTemp('1.0')} />
                  <div className="font-bold text-emerald-300">Aggressive Cooling (1.0°C)</div>
                  <div className="text-xs text-slate-400 mt-1">Stops heatwaves, poses risk to the water cycle.</div>
                </label>
                <label className={`block p-3 rounded-xl border cursor-pointer transition ${targetTemp === 'pause' ? 'bg-red-900/40 border-red-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                  <input type="radio" name="target" className="hidden" checked={targetTemp === 'pause'} onChange={() => setTargetTemp('pause')} />
                  <div className="font-bold text-red-300">Pause SAI (No Injection)</div>
                  <div className="text-xs text-slate-400 mt-1">Warning: Can trigger Termination Shock!</div>
                </label>
              </div>
            </div>

            {/* Level 2: Seasonality */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                Level 2: Seasonality
                <div className="group relative">
                  <Info size={16} className="text-slate-500" />
                  <div className="absolute right-0 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50 bottom-full mb-2">
                    Seasonal adjustment of aerosol injections to control specific climate systems.
                  </div>
                </div>
              </label>
              <select value={season} onChange={(e) => setSeason(e.target.value)} disabled={targetTemp === 'pause'}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
                <option value="iANNUAL">Year-Round (Standard)</option>
                <option value="iSPRING">Spring Injection (iSPRING)</option>
                <option value="iAUTUMN">Autumn Injection (iAUTUMN)</option>
              </select>
            </div>

            {/* Level 3: Latitude */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                Level 3: Injection Location
                <div className="group relative">
                  <Info size={16} className="text-slate-500" />
                  <div className="absolute right-0 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50 bottom-full mb-2">
                    The choice of geographic injection location influences global distribution and regional temperature gradients.
                  </div>
                </div>
              </label>
              <select value={latitude} onChange={(e) => setLatitude(e.target.value)} disabled={targetTemp === 'pause'}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
                <option value="tropical">Tropical/Equatorial (Global Circulation)</option>
                <option value="polar">Polar (Targeted Local Use)</option>
              </select>
            </div>

            {/* ACTION BUTTON */}
            <button onClick={processDecade} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50">
              <Play size={18} />
              Complete Decade
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Data & Charts */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Status Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <ThermometerSnowflake size={24} className={indicators.temperature > 1.5 ? 'text-red-400' : 'text-blue-400'} />
               <span className="text-xs text-slate-400 mt-2">Global Temp.</span>
               <span className="text-xl font-bold font-mono text-white">+{indicators.temperature.toFixed(1)}°C</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <Globe size={24} className={indicators.ice < 40 ? 'text-red-400' : 'text-cyan-400'} />
               <span className="text-xs text-slate-400 mt-2">Arctic Ice</span>
               <span className="text-xl font-bold font-mono text-white">{indicators.ice}%</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center relative group">
               <Wheat size={24} className={indicators.c3c4 < 50 ? 'text-red-400' : 'text-amber-400'} />
               <span className="text-xs text-slate-400 mt-2">Crops (C3/C4)</span>
               <span className="text-xl font-bold font-mono text-white">{indicators.c3c4}%</span>
               {/* Tooltip for C3/C4 */}
               <div className="absolute top-full mt-2 w-48 p-2 bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible z-50">
                 General stability index of plant-based agriculture worldwide.
               </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <Droplets size={24} className={indicators.monsoon < 50 ? 'text-red-400' : 'text-blue-500'} />
               <span className="text-xs text-slate-400 mt-2">Monsoon / Rain</span>
               <span className="text-xl font-bold font-mono text-white">{indicators.monsoon}%</span>
            </div>
          </div>

          {/* Charts Container */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex-1 flex flex-col gap-6">
            
            {/* Temp Chart */}
            <div className="w-full h-[250px]">
              <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Temperature Trajectory (°C)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 20, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="year" stroke="#64748b" tick={{fontSize: 12}} type="number" domain={[2030, 2070]} ticks={[2030, 2040, 2050, 2060, 2070]} />
                  <YAxis stroke="#64748b" domain={[0, 3]} tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} itemStyle={{ color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }}/>
                  <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: '1.5°C Target', fill: '#10b981', fontSize: 10 }} />
                  <Line type="linear" dataKey="withoutSAI" name="Climate (Without SAI)" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} legendType="plainline" />
                  <Line type="linear" dataKey="temperature" name="Actual Temp." stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} legendType="circle" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Regional Impacts Chart */}
            <div className="w-full h-[250px]">
              <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Regional Stability (%)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 20, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="year" stroke="#64748b" tick={{fontSize: 12}} type="number" domain={[2030, 2070]} ticks={[2030, 2040, 2050, 2060, 2070]} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }}/>
                  <Line type="linear" dataKey="ice" name="Arctic Ice" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4 }} legendType="diamond" />
                  <Line type="linear" dataKey="c3c4" name="C3/C4 Crops" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4 }} legendType="square" />
                  <Line type="linear" dataKey="monsoon" name="Monsoon / ITCZ" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} legendType="triangle" />
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
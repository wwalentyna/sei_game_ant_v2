import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Atom,
  Beaker,
  BookOpen,
  Brain,
  ChevronRight,
  CloudRain,
  FlaskConical,
  Globe2,
  Info,
  Microscope,
  Play,
  RefreshCcw,
  Scale,
  ShieldAlert,
  Snowflake,
  Sparkles,
  ThermometerSnowflake,
  Wheat,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TargetChoice = 'none' | 'moderate' | 'aggressive' | 'emergency';
type ParticleChoice = 'sulfate' | 'caco3' | 'future';
type SeasonChoice = 'annual' | 'spring' | 'autumn';
type LocationChoice = 'tropical' | 'subtropical' | 'polar';
type ResearchChoice = 'none' | 'lab' | 'monitoring' | 'adaptation';

type Indicators = {
  temperature: number;
  ice: number;
  food: number;
  rain: number;
  trust: number;
  knowledge: number;
};

type HistoryPoint = Indicators & {
  year: number;
  withoutSAI: number;
};

type StrategyEntry = {
  year: number;
  particle: ParticleChoice;
  target: TargetChoice;
  season: SeasonChoice;
  location: LocationChoice;
  research: ResearchChoice;
  cost: number;
  event: string;
};

type Report = {
  year: number;
  title: string;
  text: string;
  event: string;
  previous: Indicators;
  current: Indicators;
  cost: number;
  choices: StrategyEntry;
};

const START_YEAR = 2030;
const END_YEAR = 2130;
const POINTS_PER_DECADE = 7;

const INITIAL_STATE: Indicators = {
  temperature: 1.6,
  ice: 70,
  food: 80,
  rain: 85,
  trust: 65,
  knowledge: 20,
};

const particleMeta: Record<ParticleChoice, { label: string; short: string; cost: number; known: string; risk: string }> = {
  sulfate: {
    label: 'Sulfate particles',
    short: 'Known baseline',
    cost: 1,
    known: 'Known cooling, known lifetime, known risks',
    risk: 'Ozone and stratospheric heating risks are better studied than alternatives.',
  },
  caco3: {
    label: 'Calcium carbonate / calcite',
    short: 'Partly known',
    cost: 2,
    known: 'Partly known cooling, partly known lifetime, partly known risks',
    risk: 'Potentially useful alternative, but heterogeneous chemistry and ozone effects remain uncertain.',
  },
  future: {
    label: 'Future engineered particle',
    short: 'Locked until enough research',
    cost: 4,
    known: 'Unknown cooling, unknown lifetime, unknown risk',
    risk: 'High reward, high uncertainty. Needs laboratory and model evidence first.',
  },
};

const sourceThemes = [
  {
    title: 'Visioni et al. (2020): Seasonally Modulated Stratospheric Aerosol Geoengineering Alters the Climate Outcomes',
    detail: 'Used for Level 2: seasonality. The paper compares annual, spring and autumn injection and shows that the same global target can produce different regional rainfall and sea-ice outcomes.',
  },
  {
    title: 'Cohen et al. (2025): The impact of stratospheric aerosol injection: a regional case study',
    detail: 'Used for food and regional impacts. The paper compares climate change with SAI scenarios for Global South regions and links SAI to heat extremes, wet-season precipitation, soil moisture and crop productivity.',
  },
  {
    title: 'Duffey et al. (2023): Solar Geoengineering in the Polar Regions: A Review',
    detail: 'Used for Level 3: injection location. The review explains why polar regions are difficult to cool, why targeted polar strategies may help ice, and why asymmetric cooling can shift tropical rainfall.',
  },
  {
    title: 'FH Münster Aerosol and Nanotechnology lecture material: Aerosol Characterization and Aerosol Transport I',
    detail: 'Used for Level 4 and the research-gap methods: particle generation, particle sizing, optical characterization, coagulation/agglomeration, settling velocity and transport modelling.',
  },
];

const researchNeeded = {
  laboratory: ['aerosol generator', 'particle synthesis reactor', 'particle sizing (SMPS)', 'coagulation chamber'],
  measurements: ['particle size distribution', 'optical scattering', 'agglomeration behavior', 'settling velocity'],
  models: ['atmospheric transport model', 'climate model'],
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function roundIndicators(next: Indicators): Indicators {
  return {
    temperature: Number(next.temperature.toFixed(2)),
    ice: Math.round(clamp(next.ice)),
    food: Math.round(clamp(next.food)),
    rain: Math.round(clamp(next.rain)),
    trust: Math.round(clamp(next.trust)),
    knowledge: Math.round(clamp(next.knowledge)),
  };
}

function baselineTemperature(year: number): number {
  return Number((1.6 + (year - START_YEAR) * 0.025).toFixed(2));
}

function targetTemperature(target: TargetChoice, withoutSAI: number): number {
  if (target === 'none') return withoutSAI;
  if (target === 'moderate') return 1.5;
  if (target === 'aggressive') return 1.0;
  return 0.8;
}

function computeCost(
  target: TargetChoice,
  particle: ParticleChoice,
  season: SeasonChoice,
  location: LocationChoice,
  research: ResearchChoice,
): number {
  let cost = 0;
  if (target === 'moderate') cost += 2;
  if (target === 'aggressive') cost += 4;
  if (target === 'emergency') cost += 5;
  if (target !== 'none') cost += particleMeta[particle].cost;
  if (target !== 'none' && season !== 'annual') cost += 1;
  if (target !== 'none' && location === 'subtropical') cost += 1;
  if (target !== 'none' && location === 'polar') cost += 2;
  if (research === 'lab') cost += 2;
  if (research === 'monitoring') cost += 2;
  if (research === 'adaptation') cost += 2;
  return cost;
}

function contestedChoiceCount(
  target: TargetChoice,
  particle: ParticleChoice,
  season: SeasonChoice,
  location: LocationChoice,
): number {
  if (target === 'none') return 0;
  let count = 0;
  if (target === 'aggressive') count += 1;
  if (target === 'emergency') count += 2;
  if (season === 'spring') count += 1;
  if (location === 'subtropical') count += 1;
  if (location === 'polar') count += 2;
  if (particle === 'caco3') count += 1;
  if (particle === 'future') count += 2;
  return count;
}

function knowledgeTrustEffect(
  knowledge: number,
  target: TargetChoice,
  particle: ParticleChoice,
  season: SeasonChoice,
  location: LocationChoice,
): number {
  const contested = contestedChoiceCount(target, particle, season, location);
  if (contested === 0) return 0;
  if (knowledge < 35) return -Math.min(8, contested * 2);
  if (knowledge < 60) return -Math.min(5, contested);
  if (knowledge < 75) return 0;
  return Math.min(5, Math.ceil(contested * 1.2));
}

function knowledgeTier(knowledge: number): { label: string; tone: string; description: string } {
  if (knowledge < 35) {
    return {
      label: 'Low evidence',
      tone: 'text-red-300 border-red-700 bg-red-950/20',
      description: 'Only broad warnings are available. Uncertain or aggressive choices cost extra trust because the public cannot see enough evidence.',
    };
  }
  if (knowledge < 60) {
    return {
      label: 'Developing evidence',
      tone: 'text-amber-300 border-amber-700 bg-amber-950/20',
      description: 'The main trade-offs become clearer, but exact side effects are still uncertain. Trust penalties are smaller than at low evidence.',
    };
  }
  if (knowledge < 75) {
    return {
      label: 'Operational evidence',
      tone: 'text-blue-300 border-blue-700 bg-blue-950/20',
      description: 'Most decision mechanisms are visible. Controversial options no longer receive an extra evidence penalty, but they can still have direct side effects.',
    };
  }
  return {
    label: 'High evidence',
    tone: 'text-emerald-300 border-emerald-700 bg-emerald-950/20',
    description: 'The council can justify complex choices with testing and monitoring data. Some contested choices gain legitimacy instead of losing additional trust.',
  };
}

function decisionInsight(
  knowledge: number,
  target: TargetChoice,
  particle: ParticleChoice,
  season: SeasonChoice,
  location: LocationChoice,
): string[] {
  const effect = knowledgeTrustEffect(knowledge, target, particle, season, location);
  const lines: string[] = [];

  if (knowledge < 35) {
    lines.push('Low evidence mode: the game only shows broad warnings. Invest in lab testing or monitoring to reveal more specific trade-offs.');
    lines.push(effect < 0 ? 'Current selected strategy is evidence-sensitive: public trust will lose extra points because the science is still weak.' : 'Current selected strategy has no extra evidence penalty.');
    return lines;
  }

  if (target === 'none') lines.push('Temperature target: no injection avoids direct aerosol side effects, but background warming continues.');
  if (target === 'moderate') lines.push('Temperature target: moderate cooling gives small trust benefit and lower side-effect pressure.');
  if (target === 'aggressive') lines.push('Temperature target: aggressive cooling lowers heat stress but increases rainfall and trust risk.');
  if (target === 'emergency') lines.push('Temperature target: emergency cooling has the strongest cooling, but creates high backlash and overcooling risk.');

  if (target !== 'none') {
    if (season === 'annual') lines.push('Seasonality: annual injection is the reference option with predictable but not optimal regional effects.');
    if (season === 'spring') lines.push('Seasonality: spring is efficient but raises rainfall/monsoon risk in the simplified rule set.');
    if (season === 'autumn') lines.push('Seasonality: autumn supports ice recovery and is less damaging for rainfall than spring in the game.');

    if (location === 'tropical') lines.push('Location: tropical injection spreads globally but can leave polar regions undercooled.');
    if (location === 'subtropical') lines.push('Location: subtropical injection is a compromise, but still carries regional side-effect risk.');
    if (location === 'polar') lines.push('Location: polar injection protects ice, but creates stronger tropical rainfall and food-security risk.');

    if (particle === 'sulfate') lines.push('Material: sulfate is the known baseline with the most predictable effects, but known chemistry/ozone concerns remain.');
    if (particle === 'caco3') lines.push('Material: CaCO₃/calcite is partly known. More evidence reduces the trust penalty for using it.');
    if (particle === 'future') lines.push('Material: future particles are only defensible after research. At very high evidence they can become less damaging in the game.');
  }

  if (knowledge >= 70) {
    lines.push(`Evidence legitimacy effect this decade: ${effect > 0 ? '+' : ''}${effect} trust.`);
  } else {
    lines.push(effect < 0 ? 'Evidence legitimacy effect: negative trust pressure because the selected strategy is not yet well justified.' : 'Evidence legitimacy effect: neutral.');
  }
  return lines;
}

function earthStatus(indicators: Indicators): { label: string; detail: string; tone: string; ring: string; emoji: string } {
  if (indicators.trust < 20 || indicators.rain < 20 || indicators.food < 20) {
    return {
      label: 'Crisis Earth',
      detail: 'The system is not governed safely anymore.',
      tone: 'from-red-950 via-slate-900 to-slate-950',
      ring: 'border-red-500 shadow-red-900/50',
      emoji: '⚠️',
    };
  }
  if (indicators.temperature >= 2.5) {
    return {
      label: 'Very Hot Earth',
      detail: 'Temperature control failed; heat pressure dominates all systems.',
      tone: 'from-orange-900 via-red-950 to-slate-950',
      ring: 'border-orange-400 shadow-orange-900/50',
      emoji: '🔥',
    };
  }
  if (indicators.temperature <= 0.9) {
    return {
      label: 'Overcooled Earth',
      detail: 'Cooling became too aggressive; food and rainfall risks increase.',
      tone: 'from-blue-950 via-cyan-950 to-slate-950',
      ring: 'border-cyan-300 shadow-cyan-900/50',
      emoji: '❄️',
    };
  }
  return {
    label: 'Managed Earth',
    detail: 'Temperature is controlled, but regional trade-offs remain.',
    tone: 'from-emerald-950 via-blue-950 to-slate-950',
    ring: 'border-emerald-400 shadow-emerald-900/50',
    emoji: '🌍',
  };
}

function differenceText(key: keyof Indicators, current: number, previous: number): { text: string; className: string } {
  const diff = Number((current - previous).toFixed(key === 'temperature' ? 2 : 0));
  if (diff === 0) return { text: '±0', className: 'text-slate-400' };
  if (key === 'temperature') {
    return {
      text: `${diff > 0 ? '+' : ''}${diff.toFixed(2)}°C`,
      className: diff > 0 ? 'text-red-400' : 'text-cyan-400',
    };
  }
  return {
    text: `${diff > 0 ? '+' : ''}${diff}%`,
    className: diff > 0 ? 'text-emerald-400' : 'text-red-400',
  };
}


function strategyExplanation(entry: StrategyEntry): string[] {
  const notes: string[] = [];

  if (entry.target === 'none') {
    notes.push('No SAI avoids direct aerosol side effects, but greenhouse-gas warming continues in the background. If SAI is stopped after repeated use, the game treats this as a termination-shock risk.');
  } else if (entry.target === 'moderate') {
    notes.push('A moderate target represents the lower-risk baseline: temperature is stabilized, but the game still applies regional side effects because SAI does not restore the pre-industrial climate exactly.');
  } else if (entry.target === 'aggressive') {
    notes.push('Aggressive cooling reduces heat stress more strongly, but it increases the risk of rainfall and governance side effects.');
  } else {
    notes.push('Emergency cooling is an extreme option. It can pull temperature down quickly, but the game increases overcooling, rainfall and trust risks.');
  }

  if (entry.season === 'autumn') {
    notes.push('Autumn injection is treated as better for Arctic sea-ice recovery and less damaging for the Indian monsoon than spring in the seasonal-strategy paper.');
  } else if (entry.season === 'spring') {
    notes.push('Spring injection is treated as more SO₂-efficient, but with stronger risks for monsoon/rainfall stability in the simplified game logic.');
  } else if (entry.target !== 'none') {
    notes.push('Annual injection is the reference strategy: stable and predictable, but not necessarily optimal for every region.');
  }

  if (entry.location === 'polar') {
    notes.push('Polar injection strongly supports Arctic ice, but repeated asymmetric cooling can shift tropical rainfall patterns. This is why the game penalizes rain, food security and trust.');
  } else if (entry.location === 'subtropical') {
    notes.push('Subtropical injection is modeled as a compromise: more control than tropical injection, but still not free of regional side effects.');
  } else if (entry.target !== 'none') {
    notes.push('Tropical injection spreads aerosols more globally, but the poles can remain undercooled compared with the global mean.');
  }

  if (entry.particle === 'sulfate') {
    notes.push('Sulfate is the known baseline material. In the game it has lower uncertainty, but known risks remain, including stratospheric heating and chemistry concerns.');
  } else if (entry.particle === 'caco3') {
    notes.push('CaCO₃/calcite represents the research gap: it may be useful, but cooling, lifetime, chemistry and environmental side effects are only partly known.');
  } else {
    notes.push('The future engineered particle is intentionally uncertain. It can only be used after research, and it can still trigger unexpected side effects.');
  }

  if (entry.research === 'lab') {
    notes.push('Laboratory testing increases knowledge because the particle problem is an aerosol-engineering question: generation, sizing, coagulation, optical scattering and settling velocity.');
  } else if (entry.research === 'monitoring') {
    notes.push('Monitoring improves trust and reduces uncertainty because regional side effects cannot be governed safely if the aerosol layer and climate response are not observed.');
  } else if (entry.research === 'adaptation') {
    notes.push('Adaptation and compensation do not solve the physics, but they reduce human damage in regions affected by side effects.');
  } else {
    notes.push('No additional research saves points now, but leaves material and regional uncertainties unresolved.');
  }

  return notes;
}

function finalOutcomeExplanation(indicators: Indicators): string {
  if (indicators.trust < 20 || indicators.food < 20 || indicators.rain < 20) {
    return 'The end state is a governance failure: at least one human/regional indicator fell into the crisis zone. This shows the central message of the game: global cooling alone is not enough if rainfall, food security or public legitimacy collapses.';
  }
  if (indicators.temperature > 2.3) {
    return 'The end state is too hot: the intervention was too weak or too late to prevent strong warming. In the game, this harms ice, food and long-term stability.';
  }
  if (indicators.temperature < 1.0) {
    return 'The end state is overcooled: the intervention controlled heat too aggressively. The game treats this as risky because reduced sunlight and altered rainfall can damage agriculture.';
  }
  if (indicators.knowledge >= 70 && indicators.trust >= 50 && indicators.food >= 50 && indicators.rain >= 50 && indicators.ice >= 50) {
    return 'The end state is relatively stable: temperature was controlled while knowledge, trust and regional indicators remained above the danger zone. This is the best type of result, but it still depends on sustained governance and monitoring.';
  }
  return 'The end state is mixed: temperature may look acceptable, but at least one regional or governance indicator remains weak. This reflects the trade-off problem described in the SAI literature.';
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">{children}</div>;
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-950/60 px-3 py-1 text-sm text-blue-200">
                <Globe2 size={16} /> Interactive SAI governance game
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">The SAI Governance Challenge</h1>
              <p className="mt-4 max-w-3xl text-slate-300 md:text-lg">
                You are the climate council from 2030 to 2130. Each decade, you decide whether and how to use stratospheric aerosol injection. The goal is not to find a perfect solution. The goal is to understand the trade-offs: cooling, Arctic ice, rainfall, food security, public trust, and scientific uncertainty.
              </p>
            </div>
            <button
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500"
            >
              Start game <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-blue-400" /> What the game is about</h2>
            <p className="text-slate-300 leading-relaxed">
              SAI means stratospheric aerosol injection. Reflective particles are placed in the stratosphere so that part of the incoming sunlight is scattered back to space. This can reduce global temperature, but it does not remove greenhouse gases and it can change regional climate patterns.
            </p>
            <p className="mt-3 text-slate-300 leading-relaxed">
              In this game, you do not control only temperature. You also manage side effects and uncertainty. Strong cooling may protect some regions and damage others. A strategy that saves Arctic ice may harm tropical rainfall. A new particle may look promising, but the risk may be unknown.
            </p>
          </InfoCard>

          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><Scale className="text-amber-400" /> Goal of the game</h2>
            <p className="text-slate-300 leading-relaxed">
              Survive ten decades until 2130 without triggering collapse. A good result keeps temperature controlled, Arctic ice above danger level, food security stable, rainfall stable, public trust alive, and scientific knowledge high enough to justify decisions.
            </p>
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
              The hardest part: you get only {POINTS_PER_DECADE} Governance Points each decade. You cannot choose every good option at the same time. Level 4 adds the research gap: the particle material itself becomes a decision.
            </div>
          </InfoCard>
        </div>

        <InfoCard>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-emerald-400" /> Sources used in the game</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {sourceThemes.map((source) => (
              <div key={source.title} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="font-bold text-white">{source.title}</div>
                <div className="mt-1 text-sm text-slate-400">{source.detail}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            The first three sources define the SAI decision logic. The lecture material defines the aerosol-engineering part of the research gap: what has to be generated, measured, characterized and modelled before a new particle material can be treated as reliable.
          </p>
        </InfoCard>

        <InfoCard>
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><FlaskConical className="text-purple-400" /> Research gap</h2>
          <div className="rounded-xl border-l-4 border-purple-400 bg-purple-950/20 p-4 text-lg text-purple-100">
            Can alternative engineered nanoparticles outperform sulfate aerosols while reducing environmental side effects?
          </div>
          <p className="mt-4 text-slate-300 leading-relaxed">
            The gap is not only whether SAI can cool the planet. The gap is whether different aerosol materials can be designed, tested, monitored, and governed safely enough. Sulfate aerosols are the known baseline. Calcium carbonate/calcite represents a partly known alternative material. A future engineered particle is deliberately shown as unknown because cooling efficiency, atmospheric lifetime, coagulation, optical scattering and environmental risk would need to be tested first.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-slate-200">
                <tr>
                  <th className="p-3">Particle</th>
                  <th className="p-3">Cooling</th>
                  <th className="p-3">Lifetime</th>
                  <th className="p-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                <tr><td className="p-3">Sulfate</td><td className="p-3">Known</td><td className="p-3">Known</td><td className="p-3">Known</td></tr>
                <tr><td className="p-3">CaCO₃ / calcite</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td></tr>
                <tr><td className="p-3">Future particle</td><td className="p-3">???</td><td className="p-3">???</td><td className="p-3">???</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-slate-300">We do not know enough because alternative particles have not been fully tested in the real atmosphere.</p>
        </InfoCard>

        <div className="grid gap-6 md:grid-cols-3">
          <InfoCard>
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Microscope className="text-cyan-400" /> Laboratory</h3>
            <ul className="space-y-2 text-slate-300">
              {researchNeeded.laboratory.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </InfoCard>
          <InfoCard>
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Activity className="text-emerald-400" /> Measurements</h3>
            <ul className="space-y-2 text-slate-300">
              {researchNeeded.measurements.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </InfoCard>
          <InfoCard>
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Brain className="text-purple-400" /> Models</h3>
            <ul className="space-y-2 text-slate-300">
              {researchNeeded.models.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center shadow-xl">
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 ${tone}`}>{icon}</div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-1 font-mono text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function ChoiceCard({
  selected,
  disabled,
  title,
  subtitle,
  cost,
  onClick,
  tone = 'blue',
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  subtitle: string;
  cost: number;
  onClick: () => void;
  tone?: 'blue' | 'emerald' | 'red' | 'purple' | 'amber';
}) {
  const selectedClass = {
    blue: 'border-blue-500 bg-blue-950/40',
    emerald: 'border-emerald-500 bg-emerald-950/40',
    red: 'border-red-500 bg-red-950/40',
    purple: 'border-purple-500 bg-purple-950/40',
    amber: 'border-amber-500 bg-amber-950/40',
  }[tone];
  const titleClass = {
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    purple: 'text-purple-300',
    amber: 'text-amber-300',
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${selected ? selectedClass : 'border-slate-700 bg-slate-800 hover:border-slate-500'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`font-bold ${titleClass}`}>{title}</div>
          <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
        </div>
        <div className="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">{cost} GP</div>
      </div>
    </button>
  );
}

function EarthVisual({ indicators }: { indicators: Indicators }) {
  const status = earthStatus(indicators);
  return (
    <div className={`rounded-3xl border border-slate-800 bg-gradient-to-br ${status.tone} p-5 shadow-xl`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className={`flex h-28 w-28 items-center justify-center rounded-full border-4 text-5xl shadow-2xl ${status.ring}`}>
            <span>{status.emoji}</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{status.label}</div>
            <div className="mt-1 max-w-md text-sm text-slate-300">{status.detail}</div>
            <div className="mt-3 text-xs text-slate-500">Visual status based on temperature, food security, rainfall stability and trust.</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
          <div className="font-bold text-white">System warning threshold</div>
          <div className="mt-1">Food, rain or trust below 20% can lead to crisis behaviour.</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [introOpen, setIntroOpen] = useState(true);
  const [year, setYear] = useState(START_YEAR);
  const [indicators, setIndicators] = useState<Indicators>(INITIAL_STATE);
  const [previousIndicators, setPreviousIndicators] = useState<Indicators>(INITIAL_STATE);
  const [history, setHistory] = useState<HistoryPoint[]>([
    { year: START_YEAR, ...INITIAL_STATE, withoutSAI: INITIAL_STATE.temperature },
  ]);
  const [target, setTarget] = useState<TargetChoice>('moderate');
  const [particle, setParticle] = useState<ParticleChoice>('sulfate');
  const [season, setSeason] = useState<SeasonChoice>('annual');
  const [location, setLocation] = useState<LocationChoice>('tropical');
  const [research, setResearch] = useState<ResearchChoice>('none');
  const [strategyLog, setStrategyLog] = useState<StrategyEntry[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [terminationShock, setTerminationShock] = useState(false);
  const [pointPenalty, setPointPenalty] = useState(0);

  const availablePoints = Math.max(3, POINTS_PER_DECADE - pointPenalty);
  const futureUnlocked = indicators.knowledge >= 70 && year >= 2080;
  const emergencyUnlocked = year >= 2070 || indicators.temperature >= 2.3;
  const currentCost = computeCost(target, particle, season, location, research);
  const pointsRemaining = availablePoints - currentCost;

  const repeatedPolar = useMemo(() => strategyLog.filter((entry) => entry.location === 'polar').length, [strategyLog]);
  const repeatedAggressive = useMemo(() => strategyLog.filter((entry) => entry.target === 'aggressive' || entry.target === 'emergency').length, [strategyLog]);
  const activeSAIDecades = useMemo(() => strategyLog.filter((entry) => entry.target !== 'none').length, [strategyLog]);
  const evidenceTier = knowledgeTier(indicators.knowledge);
  const evidenceTrustEffect = knowledgeTrustEffect(indicators.knowledge, target, particle, season, location);
  const evidenceInsights = decisionInsight(indicators.knowledge, target, particle, season, location);

  const processDecade = () => {
    if (currentCost > availablePoints) return;

    const previousTarget = strategyLog[strategyLog.length - 1]?.target ?? 'none';
    if (target === 'none' && previousTarget !== 'none' && activeSAIDecades >= 2) {
      setTerminationShock(true);
      setGameOver(true);
      return;
    }

    const nextYear = year + 10;
    const withoutSAI = baselineTemperature(nextYear);
    const previous = indicators;
    let next: Indicators = { ...indicators };
    let event = '';
    let reportTitle = 'Decade completed';
    let reportText = 'The climate system responded to your decisions. The changes are simplified game logic, not exact predictions.';

    if (target === 'none') {
      next.temperature = withoutSAI;
      next.ice -= 9 + Math.max(0, withoutSAI - 2) * 6;
      next.food -= 5 + Math.max(0, withoutSAI - 2) * 5;
      next.rain -= 3;
      next.trust += 2;
    } else {
      let desiredTemp = targetTemperature(target, withoutSAI);

      if (particle === 'caco3') desiredTemp -= 0.05;
      if (particle === 'future') desiredTemp -= 0.1;
      if (season === 'spring') desiredTemp -= 0.05;
      if (location === 'subtropical') desiredTemp -= 0.05;

      next.temperature = Math.max(0.4, desiredTemp);

      if (target === 'moderate') {
        next.food -= 1;
        next.rain -= 2;
        next.trust += 1;
      }
      if (target === 'aggressive') {
        next.food += 3;
        next.rain -= 10;
        next.trust -= 4;
      }
      if (target === 'emergency') {
        next.food -= 6;
        next.rain -= 18;
        next.trust -= 10;
      }

      if (particle === 'sulfate') {
        next.knowledge += 1;
        next.trust -= 1;
        next.rain -= 1;
      }
      if (particle === 'caco3') {
        next.knowledge += 3;
        next.trust -= indicators.knowledge < 45 ? 5 : 2;
        next.food += 1;
      }
      if (particle === 'future') {
        next.knowledge += 4;
        next.trust -= indicators.knowledge < 85 ? 12 : 3;
        next.food += indicators.knowledge > 80 ? 8 : -8;
        next.rain += indicators.knowledge > 80 ? 4 : -8;
      }

      if (season === 'annual') {
        next.ice += 3;
      }
      if (season === 'spring') {
        next.rain -= 8;
        next.ice -= 4;
        next.trust -= 2;
      }
      if (season === 'autumn') {
        next.ice += 13;
        next.rain += 2;
        next.trust += 1;
      }

      if (location === 'tropical') {
        next.ice -= 4;
        next.rain -= 2;
      }
      if (location === 'subtropical') {
        next.ice += 4;
        next.rain -= 4;
        next.food -= 1;
      }
      if (location === 'polar') {
        next.ice += 18;
        next.rain -= 16;
        next.food -= 10;
        next.trust -= 6;
      }

      const legitimacyEffect = knowledgeTrustEffect(indicators.knowledge, target, particle, season, location);
      next.trust += legitimacyEffect;
      if (legitimacyEffect < 0) {
        reportText = 'The strategy created an evidence legitimacy problem: the decision was difficult to justify because scientific knowledge was still limited.';
      }
      if (legitimacyEffect > 0) {
        reportText = 'The strategy was supported by a stronger evidence base. High knowledge made the decision easier to justify publicly, even though side effects still remained.';
      }
    }

    if (research === 'lab') {
      next.knowledge += 20;
      next.trust += 4;
      reportText = 'Laboratory work improved knowledge about particles, but it used governance resources that could not be spent on other actions.';
    }
    if (research === 'monitoring') {
      next.knowledge += 10;
      next.trust += 8;
      next.rain += 2;
      next.food += 2;
      reportText = 'Monitoring improved transparency and reduced uncertainty. This made the next decisions more legitimate.';
    }
    if (research === 'adaptation') {
      next.trust += 14;
      next.food += 7;
      next.rain += 4;
      reportText = 'Adaptation and compensation reduced the social damage of regional side effects.';
    }

    const chanceBase = 0.11;
    const uncertainty = particle === 'future' ? 0.16 : particle === 'caco3' ? 0.09 : 0.03;
    const monitoringReduction = research === 'monitoring' ? 0.08 : 0;
    const randomChance = chanceBase + uncertainty + (target === 'emergency' ? 0.08 : 0) + (location === 'polar' ? 0.05 : 0) - monitoringReduction;

    if (Math.random() < randomChance) {
      const eventRoll = Math.random();
      if (target !== 'none' && eventRoll < 0.25) {
        next.temperature -= 0.25;
        next.food -= 10;
        next.rain -= 7;
        event = 'Volcanic eruption: natural aerosols added extra cooling. Combined with SAI, this created an overcooling shock and harmed agriculture.';
        reportTitle = 'Extreme event: overcooling shock';
      } else if (location === 'polar' || repeatedPolar >= 2) {
        next.rain -= 18;
        next.food -= 15;
        next.trust -= 12;
        event = 'ITCZ displacement crisis: repeated polar/asymmetric cooling shifted tropical rainfall patterns and caused a severe drought scenario.';
        reportTitle = 'Extreme event: rainfall crisis';
      } else if (particle === 'future' || particle === 'caco3') {
        next.knowledge += 6;
        next.trust -= 14;
        next.food -= 6;
        event = 'Particle chemistry surprise: the alternative material behaved differently than expected under stratospheric conditions. Knowledge increased, but trust decreased.';
        reportTitle = 'Extreme event: particle uncertainty';
      } else {
        next.food -= 10;
        next.trust -= 8;
        event = 'Crop shock: regional rainfall and sunlight changes caused an unexpected agricultural loss.';
        reportTitle = 'Extreme event: crop shock';
      }
    }

    if (next.rain < 25) {
      next.food -= 10;
      next.trust -= 8;
      event = event || 'Crisis feedback: rainfall stability fell below the safe zone. Food security and public trust declined.';
    }
    if (next.trust < 25) {
      setPointPenalty(2);
      event = event || 'Governance penalty: public trust is low. The next decade will have fewer Governance Points.';
    } else {
      setPointPenalty(0);
    }

    const rounded = roundIndicators(next);
    const entry: StrategyEntry = {
      year,
      particle,
      target,
      season,
      location,
      research,
      cost: currentCost,
      event,
    };

    setPreviousIndicators(previous);
    setIndicators(rounded);
    setHistory((prev) => [...prev, { year: nextYear, ...rounded, withoutSAI }]);
    setStrategyLog((prev) => [...prev, entry]);
    setYear(nextYear);
    setReport({ year: nextYear, title: reportTitle, text: reportText, event, previous, current: rounded, cost: currentCost, choices: entry });
  };

  const closeReport = () => {
    setReport(null);
    if (year >= END_YEAR) setGameOver(true);
  };

  const resetGame = () => {
    setIntroOpen(true);
    setYear(START_YEAR);
    setIndicators(INITIAL_STATE);
    setPreviousIndicators(INITIAL_STATE);
    setHistory([{ year: START_YEAR, ...INITIAL_STATE, withoutSAI: INITIAL_STATE.temperature }]);
    setTarget('moderate');
    setParticle('sulfate');
    setSeason('annual');
    setLocation('tropical');
    setResearch('none');
    setStrategyLog([]);
    setReport(null);
    setGameOver(false);
    setTerminationShock(false);
    setPointPenalty(0);
  };

  if (introOpen) return <IntroScreen onStart={() => setIntroOpen(false)} />;

  if (terminationShock) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200 flex items-center justify-center font-sans">
        <div className="max-w-3xl rounded-3xl border border-red-800 bg-red-950/30 p-8 text-center shadow-2xl shadow-red-950/40">
          <AlertOctagon className="mx-auto mb-5 text-red-400" size={88} />
          <h1 className="text-5xl font-black text-white">Termination Shock</h1>
          <p className="mt-5 text-left text-lg leading-relaxed text-slate-300">
            The SAI program was stopped suddenly after several decades of deployment. The aerosol layer disappears much faster than CO₂, so the masked warming appears rapidly. In the game this causes immediate collapse.
          </p>
          <button onClick={resetGame} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-6 py-4 font-bold text-white hover:bg-red-600">
            <RefreshCcw size={18} /> Restart
          </button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    const polarCount = strategyLog.filter((s) => s.location === 'polar').length;
    const futureCount = strategyLog.filter((s) => s.particle === 'future').length;
    const caco3Count = strategyLog.filter((s) => s.particle === 'caco3').length;
    const labCount = strategyLog.filter((s) => s.research === 'lab' || s.research === 'monitoring').length;
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200 font-sans">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
            <h1 className="text-4xl font-black text-white">Final Evaluation: 2130</h1>
            <p className="mt-2 text-slate-400">The century-long climate intervention simulation is complete.</p>
          </div>
          <EarthVisual indicators={indicators} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <MetricCard icon={<ThermometerSnowflake size={22} />} title="Temp." value={`+${indicators.temperature.toFixed(2)}°C`} tone={indicators.temperature > 2 ? 'text-red-400' : 'text-cyan-400'} />
            <MetricCard icon={<Snowflake size={22} />} title="Arctic ice" value={`${indicators.ice}%`} tone={indicators.ice < 35 ? 'text-red-400' : 'text-blue-400'} />
            <MetricCard icon={<Wheat size={22} />} title="Food" value={`${indicators.food}%`} tone={indicators.food < 40 ? 'text-red-400' : 'text-amber-400'} />
            <MetricCard icon={<CloudRain size={22} />} title="Rain" value={`${indicators.rain}%`} tone={indicators.rain < 40 ? 'text-red-400' : 'text-cyan-400'} />
            <MetricCard icon={<Scale size={22} />} title="Trust" value={`${indicators.trust}%`} tone={indicators.trust < 40 ? 'text-red-400' : 'text-emerald-400'} />
            <MetricCard icon={<Beaker size={22} />} title="Knowledge" value={`${indicators.knowledge}%`} tone={indicators.knowledge < 50 ? 'text-amber-400' : 'text-purple-400'} />
          </div>

          <InfoCard>
            <h2 className="mb-3 text-2xl font-black text-white">Scientific interpretation</h2>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-100">
                {finalOutcomeExplanation(indicators)}
              </div>
              <p>
                This result shows why SAI is a governance problem, not only a technical cooling problem. The global temperature number can look controlled while regional indicators become unstable.
              </p>
              <p>
                You used polar injection {polarCount} time(s). Polar strategies strongly protect Arctic ice, but repeated use creates high risk for tropical rainfall shifts and agricultural losses. This follows the polar-geoengineering issue: the poles may need targeted cooling, but asymmetric cooling can disturb lower-latitude rainfall.
              </p>
              <p>
                You used CaCO₃/calcite {caco3Count} time(s) and future engineered particles {futureCount} time(s). This connects directly to the research gap: alternative materials may be promising, but their lifetime, cooling efficiency, coagulation behavior, optical scattering and environmental risk are not fully known.
              </p>
              <p>
                You invested in laboratory or monitoring work {labCount} time(s). High knowledge makes future particles less dangerous in the game, because the scientific uncertainty is lower. In a real research project, this means laboratory aerosol generation, particle sizing, optical scattering measurements, settling/coagulation experiments and climate-model coupling.
              </p>
            </div>
          </InfoCard>

          <InfoCard>
            <h2 className="mb-4 text-2xl font-black text-white">Strategy log</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-2">Decade</th>
                    <th className="p-2">Particle</th>
                    <th className="p-2">Target</th>
                    <th className="p-2">Season</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Research</th>
                    <th className="p-2">Cost</th>
                    <th className="p-2">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {strategyLog.map((entry) => (
                    <tr key={`${entry.year}-${entry.cost}`} className="text-slate-300">
                      <td className="p-2">{entry.year}-{entry.year + 10}</td>
                      <td className="p-2">{particleMeta[entry.particle].label}</td>
                      <td className="p-2">{entry.target}</td>
                      <td className="p-2">{entry.season}</td>
                      <td className="p-2">{entry.location}</td>
                      <td className="p-2">{entry.research}</td>
                      <td className="p-2">{entry.cost}</td>
                      <td className="p-2">{entry.event || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>
          <button onClick={resetGame} className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-500">Restart simulation</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200 font-sans">
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white"><Activity className="text-blue-400" /> {report.title}</h2>
            <p className="mt-1 text-sm text-slate-400">Status report for {report.year}</p>
            <p className="mt-4 text-slate-300">{report.text}</p>
            {report.event && (
              <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-amber-100">
                <div className="flex items-center gap-2 font-bold"><AlertTriangle size={18} /> Event card</div>
                <p className="mt-1 text-sm">{report.event}</p>
              </div>
            )}
            <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
              <div className="mb-2 font-bold text-blue-100">Why this happened</div>
              <ul className="space-y-2 text-sm text-slate-300">
                {strategyExplanation(report.choices).map((note) => (
                  <li key={note} className="leading-relaxed">• {note}</li>
                ))}
              </ul>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(['temperature', 'ice', 'food', 'rain', 'trust', 'knowledge'] as (keyof Indicators)[]).map((key) => {
                const diff = differenceText(key, report.current[key], report.previous[key]);
                const label = key === 'temperature' ? 'Temperature' : key.charAt(0).toUpperCase() + key.slice(1);
                const value = key === 'temperature' ? `+${report.current[key].toFixed(2)}°C` : `${report.current[key]}%`;
                return (
                  <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="font-mono text-xl font-black text-white">{value}</span>
                      <span className={`font-bold ${diff.className}`}>{diff.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={closeReport} className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-500">
              {year >= END_YEAR ? 'Proceed to final evaluation' : 'Continue to next decade'}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black text-white"><Globe2 className="text-cyan-400" /> SAI Governance Challenge V2</h1>
            <p className="text-slate-400">Round {Math.min(strategyLog.length + 1, 10)} / 10 · Planning {year} to {year + 10}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><span className="text-slate-500">Target year:</span> <span className="font-bold text-white">{END_YEAR}</span></div>
            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 px-4 py-3"><span className="text-slate-400">Governance Points:</span> <span className={pointsRemaining < 0 ? 'font-black text-red-400' : 'font-black text-emerald-300'}>{pointsRemaining}/{availablePoints}</span></div>
            <button onClick={() => setIntroOpen(true)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-slate-300 hover:border-blue-500"><Info size={16} className="inline mr-1" /> Intro</button>
          </div>
        </header>

        <EarthVisual indicators={indicators} />

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <InfoCard>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-white">Decision board</h2>
                <div className="rounded-full bg-slate-950 px-3 py-1 text-sm text-slate-400">Cost: {currentCost} GP</div>
              </div>

              <div className="space-y-5">
                <section className={`rounded-2xl border p-3 text-xs leading-relaxed ${evidenceTier.tone}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold"><Brain size={15} /> Evidence-based decision support</div>
                    <div className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200">Trust effect: {evidenceTrustEffect > 0 ? '+' : ''}{evidenceTrustEffect}</div>
                  </div>
                  <p>{evidenceTier.description}</p>
                  <ul className="mt-2 space-y-1 text-slate-300">
                    {evidenceInsights.slice(0, indicators.knowledge < 35 ? 2 : indicators.knowledge < 70 ? 4 : 7).map((line, index) => (
                      <li key={index}>• {line}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><ThermometerSnowflake size={16} /> Level 1: Temperature target</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={target === 'moderate'} title="Stabilize near 1.5°C" subtitle="Moderate intervention. Lower climate risk, fewer side effects." cost={2 + particleMeta[particle].cost} tone="blue" onClick={() => setTarget('moderate')} />
                    <ChoiceCard selected={target === 'aggressive'} title="Aggressive cooling near 1.0°C" subtitle="Reduces heat stress, but rainfall risk rises strongly." cost={4 + particleMeta[particle].cost} tone="emerald" onClick={() => setTarget('aggressive')} />
                    <ChoiceCard selected={target === 'emergency'} disabled={!emergencyUnlocked} title="Emergency cooling near 0.8°C" subtitle={emergencyUnlocked ? 'Extreme action. High chance of overcooling and backlash.' : 'Locked until 2070 or severe warming.'} cost={5 + particleMeta[particle].cost} tone="red" onClick={() => setTarget('emergency')} />
                    <ChoiceCard selected={target === 'none'} title="No SAI this decade" subtitle="No injection. Safe politically unless it stops an active SAI program." cost={0} tone="red" onClick={() => setTarget('none')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><CloudRain size={16} /> Level 2: Seasonality</h3>
                  <div className="grid gap-2 md:grid-cols-3">
                    <ChoiceCard selected={season === 'annual'} disabled={target === 'none'} title="Annual" subtitle="Reference strategy." cost={0} onClick={() => setSeason('annual')} />
                    <ChoiceCard selected={season === 'spring'} disabled={target === 'none'} title="Spring" subtitle="Efficient, rain risk." cost={target === 'none' ? 0 : 1} tone="amber" onClick={() => setSeason('spring')} />
                    <ChoiceCard selected={season === 'autumn'} disabled={target === 'none'} title="Autumn" subtitle="Ice and monsoon benefit." cost={target === 'none' ? 0 : 1} tone="emerald" onClick={() => setSeason('autumn')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Globe2 size={16} /> Level 3: Injection location</h3>
                  <div className="grid gap-2 md:grid-cols-3">
                    <ChoiceCard selected={location === 'tropical'} disabled={target === 'none'} title="Tropical" subtitle="Global spread; polar undercooling risk." cost={0} onClick={() => setLocation('tropical')} />
                    <ChoiceCard selected={location === 'subtropical'} disabled={target === 'none'} title="Subtropical" subtitle="Balanced control." cost={target === 'none' ? 0 : 1} tone="emerald" onClick={() => setLocation('subtropical')} />
                    <ChoiceCard selected={location === 'polar'} disabled={target === 'none'} title="Polar" subtitle="Ice rescue, rainfall-shift risk." cost={target === 'none' ? 0 : 2} tone="red" onClick={() => setLocation('polar')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Atom size={16} /> Level 4: Particle material / research gap</h3>
                  <div className="mb-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs leading-relaxed text-purple-100">
                    This level is the research gap. Sulfate is the known baseline. CaCO₃/calcite is partly known. A future engineered particle is locked until enough research is done.
                  </div>
                  <div className="space-y-2">
                    <ChoiceCard selected={particle === 'sulfate'} title="Sulfate particles" subtitle="Known baseline: known cooling, lifetime and risks." cost={target === 'none' ? 0 : particleMeta.sulfate.cost} tone="blue" onClick={() => setParticle('sulfate')} />
                    <ChoiceCard selected={particle === 'caco3'} title="CaCO₃ / calcite particles" subtitle="Partly researched alternative. More uncertainty." cost={target === 'none' ? 0 : particleMeta.caco3.cost} tone="purple" onClick={() => setParticle('caco3')} />
                    <ChoiceCard selected={particle === 'future'} disabled={!futureUnlocked} title="Future engineered particle" subtitle={futureUnlocked ? 'Unlocked by research. High reward, high uncertainty.' : 'Locked: needs ≥70% knowledge and year ≥2080.'} cost={target === 'none' ? 0 : particleMeta.future.cost} tone="amber" onClick={() => setParticle('future')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Microscope size={16} /> Optional support action: research, monitoring or adaptation</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={research === 'none'} title="No extra research" subtitle="Save points, but uncertainty remains." cost={0} onClick={() => setResearch('none')} />
                    <ChoiceCard selected={research === 'lab'} title="Laboratory particle testing" subtitle="Aerosol generator, reactor, SMPS, coagulation chamber." cost={2} tone="purple" onClick={() => setResearch('lab')} />
                    <ChoiceCard selected={research === 'monitoring'} title="Monitoring and open data" subtitle="Measure aerosol layer, transport, optical scattering and settling." cost={2} tone="emerald" onClick={() => setResearch('monitoring')} />
                    <ChoiceCard selected={research === 'adaptation'} title="Compensation and adaptation" subtitle="Support regions damaged by side effects." cost={2} tone="amber" onClick={() => setResearch('adaptation')} />
                  </div>
                </section>
              </div>

              {pointsRemaining < 0 && <div className="mt-5 rounded-2xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-200">Not enough Governance Points. Choose cheaper options.</div>}
              <button
                onClick={processDecade}
                disabled={pointsRemaining < 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                <Play size={18} /> Complete decade
              </button>
            </InfoCard>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              <MetricCard icon={<ThermometerSnowflake size={22} />} title="Temp." value={`+${indicators.temperature.toFixed(2)}°C`} tone={indicators.temperature > 2 ? 'text-red-400' : 'text-cyan-400'} />
              <MetricCard icon={<Snowflake size={22} />} title="Ice" value={`${indicators.ice}%`} tone={indicators.ice < 35 ? 'text-red-400' : 'text-blue-400'} />
              <MetricCard icon={<Wheat size={22} />} title="Food" value={`${indicators.food}%`} tone={indicators.food < 40 ? 'text-red-400' : 'text-amber-400'} />
              <MetricCard icon={<CloudRain size={22} />} title="Rain" value={`${indicators.rain}%`} tone={indicators.rain < 40 ? 'text-red-400' : 'text-cyan-400'} />
              <MetricCard icon={<Scale size={22} />} title="Trust" value={`${indicators.trust}%`} tone={indicators.trust < 40 ? 'text-red-400' : 'text-emerald-400'} />
              <MetricCard icon={<Beaker size={22} />} title="Knowledge" value={`${indicators.knowledge}%`} tone={indicators.knowledge < 50 ? 'text-amber-400' : 'text-purple-400'} />
            </div>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Research gap tracker</h2>
              <div className="overflow-hidden rounded-2xl border border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800 text-slate-300"><tr><th className="p-3">Particle</th><th className="p-3">Cooling</th><th className="p-3">Lifetime</th><th className="p-3">Risk</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr><td className="p-3">Sulfate</td><td className="p-3">Known</td><td className="p-3">Known</td><td className="p-3">Known</td></tr>
                    <tr><td className="p-3">CaCO₃ / calcite</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td></tr>
                    <tr><td className="p-3">Future particle</td><td className="p-3">{futureUnlocked ? 'Research unlocked' : '???'}</td><td className="p-3">{futureUnlocked ? 'Partly modeled' : '???'}</td><td className="p-3">{futureUnlocked ? 'Still uncertain' : '???'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-sm text-purple-100">
                Evidence level: {indicators.knowledge}%. Knowledge increases when laboratory testing or monitoring is funded. It represents how much of the research gap has been investigated: particle synthesis, aerosol generation, SMPS size distribution, optical scattering, coagulation/agglomeration, settling velocity and transport/climate modelling. Higher evidence reveals more decision detail, reduces uncertainty for CaCO₃/calcite, changes how public trust reacts to risky choices, and unlocks future engineered particles after 2080 at 70% evidence.
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Temperature trajectory</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} ticks={[2030, 2050, 2070, 2090, 2110, 2130]} stroke="#64748b" />
                    <YAxis domain={[0, 4.2]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="3 3" label={{ value: '1.5°C', fill: '#10b981', fontSize: 10 }} />
                    <Line type="linear" dataKey="withoutSAI" name="Without SAI" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} legendType="plainline" />
                    <Line type="linear" dataKey="temperature" name="Actual temp." stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} legendType="circle" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Regional and governance stability</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} ticks={[2030, 2050, 2070, 2090, 2110, 2130]} stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <Line type="linear" dataKey="ice" name="Arctic ice" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="food" name="Food security" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="rain" name="Rain/monsoon" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="trust" name="Public trust" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="knowledge" name="Knowledge" stroke="#e879f9" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><ShieldAlert className="text-red-400" /> Extreme outcome rules</h2>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Termination shock:</b> stop SAI suddenly after multiple active decades.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Overcooling:</b> aggressive SAI plus volcanic aerosol event.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Rainfall crisis:</b> repeated polar/asymmetric intervention.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Particle surprise:</b> CaCO₃/future material with low knowledge. This is the Level 4 research-gap risk.</div>
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

import React from 'react';
import { AlertTriangle, ShieldCheck, Flame, Info, HelpCircle } from 'lucide-react';

export default function RiskBadge({ score, tier, isColdStart = false, showLabel = true, size = "md" }) {
  if (isColdStart || tier === "Insufficient History") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs bg-surface-raised text-slate-300 border border-surface-border backdrop-blur-sm">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        {showLabel ? "Cold Start (<3 mos)" : "Cold Start"}
      </span>
    );
  }

  let colorClasses = "";
  let glow = "";
  let icon = null;

  if (score >= 80 || tier === "Critical") {
    colorClasses = "bg-red-500/10 text-red-400 border-red-500/30";
    glow = "shadow-[0_0_16px_-4px_rgba(239,68,68,0.45)]";
    icon = <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse-subtle" />;
  } else if (score >= 65 || tier === "High") {
    colorClasses = "bg-orange-500/10 text-orange-400 border-orange-500/30";
    glow = "shadow-[0_0_14px_-5px_rgba(249,115,22,0.4)]";
    icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
  } else if (score >= 45 || tier === "Medium") {
    colorClasses = "bg-amber-500/10 text-amber-300 border-amber-500/30";
    glow = "";
    icon = <Info className="w-3.5 h-3.5 text-amber-400" />;
  } else {
    colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    glow = "";
    icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
  }

  const sizeClasses = size === "lg"
    ? "px-3.5 py-1.5 text-sm font-bold gap-2"
    : size === "sm"
    ? "px-2 py-0.5 text-xs font-semibold gap-1"
    : "px-2.5 py-1 text-xs font-bold gap-1.5";

  return (
    <span className={`inline-flex items-center rounded-full border backdrop-blur-sm transition-shadow duration-200 ${colorClasses} ${sizeClasses} ${glow}`}>
      {icon}
      <span className="tabular-nums">{score !== undefined ? `${score}/100` : tier}</span>
      {showLabel && tier && <span className="opacity-70 font-medium">({tier})</span>}
    </span>
  );
}

"use client";
import React from "react";
import { AlertTriangle, Play, Check, Loader2, Bot } from "lucide-react";
import useStore from "../hooks/useStore";

export default function AgentDock() {
  const agent = useStore((state) => state.agent);
  const runAgent = useStore((state) => state.runAgent);
  const applyAgentAction = useStore((state) => state.applyAgentAction);
  const suggestions = agent?.suggestions ?? [];
  const isRunning = agent?.running ?? false;
  const error = agent?.error;
  const summary = agent?.summary ?? "";

  const getActionIcon = (action) => {
    switch (action.type) {
      case "ALERT":
        return <AlertTriangle className="text-yellow-300" size={16} />;
      case "UPDATE_PROJECT":
        return (
          <button
            onClick={() => applyAgentAction(action)}
            className="text-green-300 hover:text-green-200"
            title="Aplicar"
          >
            <Check size={18} />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800/90 border border-purple-500/30 rounded-xl p-4 w-[380px] backdrop-blur shadow-2xl text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2"><Bot size={18} /> Cerezo Planner Agent</h3>
        <button
          onClick={() => runAgent("diagnose")}
          className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg flex items-center gap-1.5 text-sm"
          disabled={isRunning}
        >
          {isRunning ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
          {isRunning ? 'Analizando...' : 'Ejecutar'}
        </button>
      </div>

      {error && <p className="text-red-300 text-sm mb-2">Error: {error}</p>}
      
      {summary && (
        <p className="text-xs text-slate-400 mb-3 italic">
          &ldquo;{summary}&rdquo;
        </p>
      )}

      <div className="max-h-64 overflow-y-auto space-y-2 soft-scroll pr-1">
        {suggestions.map((a, idx) => (
          <div key={idx} className="bg-slate-700/60 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-200 text-sm font-medium">{a.type}</p>
                {a.payload?.projectName && <p className="text-xs text-purple-300 font-semibold">{a.payload.projectName}</p>}
              </div>
              {getActionIcon(a)}
            </div>
            {(a.message || a.justification) && <p className="text-slate-400 text-xs mt-1">{a.message || a.justification}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

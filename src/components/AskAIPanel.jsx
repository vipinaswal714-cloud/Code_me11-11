import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Settings,
  AlertCircle,
  Plus,
  BarChart2,
  ShieldAlert,
  Check,
  Calculator,
  Eye,
  ShieldCheck
} from 'lucide-react';
import {
  hasAcknowledgedAskAi,
  recordAskAiAcknowledgment,
  ASK_AI_NOTICE
} from '../constants/privacyNotices';
import { askGeminiQuestion, buildDatasetContext, getAiSettings, checkBackendProxy } from '../utils/aiClient';
import { aggregateData, calculateKPI } from '../utils/analyticsEngine';
import { formatRuleAsSentence } from '../utils/ruleEvaluator';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const SAMPLE_QUESTIONS = [
  'Which category earns the most revenue?',
  'What is the performance trend over time?',
  'Which products have the lowest margins?',
  'Provide an executive summary of key metrics'
];

const PIE_COLORS = ['#026fc7', '#0891b2', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AskAIPanel({
  isOpen,
  onClose,
  data,
  columns,
  summary,
  onAddTileToDashboard,
  onOpenSettings,
  onApplyAiRule
}) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [addedTileIds, setAddedTileIds] = useState(new Set());
  const [backendConfigured, setBackendConfigured] = useState(true);
  const [isAcknowledged, setIsAcknowledged] = useState(() => hasAcknowledgedAskAi());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const ack = hasAcknowledgedAskAi();
      setIsAcknowledged(prev => (prev !== ack ? ack : prev));
      checkBackendProxy().then(info => {
        if (info) {
          setBackendConfigured(Boolean(info.configured));
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, isLoading]);

  if (!isOpen) return null;

  const handleAsk = async (userPrompt = null) => {
    if (!hasAcknowledgedAskAi()) {
      setIsAcknowledged(false);
      setError({
        type: 'PRIVACY_UNACKNOWLEDGED',
        message: 'Please review and acknowledge the Ask AI data privacy notice before submitting questions.'
      });
      return;
    }

    const questionToAsk = (userPrompt || query).trim();
    if (!questionToAsk || isLoading) return;

    setError(null);
    setIsLoading(true);
    setQuery('');

    const newMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: questionToAsk,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setConversation(prev => [...prev, newMsg]);

    try {
      const context = buildDatasetContext(data, columns, summary);
      const aiResponse = await askGeminiQuestion(questionToAsk, context);

      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        answer: aiResponse.answer,
        insights: aiResponse.insights || [],
        chart: aiResponse.chart || null,
        conditionRule: aiResponse.conditionRule || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversation(prev => [...prev, aiMsg]);
    } catch (err) {
      setError({
        type: err.type || 'UNKNOWN',
        message: err.message || 'An unexpected error occurred while querying Gemini.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChartToDashboard = (chartConfig) => {
    if (!chartConfig) return;
    const tile = {
      id: `tile-ai-${Date.now()}`,
      type: chartConfig.type || 'bar',
      title: chartConfig.title || 'AI Recommended Chart',
      xCol: chartConfig.xField,
      yCol: chartConfig.yField,
      agg: chartConfig.aggregation || 'sum',
      w: 6
    };
    onAddTileToDashboard(tile);
    setAddedTileIds(prev => new Set([...prev, chartConfig.title]));
  };

  const renderMiniChart = (chartConfig) => {
    if (!chartConfig || !chartConfig.xField || !chartConfig.yField) return null;

    if (chartConfig.type === 'kpi') {
      const kpiVal = calculateKPI(data, chartConfig.yField, chartConfig.aggregation || 'sum');
      return (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center my-2">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            {chartConfig.aggregation?.toUpperCase()} of {chartConfig.yField}
          </p>
          <p className="text-xl font-black text-metrica-600 dark:text-metrica-400 mt-0.5">
            {kpiVal !== null ? (typeof kpiVal === 'number' ? kpiVal.toLocaleString() : kpiVal) : 'N/A'}
          </p>
        </div>
      );
    }

    const aggregated = aggregateData(
      data,
      chartConfig.xField,
      chartConfig.yField,
      chartConfig.aggregation || 'sum',
      5
    );

    if (aggregated.length === 0) return null;

    return (
      <div className="h-36 w-full my-2 bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          {chartConfig.type === 'line' ? (
            <LineChart data={aggregated}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} width={25} />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '4px 8px' }}
                formatter={(val) => [Number(val).toLocaleString(), chartConfig.yField]}
              />
              <Line type="monotone" dataKey="value" stroke="#026fc7" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          ) : chartConfig.type === 'donut' ? (
            <PieChart>
              <Pie
                data={aggregated}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={45}
                paddingAngle={2}
              >
                {aggregated.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '4px 8px' }}
                formatter={(val) => [Number(val).toLocaleString(), chartConfig.yField]}
              />
            </PieChart>
          ) : (
            <BarChart data={aggregated}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} width={25} />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '4px 8px' }}
                formatter={(val) => [Number(val).toLocaleString(), chartConfig.yField]}
              />
              <Bar dataKey="value" fill="#026fc7" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-metrica-600 to-cyan-500 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Ask AI</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-metrica-100 dark:bg-metrica-950 text-metrica-700 dark:text-metrica-300">
                Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Natural language insights & chart recommendations</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            title="AI Settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Ask AI First-Use Privacy Acknowledgment Card */}
        {!isAcknowledged && (
          <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-slate-900 dark:text-slate-100 space-y-3 mb-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Ask AI Privacy Disclosure</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">First-use acknowledgment required</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50">
              {ASK_AI_NOTICE}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/privacy');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-xs text-metrica-600 dark:text-metrica-400 underline underline-offset-2 hover:text-metrica-700 font-semibold"
              >
                Read full Privacy Notice
              </a>

              <button
                type="button"
                onClick={() => {
                  recordAskAiAcknowledgment();
                  setIsAcknowledged(true);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-metrica-600 hover:bg-metrica-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                <span>I Understand & Continue</span>
              </button>
            </div>
          </div>
        )}

        {/* Missing API Key Warning on Server */}
        {!backendConfigured && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Google Gemini API Key Required
            </div>
            <p className="text-[11px] opacity-90">
              Please configure <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded font-mono">GEMINI_API_KEY</code> in <code className="font-mono">server/.env</code> to activate Ask AI Q&A and chart recommendations.
            </p>
            <button
              onClick={onOpenSettings}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              View Connection Status
            </button>
          </div>
        )}

        {/* Welcome State when no conversation yet */}
        {conversation.length === 0 && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">
                👋 Ask any question about your data!
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Powered by Google Gemini. Ask about top performers, trends over time, or have the AI build a starter chart tile for your dashboard.
              </p>
            </div>

            {/* Suggested Starter Questions */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1">
                Suggested Questions
              </p>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(q)}
                    disabled={!isAcknowledged || isLoading}
                    className="text-left text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-metrica-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Bubble History */}
        {conversation.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl p-4 text-xs ${
                msg.role === 'user'
                  ? 'bg-metrica-600 text-white rounded-br-none shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              ) : (
                <div className="space-y-3">
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.answer}</p>

                  {/* Bullet Insights */}
                  {msg.insights && msg.insights.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pt-1 text-[11px]">
                      {msg.insights.map((ins, i) => (
                        <li key={i}>{ins}</li>
                      ))}
                    </ul>
                  )}

                  {/* Recommended Chart Card */}
                  {msg.chart && (
                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-metrica-600 dark:text-metrica-400" />
                          <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                            {msg.chart.title || 'Recommended Chart'}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {msg.chart.type}
                        </span>
                      </div>

                      {/* Mini Recharts Preview */}
                      {renderMiniChart(msg.chart)}

                      {/* Explicit Calculation Note */}
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Calculator className="w-3 h-3 text-metrica-500" />
                        <span>Calculated on complete dataset via JavaScript engine</span>
                      </p>

                      <button
                        onClick={() => handleAddChartToDashboard(msg.chart)}
                        disabled={addedTileIds.has(msg.chart.title)}
                        className={`mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                          addedTileIds.has(msg.chart.title)
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-metrica-50 dark:bg-metrica-950/60 hover:bg-metrica-100 dark:hover:bg-metrica-900/60 text-metrica-600 dark:text-metrica-400 border border-metrica-200 dark:border-metrica-800'
                        }`}
                      >
                        {addedTileIds.has(msg.chart.title) ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added to Dashboard</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Dashboard</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Recommended Condition Rule Card */}
                  {msg.conditionRule && (
                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                            Generated Condition Rule
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          Rule Suggestion
                        </span>
                      </div>

                      <div className="my-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 leading-snug">
                        {formatRuleAsSentence(msg.conditionRule)}
                      </div>

                      <p className="text-[10px] text-slate-400 mb-2">
                        Requires user confirmation before application. Review and test in the Conditions Panel.
                      </p>

                      <button
                        onClick={() => {
                          if (onApplyAiRule) {
                            onApplyAiRule(msg.conditionRule);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold text-xs bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Review & Load in Conditions Panel</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit animate-pulse">
            <Sparkles className="w-4 h-4 text-metrica-500 animate-spin" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Gemini is analyzing your data sample...
            </span>
          </div>
        )}

        {/* Error Box */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              Query Error
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">{error.message}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Notice & Query Input Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="relative flex items-center gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!isAcknowledged || isLoading}
            placeholder={
              !isAcknowledged
                ? 'Please review and accept the privacy disclosure above to begin...'
                : 'Ask about trends, totals, or comparisons...'
            }
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-metrica-500/40 pr-10 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!isAcknowledged || !query.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-metrica-600 hover:bg-metrica-700 text-white disabled:opacity-40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Required Canonical Privacy Notice */}
        <div className="flex items-start gap-1.5 justify-center mt-2.5 text-center px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
            {ASK_AI_NOTICE}{' '}
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/privacy');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-metrica-600 dark:text-metrica-400 underline underline-offset-2 font-medium hover:text-metrica-700"
            >
              Privacy Notice
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

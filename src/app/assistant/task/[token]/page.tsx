'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import './result.css';

interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface AnalysisResult {
  token: string;
  task: string;
  result: string;
  prompt?: string;
  model?: string;
  created_at: string;
  source_excerpt?: string;
}

const ANALYSIS_API_BASE = '/api/assistant/analysis';

export default function AssistantAnalysisResult() {
  const router = useRouter();
  const params = useParams();
  const tokenParam = params.token as string;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('userData');

    if (!token || !user) {
      router.push('/auth');
      return;
    }

    try {
      const parsed = JSON.parse(user) as UserData;
      setUserData(parsed);
      setAuthLoading(false);
    } catch (err) {
      console.error('[ASSISTANT RESULT] Failed to parse user data:', err);
      localStorage.clear();
      router.push('/auth');
    }
  }, [router]);

  useEffect(() => {
    if (authLoading || !tokenParam) {
      return;
    }

    let cached: AnalysisResult | null = null;
    try {
      const cachedItem = sessionStorage.getItem('latestAnalysis');
      if (cachedItem) {
        const parsed = JSON.parse(cachedItem) as AnalysisResult;
        if (parsed.token === tokenParam) {
          cached = parsed;
          setAnalysis(parsed);
          setAnalysisLoading(false);
        }
      }
    } catch (cacheError) {
      console.warn('[ASSISTANT RESULT] Failed to read cached analysis:', cacheError);
    }

    const fetchAnalysis = async () => {
      setAnalysisLoading(!cached);
      setError(null);

      try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          throw new Error('Authentication token missing. Please login again.');
        }

        const response = await fetch(`${ANALYSIS_API_BASE}/${tokenParam}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const rawBody = await response.text();
        let payload: unknown = null;
        if (rawBody) {
          try {
            payload = JSON.parse(rawBody);
          } catch {
            payload = null;
          }
        }

        if (!response.ok) {
          const detail =
            payload && typeof payload === 'object' && 'detail' in payload
              ? (payload as { detail?: string }).detail
              : rawBody?.trim() || undefined;
          const message =
            detail ?? `Failed to fetch analysis result (status ${response.status}).`;
          throw new Error(message);
        }

        if (!payload || typeof payload !== 'object' || !(payload as AnalysisResult).token) {
          throw new Error('Received unexpected analysis response.');
        }

        setAnalysis(payload as AnalysisResult);
        sessionStorage.setItem('latestAnalysis', JSON.stringify(payload));
      } catch (fetchError) {
        console.error('[ASSISTANT RESULT] Fetch failed:', fetchError);
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load analysis result at this time.';
        setError(message);
      } finally {
        setAnalysisLoading(false);
      }
    };

    fetchAnalysis();
  }, [authLoading, tokenParam]);

  const handleSignOut = () => {
    localStorage.clear();
    window.location.replace('/auth');
  };

  const handleDownload = () => {
    if (!analysis) return;

    const blob = new Blob([analysis.result], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `advotac-analysis-${analysis.token}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis.result);
      alert('Analysis copied to clipboard.');
    } catch (err) {
      console.error('[ASSISTANT RESULT] Copy failed:', err);
      alert('Unable to copy analysis. Please copy manually.');
    }
  };

  const handleRetry = () => {
    setAnalysisLoading(true);
    setError(null);
    sessionStorage.removeItem('latestAnalysis');
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f7f9fc',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '24px',
              marginBottom: '16px',
              color: '#0E8587',
            }}
          >
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const statusClass = analysis ? 'status-icon success' : 'status-icon processing';
  const statusHeading = analysis ? 'Analysis Complete' : 'Processing Your Request';
  const statusDescription = analysis
    ? 'Your assistant finished processing the request.'
    : analysisLoading
    ? 'Your assistant is analyzing your request...'
    : 'Unable to load analysis result.';

  const statusLabel = analysis ? 'Completed' : analysisLoading ? 'Processing' : 'Unavailable';
  const createdAt = analysis ? new Date(analysis.created_at).toLocaleString() : '—';

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/advotac_logo.png" alt="Advotac Logo" className="logo-image" />
            <div>
              <h2>Advotac</h2>
              <p>Legal AI Workspace</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            Overview
          </a>

          <a href="/assistant" className="nav-item active">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            Assistant
          </a>

          <a href="/research" className="nav-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            Research
          </a>

          <a href="/drafting" className="nav-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Drafting
          </a>

          <a href="/workflow" className="nav-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Workflow
          </a>

          <a href="/history" className="nav-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            History
          </a>
        </nav>

        <div className="sidebar-footer">
          <a href="/settings" className="nav-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            Settings
          </a>

          <button onClick={handleSignOut} className="nav-item logout-btn">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="back-button" onClick={() => router.push('/assistant')} title="Go back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <h1>Assistant Result</h1>
              <span className="output-type-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7h18" />
                  <path d="M3 12h18" />
                  <path d="M3 17h18" />
                </svg>
                {analysis?.task ?? 'Analysis'}
              </span>
            </div>
          </div>
        </header>

        <div className="result-content">
          <div className="result-wrapper">
            <section className="result-status">
              <div className={statusClass}>
                {analysis ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                )}
              </div>
              <div className="status-content">
                <h2>{statusHeading}</h2>
                <p>{statusDescription}</p>

                {!analysis && error && (
                  <div className="assistant-error" style={{ marginTop: '12px' }}>
                    {error}
                  </div>
                )}

                {!analysis && (
                  <button className="retry-button" onClick={handleRetry}>
                    Retry Fetch
                  </button>
                )}
              </div>
            </section>

            <section className="info-cards">
              <div className="info-card">
                <div className="info-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l1.09 3.36L16 6l-2.5 1.82L14 11l-2-1.45L10 11l.5-3.18L8 6l2.91-.64L12 2z" />
                  </svg>
                </div>
                <div>
                  <h3>Status</h3>
                  <p>{statusLabel}</p>
                  <small>Latest update</small>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 5h18M3 12h18M3 19h18" />
                  </svg>
                </div>
                <div>
                  <h3>Task</h3>
                  <p>{analysis?.task ?? '—'}</p>
                  <small>Requested action</small>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <div>
                  <h3>Created</h3>
                  <p>{createdAt}</p>
                  <small>Submission time</small>
                </div>
              </div>
            </section>

            <section className="result-preview">
              <div className="preview-header">
                <h2>Analysis Output</h2>
                <div className="preview-actions">
                  <button onClick={handleCopy}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy
                  </button>
                  <button onClick={handleDownload}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
              <div className="result-box">
                {analysis ? (
                  <pre>{analysis.result}</pre>
                ) : analysisLoading ? (
                  <div className="loading-placeholder">Waiting for analysis result...</div>
                ) : (
                  <div className="loading-placeholder">
                    Unable to load analysis result. Please retry or contact support.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

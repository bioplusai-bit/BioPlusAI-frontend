import { useState, useEffect, useRef, useCallback } from 'react';
import type { JobProgress } from '../types';
import { getProgress } from '../services/api';

const DONE = new Set(['Finished', 'Failed', 'Cancelled', 'Paused']);

export function usePolling(jobId: string | null, ms = 3000) {
  const [data,  setData]  = useState<JobProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop  = useCallback(() => { if (timer.current) clearInterval(timer.current); }, []);

  const poll = useCallback(async (id: string) => {
    try {
      const p = await getProgress(id);
      setData(p);
      if (DONE.has(p.state)) stop();
    } catch (e: any) {
      setError(e.message);
    }
  }, [stop]);

  const restart = useCallback(() => {
    if (!jobId) return;
    stop();
    poll(jobId);
    timer.current = setInterval(() => poll(jobId), ms);
  }, [jobId, ms, poll, stop]);

  useEffect(() => {
    if (!jobId) return;
    restart();
    return stop;
  }, [jobId]);          // eslint-disable-line

  return { data, error, restart };
}

import axios from 'axios';
import type { JobProgress, JobSummary, JobDetail } from '../types';

const BASE = (process.env.REACT_APP_API_URL || 'https://bioplusaiv1-production.up.railway.app').replace(/\/$/, '');

const api = axios.create({ baseURL: BASE, timeout: 30_000 });

export const uploadFile = async (file: File): Promise<{ jobId: string }> => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post('/api/dna/analyze', fd);
  return res.data;
};

export const getProgress = async (id: string): Promise<JobProgress> => {
  const res = await api.get(`/api/dna/jobs/${id}/progress`);
  return res.data;
};

export const getJobs = async (): Promise<JobSummary[]> => {
  const res = await api.get('/api/dna/jobs');
  return res.data;
};

export const getJob = async (id: string): Promise<JobDetail> => {
  const res = await api.get(`/api/dna/jobs/${id}`);
  return res.data;
};

export const getVcfText = async (id: string): Promise<string> => {
  const res = await api.get(`/api/dna/jobs/${id}/vcf`, { responseType: 'text' });
  return res.data;
};

export const getVcfDownloadUrl = async (id: string): Promise<string> => {
  const res = await api.get(`/api/dna/jobs/${id}/vcf/download`);
  return res.data.url;
};

export const pauseJob  = async (id: string) => api.post(`/api/dna/jobs/${id}/pause`);
export const resumeJob = async (id: string) => api.post(`/api/dna/jobs/${id}/resume`);

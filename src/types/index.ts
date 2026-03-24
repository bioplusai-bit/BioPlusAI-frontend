export type JobState =
  | 'Uploaded' | 'Uploading' | 'Processing'
  | 'Paused' | 'Finished' | 'Failed' | 'Cancelled';

export type AnalysisStep =
  | 'None' | 'Uploading' | 'DeepVariant' | 'SavingResults' | 'Completed';

export interface JobProgress {
  id:           string;
  fileName:     string;
  state:        JobState;
  currentStep:  AnalysisStep;
  progress:     number;
  stepMessage:  string | null;
  errorMessage: string | null;
  outputVcfKey: string | null;
  variantCount: number;
}

export interface JobSummary extends JobProgress {
  createdAt:  string;
  finishedAt: string | null;
}

export interface JobDetail extends JobSummary {
  inputFileKey: string | null;
  variants: VariantRow[] | null;
}

export interface VariantRow {
  id:         string;
  chromosome: string;
  position:   number;
  ref:        string;
  alt:        string;
}

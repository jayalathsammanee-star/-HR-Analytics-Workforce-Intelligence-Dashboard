import React, { createContext, useContext, useState } from 'react';
import {
  appendCustomSampleEmployee,
  appendSampleBatch,
  buildSyntheticHrDataset,
  CustomSampleInput,
  HR_DATASET,
  HrDataset,
} from '../data/syntheticHrData';

interface HrDataContextValue {
  dataset: HrDataset;
  addedRecordsCount: number;
  addSampleBatch: (count: number, mode: 'balanced' | 'high-strain') => void;
  addCustomSampleEmployee: (input: CustomSampleInput) => void;
  resetDataset: () => void;
}

const HrDataContext = createContext<HrDataContextValue | null>(null);

export const HrDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataset, setDataset] = useState<HrDataset>(() => HR_DATASET);
  const [addedRecordsCount, setAddedRecordsCount] = useState(0);

  const addSampleBatch = (count: number, mode: 'balanced' | 'high-strain') => {
    setDataset((prev) => appendSampleBatch(prev, count, mode));
    setAddedRecordsCount((c) => c + count);
  };

  const addCustomSampleEmployee = (input: CustomSampleInput) => {
    setDataset((prev) => appendCustomSampleEmployee(prev, input));
    setAddedRecordsCount((c) => c + 1);
  };

  const resetDataset = () => {
    setDataset(buildSyntheticHrDataset());
    setAddedRecordsCount(0);
  };

  return (
    <HrDataContext.Provider
      value={{
        dataset,
        addedRecordsCount,
        addSampleBatch,
        addCustomSampleEmployee,
        resetDataset,
      }}
    >
      {children}
    </HrDataContext.Provider>
  );
};

export function useHrData(): HrDataContextValue {
  const ctx = useContext(HrDataContext);
  if (!ctx) {
    throw new Error('useHrData must be used inside HrDataProvider');
  }
  return ctx;
}

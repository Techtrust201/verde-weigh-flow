import { useState } from "react";
import { ExportFormat } from "@/hooks/useExportData";

export type ExportType = "new" | "selective" | "complete";
export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardState {
  currentStep: WizardStep;
  exportType: ExportType | null;
  format: ExportFormat | null;
  startDate: string;
  endDate: string;
  selectedPeseeIds: Set<number>;
  templateId: number | null;
}

export function useExportWizard() {
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    exportType: null,
    format: null,
    startDate: "",
    endDate: "",
    selectedPeseeIds: new Set(),
    templateId: null,
  });

  const setStep = (step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(4, prev.currentStep + 1) as WizardStep,
    }));
  };

  const prevStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1) as WizardStep,
    }));
  };

  const setExportType = (exportType: ExportType) => {
    setState((prev) => ({ ...prev, exportType }));
  };

  const setFormat = (format: ExportFormat) => {
    setState((prev) => ({ ...prev, format }));
  };

  const setDateRange = (startDate: string, endDate: string) => {
    setState((prev) => ({ ...prev, startDate, endDate }));
  };

  const setSelectedPesees = (ids: Set<number>) => {
    setState((prev) => ({ ...prev, selectedPeseeIds: ids }));
  };

  const setTemplateId = (templateId: number | null) => {
    setState((prev) => ({ ...prev, templateId }));
  };

  const resetWizard = () => {
    setState({
      currentStep: 1,
      exportType: null,
      format: null,
      startDate: "",
      endDate: "",
      selectedPeseeIds: new Set(),
      templateId: null,
    });
  };

  const canProceedToStep2 = state.exportType !== null;
  const canProceedToStep3 = state.format !== null;
  const canProceedToStep4 =
    state.startDate !== "" && state.endDate !== "" && 
    (state.format !== "sage-template" || state.templateId !== null);

  return {
    state,
    setStep,
    nextStep,
    prevStep,
    setExportType,
    setFormat,
    setDateRange,
    setSelectedPesees,
    setTemplateId,
    resetWizard,
    canProceedToStep2,
    canProceedToStep3,
    canProceedToStep4,
  };
}

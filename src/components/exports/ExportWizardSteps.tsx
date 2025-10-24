import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface ExportWizardStepsProps {
  currentStep: number;
  steps: Step[];
}

export default function ExportWizardSteps({ currentStep, steps }: ExportWizardStepsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Line de progression */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          
          return (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold transition-all duration-300 bg-background
                  ${isCompleted ? "border-primary bg-primary text-primary-foreground" : ""}
                  ${isCurrent ? "border-primary text-primary scale-110 shadow-lg" : ""}
                  ${!isCompleted && !isCurrent ? "border-muted text-muted-foreground" : ""}
                `}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div
                  className={`text-sm font-medium transition-colors ${
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground hidden md:block">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

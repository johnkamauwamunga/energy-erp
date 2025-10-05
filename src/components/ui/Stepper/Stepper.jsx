import React from 'react';
import { Check, ChevronRight, AlertCircle, Loader } from 'lucide-react';

const Stepper = ({
  steps,
  currentStep,
  variant = 'default',
  size = 'md',
  orientation = 'horizontal',
  className = '',
  onStepClick,
  showLabels = true,
  showIcons = true,
  showConnectors = true,
  completedIcon = Check,
  errorIcon = AlertCircle,
  loadingStep = null,
  showStepNumbers = true,
  interactive = false,
  maxWidth = 'full'
}) => {
  const isStepCompleted = (stepIndex) => stepIndex < currentStep;
  const isStepCurrent = (stepIndex) => stepIndex === currentStep;
  const isStepError = (step) => step.error;
  const isStepDisabled = (step) => step.disabled;
  const isStepLoading = (stepIndex) => stepIndex === loadingStep;

  const sizeClasses = {
    sm: {
      step: 'h-8 w-8 text-xs',
      icon: 'h-3 w-3',
      label: 'text-xs',
      connector: 'h-0.5',
      spacing: orientation === 'horizontal' ? 'mx-1' : 'my-1'
    },
    md: {
      step: 'h-10 w-10 text-sm',
      icon: 'h-4 w-4',
      label: 'text-sm',
      connector: 'h-1',
      spacing: orientation === 'horizontal' ? 'mx-2' : 'my-2'
    },
    lg: {
      step: 'h-12 w-12 text-base',
      icon: 'h-5 w-5',
      label: 'text-base',
      connector: 'h-1.5',
      spacing: orientation === 'horizontal' ? 'mx-3' : 'my-3'
    }
  };

  const variantClasses = {
    default: {
      completed: {
        step: 'bg-blue-600 text-white border-blue-600 shadow-sm',
        label: 'text-blue-600 font-medium',
        connector: 'bg-blue-600'
      },
      current: {
        step: 'border-2 border-blue-600 bg-white text-blue-600 shadow-md',
        label: 'text-blue-600 font-semibold',
        connector: 'bg-gray-300'
      },
      upcoming: {
        step: 'border-2 border-gray-300 bg-white text-gray-400',
        label: 'text-gray-500',
        connector: 'bg-gray-300'
      },
      error: {
        step: 'border-2 border-red-500 bg-white text-red-500 shadow-sm',
        label: 'text-red-600 font-medium',
        connector: 'bg-red-500'
      },
      disabled: {
        step: 'border-2 border-gray-200 bg-gray-100 text-gray-400',
        label: 'text-gray-400',
        connector: 'bg-gray-200'
      },
      loading: {
        step: 'border-2 border-blue-300 bg-white text-blue-300',
        label: 'text-blue-500 font-medium',
        connector: 'bg-blue-300'
      }
    },
    minimal: {
      completed: {
        step: 'bg-gray-800 text-white border-gray-800',
        label: 'text-gray-800 font-medium',
        connector: 'bg-gray-800'
      },
      current: {
        step: 'border-2 border-gray-800 bg-white text-gray-800',
        label: 'text-gray-800 font-semibold',
        connector: 'bg-gray-300'
      },
      upcoming: {
        step: 'border border-gray-300 bg-white text-gray-400',
        label: 'text-gray-500',
        connector: 'bg-gray-300'
      },
      error: {
        step: 'border-2 border-red-500 bg-white text-red-500',
        label: 'text-red-600 font-medium',
        connector: 'bg-red-500'
      },
      disabled: {
        step: 'border border-gray-200 bg-gray-100 text-gray-400',
        label: 'text-gray-400',
        connector: 'bg-gray-200'
      },
      loading: {
        step: 'border-2 border-gray-400 bg-white text-gray-400',
        label: 'text-gray-600 font-medium',
        connector: 'bg-gray-400'
      }
    }
  };

  const getStepState = (stepIndex, step) => {
    if (isStepLoading(stepIndex)) return 'loading';
    if (isStepDisabled(step)) return 'disabled';
    if (isStepError(step)) return 'error';
    if (isStepCompleted(stepIndex)) return 'completed';
    if (isStepCurrent(stepIndex)) return 'current';
    return 'upcoming';
  };

  const StepIcon = ({ step, stepIndex, state }) => {
    if (state === 'loading') {
      return <Loader className={`${sizeClasses[size].icon} animate-spin`} />;
    }

    if (state === 'completed' && completedIcon) {
      const CompletedIcon = completedIcon;
      return <CompletedIcon className={sizeClasses[size].icon} />;
    }

    if (state === 'error' && errorIcon) {
      const ErrorIcon = errorIcon;
      return <ErrorIcon className={sizeClasses[size].icon} />;
    }

    if (step.icon) {
      const StepCustomIcon = step.icon;
      return <StepCustomIcon className={sizeClasses[size].icon} />;
    }

    if (showStepNumbers) {
      return <span className="font-semibold">{stepIndex + 1}</span>;
    }

    return null;
  };

  const StepConnector = ({ state, isLast }) => {
    if (isLast || !showConnectors) return null;

    const stateClass = variantClasses[variant][state]?.connector || variantClasses[variant].upcoming.connector;

    if (orientation === 'horizontal') {
      return (
        <div 
          className={`
            flex-1 transition-all duration-300
            ${sizeClasses[size].connector} 
            ${sizeClasses[size].spacing}
            ${stateClass}
          `}
        />
      );
    }

    return (
      <div 
        className={`
          w-0.5 flex-1 transition-all duration-300
          ${sizeClasses[size].connector} 
          ${sizeClasses[size].spacing}
          ${stateClass}
        `}
      />
    );
  };

  const Step = ({ step, stepIndex, isLast }) => {
    const state = getStepState(stepIndex, step);
    const stateClasses = variantClasses[variant][state] || variantClasses[variant].upcoming;
    const sizeClass = sizeClasses[size];

    const handleClick = () => {
      if (interactive && onStepClick && !isStepDisabled(step) && stepIndex !== currentStep) {
        onStepClick(stepIndex, step);
      }
    };

    const stepContent = (
      <div 
        className={`
          flex items-center transition-all duration-200
          ${orientation === 'horizontal' ? 'flex-1 flex-col' : 'flex-row'}
          ${interactive && !isStepDisabled(step) ? 'cursor-pointer group' : 'cursor-default'}
        `}
        onClick={handleClick}
      >
        {/* Step circle and connector container */}
        <div className={`
          flex items-center
          ${orientation === 'horizontal' ? 'w-full' : 'flex-col h-20'}
          ${interactive && !isStepDisabled(step) ? 'group-hover:scale-105 transition-transform' : ''}
        `}>
          {/* Step circle */}
          <div className={`
            flex items-center justify-center rounded-full font-medium transition-all duration-300
            ${sizeClass.step}
            ${stateClasses.step}
            ${step.status && 'relative'}
          `}>
            <StepIcon step={step} stepIndex={stepIndex} state={state} />
            
            {/* Status badge */}
            {step.status && (
              <span className={`
                absolute -top-1 -right-1 rounded-full text-xs px-1 py-0.5
                ${step.status === 'warning' ? 'bg-yellow-500 text-white' : ''}
                ${step.status === 'info' ? 'bg-blue-500 text-white' : ''}
                ${step.status === 'success' ? 'bg-green-500 text-white' : ''}
              `}>
                {step.status}
              </span>
            )}
          </div>

          {/* Step connector */}
          <StepConnector state={state} isLast={isLast} />
        </div>

        {/* Step label and description */}
        {showLabels && (
          <div className={`
            text-center transition-colors duration-200
            ${orientation === 'horizontal' ? 'mt-3 w-full' : 'ml-4 text-left min-w-32'}
            ${sizeClass.label}
            ${stateClasses.label}
          `}>
            <div className="font-medium leading-tight">{step.label}</div>
            {step.description && (
              <div className="text-gray-500 font-normal mt-1 leading-tight">
                {step.description}
              </div>
            )}
            {step.error && state === 'error' && (
              <div className="text-red-500 font-normal mt-1 text-xs leading-tight">
                {step.error}
              </div>
            )}
            {step.hint && (
              <div className="text-gray-400 font-normal mt-1 text-xs leading-tight">
                {step.hint}
              </div>
            )}
          </div>
        )}
      </div>
    );

    if (orientation === 'vertical') {
      return (
        <div className="flex items-start">
          {stepContent}
        </div>
      );
    }

    return stepContent;
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const containerClasses = `
    flex
    ${orientation === 'horizontal' 
      ? 'w-full justify-between items-start' 
      : 'flex-col h-full'
    }
    ${maxWidthClasses[maxWidth]}
    ${className}
  `;

  return (
    <div className={containerClasses}>
      {steps.map((step, index) => (
        <Step
          key={step.key || index}
          step={step}
          stepIndex={index}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
};

// Convenience components for common variants
Stepper.Default = (props) => <Stepper variant="default" {...props} />;
Stepper.Minimal = (props) => <Stepper variant="minimal" {...props} />;
Stepper.Horizontal = (props) => <Stepper orientation="horizontal" {...props} />;
Stepper.Vertical = (props) => <Stepper orientation="vertical" {...props} />;

export default Stepper;
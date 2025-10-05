import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import Dialog from '../Dialog';
import Button from '../Button';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  size = "md",
  loading = false,
  disabled = false,
  hideCancel = false,
  confirmVariant = "primary",
  className = ""
}) => {
  const getVariantConfig = () => {
    const configs = {
      default: {
        icon: HelpCircle,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50",
        buttonVariant: "primary"
      },
      danger: {
        icon: AlertTriangle,
        iconColor: "text-red-600",
        bgColor: "bg-red-50",
        buttonVariant: "danger"
      },
      warning: {
        icon: AlertTriangle,
        iconColor: "text-yellow-600",
        bgColor: "bg-yellow-50",
        buttonVariant: "warning"
      },
      success: {
        icon: CheckCircle,
        iconColor: "text-green-600",
        bgColor: "bg-green-50",
        buttonVariant: "success"
      },
      info: {
        icon: Info,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50",
        buttonVariant: "primary"
      }
    };
    
    return configs[variant] || configs.default;
  };

  const handleConfirm = () => {
    if (!loading && !disabled) {
      onConfirm();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && !disabled) {
      handleConfirm();
    }
  };

  const variantConfig = getVariantConfig();
  const IconComponent = variantConfig.icon;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      className={className}
    >
      <div className="space-y-4">
        {/* Icon and Message */}
        <div className={`flex items-start space-x-3 p-4 rounded-lg ${variantConfig.bgColor}`}>
          <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${variantConfig.iconColor}`} />
          <div className="flex-1">
            {typeof message === 'string' ? (
              <p className="text-gray-700">{message}</p>
            ) : (
              <div className="text-gray-700">{message}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          {!hideCancel && (
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="min-w-20"
            >
              {cancelText}
            </Button>
          )}
          
          <Button
            variant={confirmVariant || variantConfig.buttonVariant}
            onClick={handleConfirm}
            loading={loading}
            disabled={disabled}
            className="min-w-20"
            onKeyPress={handleKeyPress}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmDialog;
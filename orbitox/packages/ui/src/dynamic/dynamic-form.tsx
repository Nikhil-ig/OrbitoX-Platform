import React, { useState } from 'react';

// Stubbed Metadata types from plugin-engine to avoid circular dependency in UI
interface EntityField {
  key: string;
  label: string;
  type: 'string' | 'text' | 'number' | 'boolean' | 'date' | 'select' | 'relation';
  required?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  showInForm?: boolean;
}

interface EntitySchema {
  id: string;
  name: string;
  fields: EntityField[];
}

export interface DynamicFormProps {
  schema: EntitySchema;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ schema, initialData = {}, onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formFields = schema.fields.filter(f => f.showInForm !== false);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[key];
        return newErrs;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    formFields.forEach(field => {
      if (field.required && !formData[field.key]) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const renderField = (field: EntityField) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];
    const commonProps = {
      id: field.key,
      name: field.key,
      value: field.type === 'boolean' ? undefined : value,
      checked: field.type === 'boolean' ? !!value : undefined,
      required: field.required,
      className: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
    };

    let inputElement = null;

    switch (field.type) {
      case 'text':
        inputElement = (
          <textarea
            {...commonProps}
            rows={3}
            onChange={(e: any) => handleChange(field.key, e.target.value)}
          />
        );
        break;
      case 'number':
        inputElement = (
          <input
            {...commonProps}
            type="number"
            onChange={(e: any) => handleChange(field.key, Number(e.target.value))}
          />
        );
        break;
      case 'boolean':
        inputElement = (
          <input
            {...commonProps}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            onChange={(e: any) => handleChange(field.key, e.target.checked)}
          />
        );
        break;
      case 'date':
        inputElement = (
          <input
            {...commonProps}
            type="date"
            onChange={(e: any) => handleChange(field.key, e.target.value)}
          />
        );
        break;
      case 'select':
        inputElement = (
          <select
            {...commonProps}
            onChange={(e: any) => handleChange(field.key, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
        break;
      case 'string':
      default:
        inputElement = (
          <input
            {...commonProps}
            type="text"
            onChange={(e: any) => handleChange(field.key, e.target.value)}
          />
        );
        break;
    }

    return (
      <div key={field.key} className="sm:col-span-3 mb-4">
        <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <div className="mt-1 flex items-center">
          {inputElement}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
      <div className="space-y-8 divide-y divide-gray-200">
        <div className="pt-8">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">{schema.name} Form</h3>
            <p className="mt-1 text-sm text-gray-500">
              Dynamically generated from {schema.id} metadata schema.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {formFields.map(renderField)}
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
};

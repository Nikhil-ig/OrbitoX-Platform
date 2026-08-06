'use client';

import React, { useState, Suspense } from 'react';
import type { UiFormSchema, FieldMetadata } from '@orbitox/sdk';

export interface DynamicFormProps {
  schema: UiFormSchema;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ schema, initialData = {}, onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFocused, setIsFocused] = useState<string | null>(null);

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

  const renderField = (field: FieldMetadata) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];
    const commonProps = {
      id: field.key,
      name: field.key,
      value: field.type === 'boolean' ? undefined : value,
      checked: field.type === 'boolean' ? !!value : undefined,
      required: field.required,
      onFocus: () => setIsFocused(field.key),
      onBlur: () => setIsFocused(null),
      className: `mt-1 block w-full rounded-xl border-gray-200 bg-white/50 backdrop-blur-md shadow-sm transition-all duration-300 ease-in-out focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white/20 sm:text-sm ${
        error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''
      }`,
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
      <div 
        key={field.key} 
        className={`sm:col-span-3 mb-4 transition-all duration-300 ${isFocused === field.key ? 'scale-[1.02] transform' : ''}`}
      >
        <label htmlFor={field.key} className="block text-sm font-semibold text-gray-700 tracking-wide">
          {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="mt-2 flex items-center">
          {inputElement}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center animate-pulse">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <Suspense fallback={<div className="p-8 text-center animate-pulse">Loading form schema...</div>}>
      <form 
        onSubmit={handleSubmit} 
        className="space-y-8 divide-y divide-gray-200/50 p-8 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <div className="space-y-8 divide-y divide-gray-200/50">
          <div>
            <div>
              <h3 className="text-2xl font-bold leading-6 text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                {schema.entityId} Form
              </h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">
                Dynamically generated from {schema.entityId} metadata schema.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
              {formFields.map(renderField)}
            </div>
          </div>
        </div>

        <div className="pt-6">
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="ml-3 inline-flex justify-center items-center rounded-xl border border-transparent bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-300 hover:scale-105"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Record'}
            </button>
          </div>
        </div>
      </form>
    </Suspense>
  );
};

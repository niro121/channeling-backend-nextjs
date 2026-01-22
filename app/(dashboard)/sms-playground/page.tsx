'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { sendTestSms } from '@/app/actions/sms.actions';

interface FormValues {
  phoneNumber: string;
}

export default function SmsTestGround() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    mode: 'onChange',
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await sendTestSms(data.phoneNumber);
      setResult(response);
    } catch (error) {
      setResult({ error: 'Failed to send request' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">SMS Play Ground</h1>

      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="text"
              placeholder="Phone Number (07XXXXXXXX)"
              className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('phoneNumber', {
                required: 'Phone number is required',
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Must be exactly 10 digits',
                },
              })}
            />
            {errors.phoneNumber && (
              <p className="text-red-500 text-sm mt-1">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-semibold transition-colors ${
              !isValid || isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Sending...' : 'SEND NOW'}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Results Area</h2>
        <div className="bg-gray-100 p-4 rounded-md border border-gray-300 font-mono text-sm overflow-x-auto min-h-[100px]">
          {result ? (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          ) : (
            <span className="text-gray-400">
              No results yet. Send an SMS to see the response here.
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Example Success Result ::: {'{ "resultcode": "200", "response": "Message sent OK" }'}
        </p>
      </div>
    </div>
  );
}

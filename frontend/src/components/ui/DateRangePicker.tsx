import React from 'react';

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
  disabled?: boolean;
  startLabel?: string;
  endLabel?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className = "",
  disabled = false,
  startLabel = "Start Date",
  endLabel = "End Date"
}: DateRangePickerProps) {
  const handleStartDateChange = (start: string) => {
    onChange({ ...value, start });
  };

  const handleEndDateChange = (end: string) => {
    onChange({ ...value, end });
  };

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {startLabel}
        </label>
        <input
          type="date"
          value={value.start}
          onChange={(e) => handleStartDateChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {endLabel}
        </label>
        <input
          type="date"
          value={value.end}
          onChange={(e) => handleEndDateChange(e.target.value)}
          disabled={disabled}
          min={value.start} // End date cannot be before start date
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
} 
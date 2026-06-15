import React from 'react';

const UK_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Sheffield',
  'Bristol', 'Glasgow', 'Edinburgh', 'Cardiff', 'Belfast', 'Nottingham'
];

const DENOMINATIONS = [
  'Pentecostal', 'Baptist', 'Anglican', 'Methodist', 'Presbyterian',
  'Catholic', 'Orthodox', 'Evangelical', 'Charismatic', 'Reformed',
  'Non-denominational', 'Independent'
];

const FilterSidebar = ({ city, denomination, onCityChange, onDenominationChange }) => {
  return (
    <div className="w-64 bg-white rounded-lg shadow p-6 h-fit">
      <h3 className="font-semibold text-lg mb-4">Filters</h3>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
        >
          <option value="">All Cities</option>
          {UK_CITIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Denomination</label>
        <select
          value={denomination}
          onChange={(e) => onDenominationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
        >
          <option value="">All Denominations</option>
          {DENOMINATIONS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {
          onCityChange('');
          onDenominationChange('');
        }}
        className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
      >
        Clear Filters
      </button>
    </div>
  );
};

export default FilterSidebar;

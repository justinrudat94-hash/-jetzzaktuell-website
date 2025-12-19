'use client'

import { useState } from 'react'
import { ChevronDown, X, Filter } from 'lucide-react'
import { EVENT_CATEGORIES, DATE_FILTERS, PRICE_RANGES, RADIUS_OPTIONS } from '@/lib/categories'
import { EventFilters as EventFiltersType } from '@/lib/events'

interface EventFiltersProps {
  filters: EventFiltersType
  onFiltersChange: (filters: EventFiltersType) => void
  eventCount: number
}

export default function EventFilters({ filters, onFiltersChange, eventCount }: EventFiltersProps) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showPriceDropdown, setShowPriceDropdown] = useState(false)
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category })
    setShowCategoryDropdown(false)
  }

  const handleDateFilterChange = (dateFilter: any) => {
    onFiltersChange({ ...filters, dateFilter })
  }

  const handlePriceRangeChange = (priceMin: number, priceMax: number) => {
    onFiltersChange({ ...filters, priceMin, priceMax })
    setShowPriceDropdown(false)
  }

  const handleRadiusChange = (radius: number | null) => {
    onFiltersChange({ ...filters, radius })
    setShowRadiusDropdown(false)
  }

  const handleCityChange = (city: string) => {
    onFiltersChange({ ...filters, city: city || undefined })
  }

  const handleReset = () => {
    onFiltersChange({
      category: 'Alle',
      dateFilter: 'Alle',
      priceMin: 0,
      priceMax: Infinity,
      city: undefined,
      radius: null,
    })
  }

  const hasActiveFilters =
    filters.category !== 'Alle' ||
    filters.dateFilter !== 'Alle' ||
    filters.priceMin !== 0 ||
    filters.priceMax !== Infinity ||
    filters.city ||
    filters.radius !== null

  const selectedPriceRange = PRICE_RANGES.find(
    (range) => range.min === filters.priceMin && range.max === filters.priceMax
  )

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Events filtern
          </h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {eventCount} Events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Zurücksetzen
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
            </label>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <span className="text-sm truncate">
                {filters.category || 'Alle'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
            </button>

            {showCategoryDropdown && (
              <div className="absolute z-20 mt-2 w-full max-h-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto">
                <button
                  onClick={() => handleCategoryChange('Alle')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                >
                  Alle
                </button>
                {EVENT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Datum
            </label>
            <div className="flex gap-2">
              {DATE_FILTERS.map((dateFilter) => (
                <button
                  key={dateFilter}
                  onClick={() => handleDateFilterChange(dateFilter)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    filters.dateFilter === dateFilter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {dateFilter}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preis
            </label>
            <button
              onClick={() => setShowPriceDropdown(!showPriceDropdown)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <span className="text-sm truncate">
                {selectedPriceRange?.label || 'Alle Preise'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
            </button>

            {showPriceDropdown && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handlePriceRangeChange(range.min, range.max)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stadt
            </label>
            <input
              type="text"
              value={filters.city || ''}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="z.B. Berlin"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Umkreis
            </label>
            <button
              onClick={() => setShowRadiusDropdown(!showRadiusDropdown)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <span className="text-sm truncate">
                {filters.radius ? `${filters.radius} km` : 'Alle'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
            </button>

            {showRadiusDropdown && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {RADIUS_OPTIONS.map((radius) => (
                  <button
                    key={radius || 'all'}
                    onClick={() => handleRadiusChange(radius)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                  >
                    {radius ? `${radius} km` : 'Alle'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

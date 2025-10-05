import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  SearchInput,
  FilterDropdown,
  DatePicker,
  Badge,
  StatsCard,
  LoadingSpinner,
  Select
} from '../../../ui';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Building2,
  MapPin,
  Calendar,
  Compare
} from 'lucide-react';

const SalesMetrics = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    company: 'all',
    station: 'all',
    period: 'monthly',
    comparison: 'none'
  });
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  // Mock sales data - in real app, this would come from API
  const salesData = {
    // Company-wise sales
    byCompany: [
      {
        id: 'company-1',
        name: 'Prime Energy Kenya Ltd',
        todaySales: 3052450,
        weeklySales: 18765000,
        monthlySales: 58765000,
        yesterdaysSales: 2789100,
        trend: 9.4,
        stations: 24,
        marketShare: 32
      },
      {
        id: 'company-2',
        name: 'Vivo Energy Kenya',
        todaySales: 4256800,
        weeklySales: 24568000,
        monthlySales: 78452000,
        yesterdaysSales: 3894500,
        trend: 15.2,
        stations: 32,
        marketShare: 43
      },
      {
        id: 'company-3',
        name: 'Total Energies Kenya',
        todaySales: 3897500,
        weeklySales: 21897000,
        monthlySales: 65478000,
        yesterdaysSales: 3456700,
        trend: 7.8,
        stations: 28,
        marketShare: 36
      }
    ],

    // Station-wise sales
    byStation: [
      {
        id: 'station-1',
        company: 'Prime Energy Kenya Ltd',
        name: 'Nairobi CBD Station',
        todaySales: 450230,
        weeklySales: 2850000,
        monthlySales: 8450000,
        trend: 8.5,
        utilization: 85
      },
      {
        id: 'station-2',
        company: 'Prime Energy Kenya Ltd',
        name: 'Westlands Station',
        todaySales: 389450,
        weeklySales: 2450000,
        monthlySales: 7120000,
        trend: 12.1,
        utilization: 78
      },
      {
        id: 'station-3',
        company: 'Vivo Energy Kenya',
        name: 'Karen Station',
        todaySales: 525670,
        weeklySales: 3250000,
        monthlySales: 9850000,
        trend: 15.3,
        utilization: 92
      },
      {
        id: 'station-4',
        company: 'Vivo Energy Kenya',
        name: 'Mombasa Road Station',
        todaySales: 412350,
        weeklySales: 2580000,
        monthlySales: 7560000,
        trend: 6.8,
        utilization: 74
      }
    ],

    // Time-based trends
    trends: {
      hourly: [12500, 18700, 23400, 19800, 26700, 31200, 28900, 32500, 29800, 26700, 22300, 18900],
      daily: [28.5, 31.2, 29.8, 32.1, 35.4, 38.9, 42.1],
      monthly: [45.6, 48.2, 51.1, 55.3, 58.7, 62.1, 65.8, 68.9, 72.4, 75.0, 78.2, 81.5]
    }
  };

  // Filter options
  const companies = [
    { id: 'all', name: 'All Companies' },
    ...salesData.byCompany.map(c => ({ id: c.id, name: c.name }))
  ];

  const periods = [
    { id: 'today', name: 'Today' },
    { id: 'weekly', name: 'This Week' },
    { id: 'monthly', name: 'This Month' },
    { id: 'quarterly', name: 'This Quarter' },
    { id: 'yearly', name: 'This Year' }
  ];

  const comparisonOptions = [
    { id: 'none', name: 'No Comparison' },
    { id: 'previous_period', name: 'Previous Period' },
    { id: 'year_ago', name: 'Year Ago' },
    { id: 'target', name: 'Vs Target' }
  ];

  // Get sales value based on selected period
  const getSalesValue = (item, period) => {
    const periods = {
      today: item.todaySales,
      weekly: item.weeklySales,
      monthly: item.monthlySales
    };
    return periods[period] || item.monthlySales;
  };

  // Filter and process data based on current filters
  const processedData = useMemo(() => {
    let companyData = salesData.byCompany;
    let stationData = salesData.byStation;

    // Filter by company
    if (filters.company !== 'all') {
      companyData = companyData.filter(c => c.id === filters.company);
      stationData = stationData.filter(s => 
        salesData.byCompany.find(c => c.id === filters.company)?.name === s.company
      );
    }

    // If companies selected for comparison
    if (selectedCompanies.length > 0) {
      companyData = companyData.filter(c => selectedCompanies.includes(c.id));
    }

    return { companyData, stationData };
  }, [filters, selectedCompanies]);

  const renderComparisonChart = () => {
    if (selectedCompanies.length < 2) {
      return (
        <Card className="p-6">
          <div className="text-center py-12">
            <Compare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Compare Companies</h3>
            <p className="text-gray-600 mb-4">Select at least 2 companies to compare performance</p>
            <Button variant="cosmic" onClick={() => setSelectedCompanies(['company-1', 'company-2'])}>
              Compare Top Companies
            </Button>
          </div>
        </Card>
      );
    }

    const comparisonData = processedData.companyData.filter(c => selectedCompanies.includes(c.id));

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Company Comparison</h3>
            <p className="text-gray-600">Sales performance comparison</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedCompanies([])}>
            Clear Comparison
          </Button>
        </div>

        <div className="space-y-4">
          {comparisonData.map(company => {
            const salesValue = getSalesValue(company, filters.period);
            const maxSales = Math.max(...comparisonData.map(c => getSalesValue(c, filters.period)));
            const percentage = (salesValue / maxSales) * 100;

            return (
              <div key={company.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{company.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">KSH {(salesValue / 1000000).toFixed(1)}M</span>
                    <Badge variant={company.trend >= 0 ? "success" : "error"} className="flex items-center gap-1">
                      {company.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(company.trend)}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderSalesStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Total Sales"
        value={`KSH ${(
          processedData.companyData.reduce((sum, company) => sum + getSalesValue(company, filters.period), 0) / 1000000
        ).toFixed(1)}M`}
        icon={DollarSign}
        color="green"
        trend={12.5}
      />
      <StatsCard
        title="Average per Company"
        value={`KSH ${(
          processedData.companyData.reduce((sum, company) => sum + getSalesValue(company, filters.period), 0) / 
          processedData.companyData.length / 1000000
        ).toFixed(1)}M`}
        icon={Building2}
        color="blue"
      />
      <StatsCard
        title="Top Company"
        value={
          processedData.companyData.length > 0 
            ? processedData.companyData.reduce((top, company) => 
                getSalesValue(company, filters.period) > getSalesValue(top, filters.period) ? company : top
              ).name
            : 'N/A'
        }
        icon={TrendingUp}
        color="purple"
      />
      <StatsCard
        title="Active Stations"
        value={processedData.stationData.length}
        icon={MapPin}
        color="orange"
      />
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Metrics & Analytics</h1>
        <p className="text-gray-600">
          Comprehensive sales analysis across all companies and stations
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <FilterDropdown
              options={companies}
              value={filters.company}
              onFilter={(value) => setFilters(prev => ({ ...prev, company: value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period
            </label>
            <FilterDropdown
              options={periods}
              value={filters.period}
              onFilter={(value) => setFilters(prev => ({ ...prev, period: value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comparison
            </label>
            <FilterDropdown
              options={comparisonOptions}
              value={filters.comparison}
              onFilter={(value) => setFilters(prev => ({ ...prev, comparison: value }))}
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" icon={Filter} className="w-full">
              More Filters
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Compare:</span>
            <Select
              options={salesData.byCompany.map(c => ({ value: c.id, label: c.name }))}
              value={selectedCompanies}
              onChange={setSelectedCompanies}
              isMulti
              placeholder="Select companies..."
              className="min-w-64"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" icon={Download}>
              Export Report
            </Button>
            <Button variant="cosmic" icon={BarChart3}>
              Generate Insights
            </Button>
          </div>
        </div>
      </Card>

      {/* Sales Stats */}
      {renderSalesStats()}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2">
          {/* Companies Sales Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sales by Company</h3>
                <p className="text-gray-600">Performance overview across all companies</p>
              </div>
              <Button variant="outline" size="sm" icon={PieChart}>
                View Chart
              </Button>
            </div>

            <div className="overflow-hidden">
              <Table
                columns={[
                  { key: 'company', label: 'Company' },
                  { key: 'sales', label: 'Sales' },
                  { key: 'trend', label: 'Trend' },
                  { key: 'stations', label: 'Stations' },
                  { key: 'marketshare', label: 'Market Share' }
                ]}
                data={processedData.companyData.map(company => ({
                  company: (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="font-medium text-gray-900">{company.name}</div>
                    </div>
                  ),
                  sales: (
                    <div className="font-semibold text-gray-900">
                      KSH {(getSalesValue(company, filters.period) / 1000000).toFixed(1)}M
                    </div>
                  ),
                  trend: (
                    <Badge variant={company.trend >= 0 ? "success" : "error"} className="flex items-center gap-1">
                      {company.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(company.trend)}%
                    </Badge>
                  ),
                  stations: (
                    <div className="text-center text-gray-900">{company.stations}</div>
                  ),
                  marketshare: (
                    <div className="w-full">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Market Share</span>
                        <span className="font-medium">{company.marketShare}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${company.marketShare}%` }}
                        />
                      </div>
                    </div>
                  )
                }))}
              />
            </div>
          </Card>
        </div>

        <div>
          {renderComparisonChart()}
        </div>
      </div>

      {/* Stations Sales Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sales by Station</h3>
            <p className="text-gray-600">Detailed station-level performance</p>
          </div>
          <SearchInput placeholder="Search stations..." />
        </div>

        <div className="overflow-hidden">
          <Table
            columns={[
              { key: 'station', label: 'Station' },
              { key: 'company', label: 'Company' },
              { key: 'sales', label: 'Sales' },
              { key: 'trend', label: 'Trend' },
              { key: 'utilization', label: 'Utilization' }
            ]}
            data={processedData.stationData.map(station => ({
              station: (
                <div className="font-medium text-gray-900">{station.name}</div>
              ),
              company: (
                <div className="text-gray-600">{station.company}</div>
              ),
              sales: (
                <div className="font-semibold text-gray-900">
                  KSH {(getSalesValue(station, filters.period) / 1000).toFixed(0)}K
                </div>
              ),
              trend: (
                <Badge variant={station.trend >= 0 ? "success" : "error"} className="flex items-center gap-1">
                  {station.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(station.trend)}%
                </Badge>
              ),
              utilization: (
                <div className="w-24">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{station.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        station.utilization > 80 ? 'bg-green-600' :
                        station.utilization > 60 ? 'bg-blue-600' : 'bg-orange-600'
                      }`}
                      style={{ width: `${station.utilization}%` }}
                    />
                  </div>
                </div>
              )
            }))}
          />
        </div>
      </Card>
    </div>
  );
};

export default SalesMetrics;
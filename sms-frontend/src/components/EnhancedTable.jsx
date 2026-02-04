import { useState, useMemo, useEffect } from "react";
import { isValidElement, Component } from "react";
import { toLabel } from "../utils/labels";
class CellBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    try {
      if (typeof window !== "undefined") {
        window.__lastCellError = { meta: this.props.meta, error };
      }
    } catch {
      // noop
    }
  }
  render() {
    if (this.state.hasError) {
      return <span>{toLabel(this.props.value)}</span>;
    }
    return this.props.children;
  }
}
import { Eye, Edit, Trash2 } from "lucide-react";

const EnhancedTable = ({
  data = [],
  columns = [],
  title = "Data Table",
  searchable = true,
  sortable = true,
  filterable = false,
  paginated = true,
  exportable = true,
  selectable = false,
  actions = [],
  bulkActions = [],
  pageSize = 25,
  className = "",
  onRowClick,
  onSelectionChange,
  emptyMessage = "No data available",
  loading = false,
  isLoading,
  columnFilterMode = "multiField", // 'multiField' shows per-column text inputs; 'columnChecklist' shows selectable columns for global search
}) => {
  // Normalize incoming data to an array to avoid runtime errors
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filters, setFilters] = useState({}); // used only in multiField mode
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedSearchColumns, setSelectedSearchColumns] = useState(() =>
    columns.map((c) => c.key)
  );
  // Column visibility (feature currently unused) removed to simplify

  // Helper functions - moved before useMemo hooks
  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  // Search functionality
  const filteredData = useMemo(() => {
    let filtered = safeData;

    // Apply search
    if (searchTerm) {
      const activeColumns =
        columnFilterMode === "columnChecklist"
          ? selectedSearchColumns
          : columns.map((c) => c.key);
      filtered = filtered.filter((item) =>
        activeColumns.some((key) => {
          const value = getNestedValue(item, key);
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    if (columnFilterMode === "multiField") {
      // Apply per-column text filters
      Object.entries(filters).forEach(([key, filterValue]) => {
        if (filterValue) {
          filtered = filtered.filter((item) => {
            const value = getNestedValue(item, key);
            return String(value)
              .toLowerCase()
              .includes(filterValue.toLowerCase());
          });
        }
      });
    }

    return filtered;
  }, [
    safeData,
    searchTerm,
    filters,
    columns,
    columnFilterMode,
    selectedSearchColumns,
  ]);

  // Sort functionality
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, paginated]);

  // Keep current page within bounds when data size changes (e.g., deletions)
  useEffect(() => {
    if (!paginated) return;
    const maxPage = Math.max(1, totalPages);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [totalPages, currentPage, paginated]);

  // Helper functions
  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleRowSelect = (id) => {
    if (!selectable) return;

    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      onSelectionChange?.(Array.from(newSet));
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!selectable) return;

    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = paginatedData.map((item) => item.id || item);
      setSelectedRows(new Set(allIds));
      onSelectionChange?.(allIds);
    }
  };

  // (toggleColumnVisibility removed as unused)

  const exportToCSV = () => {
    const headers = columns.map((col) => col.label || col.key);

    const csvData = sortedData.map((row) =>
      columns.map((col) => {
        const value = getNestedValue(row, col.key);
        return `"${String(value || "").replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [headers, ...csvData]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${title.toLowerCase().replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({});
    setCurrentPage(1);
    setSelectedSearchColumns(columns.map((c) => c.key));
  };

  const pending = typeof isLoading !== "undefined" ? isLoading : loading;
  if (pending) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center space-x-2">
            {exportable && (
              <button
                onClick={exportToCSV}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
                title="Export to CSV"
              >
                📊
              </button>
            )}
            <div className="relative">
              <button
                className="text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
                title="Column Settings"
              >
                ⚙️
              </button>
              {/* Column visibility dropdown would go here */}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="px-6 py-4 border-b border-gray-200 space-y-4">
          {searchable && (
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {(searchTerm || Object.values(filters).some((v) => v)) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {filterable && columnFilterMode === "multiField" && (
            <div className="flex flex-wrap gap-4">
              {columns
                .filter((col) => col.filterable !== false)
                .map((col) => (
                  <div key={col.key} className="min-w-[180px]">
                    <input
                      type="text"
                      placeholder={`Filter ${col.label || col.key}...`}
                      value={filters[col.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(col.key, e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                ))}
            </div>
          )}
          {filterable && columnFilterMode === "columnChecklist" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">
                Search in columns:
              </p>
              <div className="flex flex-wrap gap-3">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedSearchColumns.includes(col.key)}
                      onChange={(e) => {
                        setSelectedSearchColumns((prev) => {
                          if (e.target.checked) return [...prev, col.key];
                          return prev.filter((k) => k !== col.key);
                        });
                      }}
                    />
                    <span>{col.label || col.key}</span>
                  </label>
                ))}
              </div>
              {selectedSearchColumns.length === 0 && (
                <div className="text-xs text-red-500">
                  Select at least one column to search.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectable && selectedRows.size > 0 && bulkActions.length > 0 && (
        <div className="px-6 py-3 bg-indigo-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {selectedRows.size} item{selectedRows.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex space-x-2">
              {bulkActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => action.onClick(Array.from(selectedRows))}
                  className={`px-3 py-1 text-sm rounded-md ${
                    action.className ||
                    "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.size === paginatedData.length &&
                      paginatedData.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    sortable && col.sortable !== false
                      ? "cursor-pointer hover:bg-gray-100"
                      : ""
                  }`}
                  onClick={() =>
                    sortable && col.sortable !== false && handleSort(col.key)
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.label || col.key}</span>
                    {sortable && col.sortable !== false && (
                      <div className="flex flex-col">
                        <span
                          className={`text-xs ${
                            sortConfig.key === col.key &&
                            sortConfig.direction === "asc"
                              ? "text-indigo-600"
                              : "text-gray-400"
                          }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-xs -mt-1 ${
                            sortConfig.key === col.key &&
                            sortConfig.direction === "desc"
                              ? "text-indigo-600"
                              : "text-gray-400"
                          }`}
                        >
                          ▼
                        </span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {(Array.isArray(actions) ? actions.length > 0 : !!actions) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (selectable ? 1 : 0) +
                    (Array.isArray(actions)
                      ? actions.length > 0
                        ? 1
                        : 0
                      : actions
                      ? 1
                      : 0)
                  }
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`hover:bg-gray-50 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(item.id || item)}
                        onChange={() => handleRowSelect(item.id || item)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => {
                    const cellValue = getNestedValue(item, col.key);
                    return (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                        <CellBoundary
                          meta={{ key: col.key, item }}
                          value={cellValue}
                        >
                          <div className="text-sm text-gray-900">
                            {(() => {
                              if (col.render) {
                                const out = col.render(cellValue, item);
                                if (
                                  typeof out === "string" ||
                                  typeof out === "number" ||
                                  isValidElement(out)
                                ) {
                                  return out;
                                }
                                return String(toLabel(out));
                              }
                              return toLabel(cellValue);
                            })()}
                          </div>
                          {col.subtext && (
                            <div className="text-sm text-gray-500">
                              {typeof col.subtext === "function"
                                ? col.subtext(item)
                                : getNestedValue(item, col.subtext)}
                            </div>
                          )}
                        </CellBoundary>
                      </td>
                    );
                  })}
                  {(Array.isArray(actions)
                    ? actions.length > 0
                    : !!actions) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {(Array.isArray(actions)
                        ? actions
                        : typeof actions === "function"
                        ? actions(item)
                        : []
                      ).map((action, actionIndex) => {
                        let icon = action.icon;
                        if (!icon) {
                          if (action.label?.toLowerCase().includes("view"))
                            icon = <Eye className="w-4 h-4" />;
                          else if (action.label?.toLowerCase().includes("edit"))
                            icon = <Edit className="w-4 h-4" />;
                          else if (
                            action.label?.toLowerCase().includes("delete")
                          )
                            icon = <Trash2 className="w-4 h-4" />;
                        }
                        if (
                          typeof action.hidden === "function" &&
                          action.hidden(item)
                        ) {
                          return null;
                        }
                        return (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(item);
                            }}
                            className={`inline-flex items-center gap-1 hover:${
                              action.hoverColor || "text-indigo-900"
                            } ${action.color || "text-indigo-600"}`}
                            title={action.label}
                            disabled={
                              typeof action.disabled === "function"
                                ? action.disabled(item)
                                : action.disabled
                            }
                          >
                            {icon}
                            <span className="sr-only">{action.label}</span>
                          </button>
                        );
                      })}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTable;

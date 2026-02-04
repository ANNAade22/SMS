# EnhancedTable Component Documentation

The `EnhancedTable` component is a powerful, feature-rich table component designed for admin interfaces with comprehensive data management capabilities.

## 🚀 Features

- ✅ **Search Functionality** - Global search across all columns
- ✅ **Column Sorting** - Click column headers to sort ascending/descending
- ✅ **Column Filtering** - Individual filters for each column
- ✅ **Pagination** - Navigate through large datasets
- ✅ **Row Selection** - Single and bulk selection with checkboxes
- ✅ **Bulk Actions** - Perform actions on multiple selected rows
- ✅ **CSV Export** - Export filtered data to CSV
- ✅ **Custom Rendering** - Custom cell rendering and formatting
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Loading States** - Built-in loading spinner
- ✅ **Empty States** - Customizable empty state messages

## 📋 Props

| Prop                | Type     | Default               | Description                      |
| ------------------- | -------- | --------------------- | -------------------------------- |
| `data`              | Array    | `[]`                  | Array of data objects to display |
| `columns`           | Array    | `[]`                  | Column configuration array       |
| `title`             | String   | `"Data Table"`        | Table title/header               |
| `searchable`        | Boolean  | `true`                | Enable global search             |
| `sortable`          | Boolean  | `true`                | Enable column sorting            |
| `filterable`        | Boolean  | `true`                | Enable column filters            |
| `paginated`         | Boolean  | `true`                | Enable pagination                |
| `exportable`        | Boolean  | `true`                | Enable CSV export                |
| `selectable`        | Boolean  | `false`               | Enable row selection             |
| `actions`           | Array    | `[]`                  | Row action buttons               |
| `bulkActions`       | Array    | `[]`                  | Bulk action buttons              |
| `pageSize`          | Number   | `10`                  | Rows per page                    |
| `onRowClick`        | Function | -                     | Row click handler                |
| `onSelectionChange` | Function | -                     | Selection change handler         |
| `emptyMessage`      | String   | `"No data available"` | Empty state message              |
| `loading`           | Boolean  | `false`               | Loading state                    |

## 🔧 Column Configuration

Each column in the `columns` array can have the following properties:

```javascript
{
  key: "name",           // Data property key
  label: "Name",         // Display label
  sortable: true,        // Enable sorting (default: true)
  filterable: true,      // Enable filtering (default: true)
  render: (value, row) => // Custom render function
    <span>{value}</span>,
  subtext: "email",      // Additional text below main value
}
```

## 📖 Usage Examples

### Basic Table

```jsx
<EnhancedTable
  title="User Management"
  data={users}
  columns={[
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
  ]}
/>
```

### Advanced Table with All Features

```jsx
<EnhancedTable
  title="Student Management"
  data={students}
  columns={[
    {
      key: "name",
      label: "Name",
      sortable: true,
      filterable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
    },
    {
      key: "gpa",
      label: "GPA",
      sortable: true,
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            value >= 4.0
              ? "bg-green-100 text-green-800"
              : value >= 3.5
              ? "bg-blue-100 text-blue-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            value === "Active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {value}
        </span>
      ),
    },
  ]}
  actions={[
    {
      label: "Edit",
      onClick: (student) => handleEdit(student),
      color: "text-indigo-600",
      hoverColor: "text-indigo-900",
    },
    {
      label: "Delete",
      onClick: (student) => handleDelete(student),
      color: "text-red-600",
      hoverColor: "text-red-900",
    },
  ]}
  selectable={true}
  bulkActions={[
    {
      label: "Delete Selected",
      onClick: (selectedIds) => handleBulkDelete(selectedIds),
      className: "bg-red-600 text-white hover:bg-red-700",
    },
  ]}
  onSelectionChange={(selected) => setSelectedStudents(selected)}
  onRowClick={(student) => navigate(`/students/${student.id}`)}
  pageSize={10}
/>
```

## 🎯 Advanced Features

### Custom Cell Rendering

```javascript
{
  key: "status",
  label: "Status",
  render: (value, row) => (
    <span className={`badge ${value === 'Active' ? 'badge-success' : 'badge-danger'}`}>
      {value}
    </span>
  ),
}
```

### Subtext Display

```javascript
{
  key: "name",
  label: "Name",
  subtext: "email", // Shows email below name
}
```

### Dynamic Subtext

```javascript
{
  key: "name",
  label: "Name",
  subtext: (row) => `${row.department} - ${row.location}`,
}
```

### Conditional Actions

```javascript
actions={[
  {
    label: "Edit",
    onClick: (item) => handleEdit(item),
    color: "text-indigo-600",
    // Only show for certain items
    show: (item) => item.status !== 'Deleted',
  },
]}
```

## 🔍 Search & Filter

- **Global Search**: Searches across all visible columns
- **Column Filters**: Individual text filters for each column
- **Real-time**: Filters apply instantly as you type
- **Clear Filters**: One-click to clear all filters

## 📊 Sorting

- **Click Headers**: Click any column header to sort
- **Visual Indicators**: ▲ ▼ show current sort direction
- **Multi-column**: Supports sorting by any column type
- **Stable Sort**: Maintains relative order for equal items

## 📄 Pagination

- **Configurable Page Size**: Set rows per page
- **Smart Navigation**: Previous/Next with page numbers
- **Info Display**: Shows current range and total
- **Responsive**: Adapts to different screen sizes

## ✅ Selection & Bulk Actions

- **Row Selection**: Checkboxes for individual rows
- **Select All**: Header checkbox selects/deselects all
- **Bulk Actions Bar**: Appears when items are selected
- **Selection Callbacks**: Get notified of selection changes

## 📈 Export Features

- **CSV Export**: Downloads filtered data as CSV
- **Automatic Naming**: Files named with current date
- **All Columns**: Exports all visible columns
- **Proper Escaping**: Handles special characters correctly

## 🎨 Styling & Theming

The component uses Tailwind CSS classes and can be customized by:

1. **Override CSS classes** using the `className` prop
2. **Modify color schemes** in the component code
3. **Custom render functions** for complete control
4. **Theme variables** for consistent branding

## 🚀 Performance

- **Memoized Computations**: Search, filter, sort operations are optimized
- **Virtual Scrolling Ready**: Can be extended for large datasets
- **Efficient Re-renders**: Only updates when necessary
- **Lazy Loading**: Supports pagination for better performance

## 🔧 Implementation Examples

### Students Management Table

```jsx
// See /src/pages/admin/Students.jsx for complete implementation
```

### Teachers Management Table

```jsx
// See /src/pages/admin/Teachers.jsx for complete implementation
```

### Classes Management Table

```jsx
// See /src/pages/admin/Classes.jsx for complete implementation
```

## 🐛 Troubleshooting

### Common Issues

1. **Data not displaying**: Check that `data` is an array of objects
2. **Columns not sorting**: Ensure column `key` matches data property
3. **Filters not working**: Verify `filterable: true` on columns
4. **Actions not showing**: Check that `actions` array is properly formatted

### Debug Tips

- Use browser dev tools to inspect component state
- Check console for error messages
- Verify data structure matches column configuration
- Test with smaller datasets first

## 📝 Migration Guide

### From Basic HTML Table

1. Import EnhancedTable component
2. Convert table data to array of objects
3. Define columns configuration
4. Replace table JSX with EnhancedTable

### From Other Table Libraries

1. Map existing column definitions to EnhancedTable format
2. Convert event handlers to match new API
3. Update styling to match your design system
4. Test all features thoroughly

## 🔮 Future Enhancements

- Column resizing
- Column reordering
- Advanced filtering (date ranges, dropdowns)
- Inline editing
- Row expansion
- Column grouping
- Print functionality
- PDF export

---

This EnhancedTable component provides a solid foundation for all your admin interface table needs with room for future enhancements!

# 🚀 EnhancedTable Integration Guide

## Quick Start

### 1. Import the Component

```javascript
import EnhancedTable from "../components/EnhancedTable";
```

### 2. Prepare Your Data

```javascript
const myData = [
  { id: 1, name: "Item 1", status: "Active" },
  { id: 2, name: "Item 2", status: "Inactive" },
];
```

### 3. Define Columns

```javascript
const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "status", label: "Status", sortable: true },
];
```

### 4. Add to Your Component

```javascript
<EnhancedTable title="My Data Table" data={myData} columns={columns} />
```

## 📋 Step-by-Step Integration

### For New Pages:

1. Create a new file in `src/pages/admin/`
2. Import EnhancedTable
3. Define your data structure
4. Configure columns
5. Add action handlers
6. Export the component

### For Existing Pages:

1. Import EnhancedTable at the top
2. Replace existing table JSX with EnhancedTable
3. Map your existing data to the new format
4. Configure columns based on your current table
5. Add any missing features (search, filters, etc.)

## 🎯 Common Patterns

### Basic Table (Read-only)

```jsx
<EnhancedTable title="User List" data={users} columns={userColumns} />
```

### Editable Table with Actions

```jsx
<EnhancedTable
  title="Product Management"
  data={products}
  columns={productColumns}
  actions={[
    { label: "Edit", onClick: handleEdit },
    { label: "Delete", onClick: handleDelete },
  ]}
/>
```

### Table with Selection & Bulk Actions

```jsx
<EnhancedTable
  title="Order Management"
  data={orders}
  columns={orderColumns}
  selectable={true}
  bulkActions={[{ label: "Process Selected", onClick: handleBulkProcess }]}
  onSelectionChange={setSelectedOrders}
/>
```

### Advanced Table with Custom Rendering

```jsx
<EnhancedTable
  title="Employee Directory"
  data={employees}
  columns={[
    {
      key: "name",
      label: "Name",
      subtext: "department", // Shows department below name
    },
    {
      key: "salary",
      label: "Salary",
      render: (value) => `$${value.toLocaleString()}`,
    },
  ]}
  onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
/>
```

## 🔧 Configuration Examples

### Date Column

```javascript
{
  key: 'createdAt',
  label: 'Created',
  sortable: true,
  render: (value) => new Date(value).toLocaleDateString(),
}
```

### Status Badge

```javascript
{
  key: 'status',
  label: 'Status',
  render: (value) => (
    <span className={`badge ${value === 'Active' ? 'badge-success' : 'badge-danger'}`}>
      {value}
    </span>
  ),
}
```

### Action Column

```javascript
{
  key: 'actions',
  label: 'Actions',
  render: (value, row) => (
    <div className="flex space-x-2">
      <button onClick={() => handleEdit(row)}>Edit</button>
      <button onClick={() => handleDelete(row)}>Delete</button>
    </div>
  ),
}
```

## 📁 File Structure

```
src/
├── components/
│   ├── EnhancedTable.jsx          # Main table component
│   └── ExampleTablePage.jsx       # Usage example
├── pages/
│   └── admin/
│       ├── Students.jsx           # Student management
│       ├── Teachers.jsx           # Teacher management
│       └── Classes.jsx            # Class management
└── docs/
    └── ENHANCED_TABLE_README.md   # Full documentation
```

## 🚀 Next Steps

1. **Test the Component**: Use the ExampleTablePage to test features
2. **Customize Styling**: Modify colors and spacing in EnhancedTable.jsx
3. **Add Features**: Extend with new functionality as needed
4. **Integrate API**: Connect to your backend data sources
5. **Add Tests**: Write unit tests for your table implementations

## 💡 Pro Tips

- Start with basic features and add advanced ones gradually
- Use the example page as a template for new implementations
- Test with small datasets first, then scale up
- Customize the styling to match your app's design system
- Use TypeScript for better development experience (optional)

## 🆘 Need Help?

- Check the full documentation in `ENHANCED_TABLE_README.md`
- Look at existing implementations (Students.jsx, Teachers.jsx)
- Use the ExampleTablePage as a starting point
- Test features incrementally

Happy coding! 🎉

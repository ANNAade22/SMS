# UserCard Component Documentation

The `UserCard` component is a flexible, reusable card component designed for displaying statistics, metrics, and information consistently across your SMS application.

## Features

- **Multiple Variants**: Default, Stats, Compact, and Gradient styles
- **Customizable Colors**: Support for different color schemes and themes
- **Interactive**: Optional click handlers for navigation
- **Flexible Content**: Support for icons, values, titles, and subtitles
- **Responsive Design**: Works well on all screen sizes

## Props

| Prop            | Type          | Default         | Description                                             |
| --------------- | ------------- | --------------- | ------------------------------------------------------- |
| `title`         | string        | -               | Main title/label of the card                            |
| `value`         | string/number | -               | Primary value to display                                |
| `subtitle`      | string        | -               | Additional descriptive text                             |
| `icon`          | string        | -               | Icon (emoji like "👨‍🎓" or SVG path like "/students.svg") |
| `color`         | string        | "bg-blue-500"   | Background color for icon container                     |
| `bgColor`       | string        | "bg-white"      | Background color of the card                            |
| `textColor`     | string        | "text-gray-900" | Color for the value text                                |
| `subtitleColor` | string        | "text-gray-500" | Color for title/subtitle text                           |
| `showYear`      | boolean       | true            | Whether to show the year badge                          |
| `year`          | string        | "2024/25"       | Year text to display                                    |
| `customIcon`    | string        | -               | Path to custom icon image                               |
| `onClick`       | function      | -               | Click handler function                                  |
| `className`     | string        | -               | Additional CSS classes                                  |
| `variant`       | string        | "default"       | Card style variant                                      |

## Variants

### 1. Default Variant

```jsx
<UserCard
  title="Students"
  value="1,234"
  year="2024/25"
  customIcon="/more.png"
/>
```

- Original alternating background colors (lamaPurple/lamaYellow)
- Year badge in top-right corner
- Custom icon support

### 2. Stats Variant

```jsx
<UserCard
  title="Total Students"
  value="1,234"
  icon="👨‍🎓"
  color="bg-blue-500"
  variant="stats"
  showYear={false}
/>
```

### SVG Icons

You can also use SVG files from your public folder:

```jsx
<UserCard
  title="Total Students"
  value="1,234"
  icon="/students.svg"
  color="bg-blue-500"
  variant="stats"
  showYear={false}
/>
```

**Available SVG Icons:**

- `/students.svg` - Students icon
- `/teachers.svg` - Teachers icon
- `/classes.svg` - Classes icon
- `/assignments.svg` - Assignments icon

- White background with shadow
- Icon with colored background circle
- Perfect for dashboard statistics

### 3. Compact Variant

```jsx
<UserCard
  title="Classes"
  value="45"
  icon="🏫"
  color="bg-purple-500"
  variant="compact"
  showYear={false}
/>
```

- Smaller size, ideal for grids
- Border styling
- Compact icon and text layout

### 4. Gradient Variant

```jsx
<UserCard
  title="Present Today"
  value="1,180"
  bgColor="bg-green-50"
  textColor="text-green-600"
  subtitleColor="text-green-800"
  variant="gradient"
  showYear={false}
/>
```

- Gradient background
- Larger text for emphasis
- Great for key metrics

## Usage Examples

### Dashboard Statistics

```jsx
const stats = [
  { title: "Students", value: "1234", icon: "👨‍🎓", color: "bg-blue-500" },
  { title: "Teachers", value: "89", icon: "👨‍🏫", color: "bg-green-500" },
  // ... more stats
];

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {stats.map((stat, index) => (
    <UserCard
      key={index}
      title={stat.title}
      value={stat.value}
      icon={stat.icon}
      color={stat.color}
      variant="stats"
      showYear={false}
    />
  ))}
</div>;
```

### Attendance Overview

```jsx
<UserCard
  title="Present Today"
  value={totalStats.present}
  bgColor="bg-green-50"
  textColor="text-green-600"
  subtitleColor="text-green-800"
  variant="gradient"
  showYear={false}
/>
```

### Interactive Navigation Cards

```jsx
<UserCard
  title="View Students"
  value="1,234"
  icon="👨‍🎓"
  color="bg-blue-500"
  variant="stats"
  showYear={false}
  onClick={() => navigate("/students")}
  className="cursor-pointer hover:shadow-lg"
/>
```

## Implementation in Your App

The UserCard component has been implemented in:

1. **Admin Dashboard** (`/src/pages/admin/Dashboard.jsx`)

   - Statistics cards using "stats" variant

2. **Admin Attendance** (`/src/pages/admin/Attendance.jsx`)

   - Statistics overview using "gradient" variant

3. **Teacher Dashboard** (`/src/pages/teacher/Dashboard.jsx`)
   - Teacher-specific statistics using "stats" variant

## Best Practices

1. **Consistent Variants**: Use the same variant within a section for visual consistency
2. **Color Coding**: Use meaningful colors (green for positive, red for negative, etc.)
3. **Responsive Grids**: Use appropriate grid classes for different screen sizes
4. **Accessibility**: Ensure sufficient color contrast for text readability
5. **Performance**: Use `showYear={false}` when year badges aren't needed

## Customization

You can easily extend the UserCard component by:

1. Adding new variants in the `getVariantStyles()` function
2. Creating custom color schemes
3. Adding new props for additional functionality
4. Modifying the existing variants to match your design system

## Migration Guide

To migrate existing card implementations:

1. Import the UserCard component
2. Replace existing card JSX with UserCard
3. Choose appropriate variant and props
4. Test responsiveness and styling

Example migration:

```jsx
// Before
<div className="bg-white rounded-lg shadow-sm p-6">
  <div className="flex items-center">
    <div className="p-3 rounded-full bg-blue-500">
      <span className="text-white text-xl">👨‍🎓</span>
    </div>
    <div className="ml-4">
      <p className="text-sm text-gray-600">Total Students</p>
      <p className="text-2xl font-bold text-gray-900">1,234</p>
    </div>
  </div>
</div>

// After
<UserCard
  title="Total Students"
  value="1,234"
  icon="👨‍🎓"
  color="bg-blue-500"
  variant="stats"
  showYear={false}
/>
```

This UserCard component provides a consistent, maintainable way to display information across your entire SMS application!

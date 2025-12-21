# Colect Forge UI Style Guide

A comprehensive guide to the UI patterns, styling conventions, and component architecture used in Colect Forge. Use this guide to maintain visual consistency when building new features or projects.

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Spacing System](#spacing-system)
4. [Component Patterns](#component-patterns)
5. [Layout Patterns](#layout-patterns)
6. [Icons](#icons)
7. [Responsive Design](#responsive-design)
8. [Quick Reference](#quick-reference)

---

## Color Palette

### Primary Brand Color

```
Primary:        #ef556d (coral red)
Tailwind:       bg-primary, text-primary
```

Use for: Primary buttons, active navigation, brand accents, focus rings.

### Semantic Colors

| Purpose | Background | Text | Hover |
|---------|------------|------|-------|
| **Success** | `bg-green-50` | `text-green-600` | `hover:bg-green-100` |
| **Danger** | `bg-red-50` / `bg-red-600` | `text-red-600` / `text-white` | `hover:bg-red-700` |
| **Info** | `bg-blue-50` | `text-blue-600` | `hover:bg-blue-100` |
| **Warning** | `bg-yellow-50` | `text-yellow-600` | `hover:bg-yellow-100` |
| **Secondary** | `bg-purple-50` | `text-purple-600` | `hover:bg-purple-100` |

### Text Color Hierarchy

```
Headings:       text-gray-900    (#111827)
Body:           text-gray-700    (#374151)
Secondary:      text-gray-600    (#4B5563)
Tertiary:       text-gray-500    (#6B7280)
Disabled:       text-gray-400    (#9CA3AF)
Placeholder:    text-gray-400    (#9CA3AF)
```

### Background Colors

```
Page:           bg-gray-50       (#F9FAFB)
Card:           bg-white         (#FFFFFF)
Hover:          bg-gray-100      (#F3F4F6)
Input Error:    bg-red-50        (#FEF2F2)
```

### Border Colors

```
Default:        border-gray-200  (#E5E7EB)
Focus:          border-primary   (#ef556d)
Error:          border-red-300   (#FCA5A5)
```

---

## Typography

### Font Stack

```css
font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
```

No custom fonts are loaded. System fonts ensure fast loading and native feel.

### Heading Hierarchy

| Level | Classes | Usage |
|-------|---------|-------|
| H1 | `text-2xl font-bold text-gray-900` | Page titles, hero text |
| H2 | `text-xl font-semibold text-gray-900` | Section titles |
| H3 | `text-lg font-semibold text-gray-900` | Card titles, subsections |
| H4 | `text-base font-medium text-gray-900` | List item titles |

### Body Text

| Type | Classes | Usage |
|------|---------|-------|
| Body | `text-base text-gray-700` | Main content |
| Secondary | `text-sm text-gray-600` | Descriptions, help text |
| Small | `text-xs text-gray-500` | Labels, metadata, timestamps |

### Font Weights

```
font-bold:      700  - Page headings
font-semibold:  600  - Section headings, emphasis
font-medium:    500  - Buttons, labels
font-normal:    400  - Body text
```

---

## Spacing System

We use Tailwind's default 8px-based spacing scale consistently.

### Padding Conventions

| Context | Classes | Pixels |
|---------|---------|--------|
| Modal/Section | `p-6` | 24px |
| Card | `p-4` | 16px |
| Button | `px-4 py-2` | 16px / 8px |
| Input | `px-3 py-2` | 12px / 8px |
| Small button | `px-3 py-1.5` | 12px / 6px |

### Margin Conventions

| Context | Classes | Pixels |
|---------|---------|--------|
| Between sections | `mb-6` or `mb-8` | 24px / 32px |
| Between elements | `mb-4` | 16px |
| Small gap | `mb-2` | 8px |
| Tight gap | `mb-1` | 4px |

### Gap Conventions (Flexbox/Grid)

| Context | Classes | Pixels |
|---------|---------|--------|
| Icon + text | `gap-2` | 8px |
| List items | `gap-3` | 12px |
| Cards/sections | `gap-4` | 16px |
| Major sections | `gap-8` | 32px |

### Vertical Spacing Pattern

```tsx
// For lists of items
<div className="space-y-4">
  {items.map(item => <Item key={item.id} />)}
</div>
```

---

## Component Patterns

### Buttons

#### Primary Button
```tsx
<button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors font-medium">
  Save Changes
</button>
```

#### Secondary Button
```tsx
<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium">
  Cancel
</button>
```

#### Danger Button
```tsx
<button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium">
  Delete
</button>
```

#### Ghost Button
```tsx
<button className="px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors font-medium">
  Learn More
</button>
```

#### Icon Button
```tsx
<button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
  <Edit className="w-4 h-4" />
</button>
```

#### Icon Button (Danger)
```tsx
<button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
  <Trash2 className="w-4 h-4" />
</button>
```

#### Full-Width Button
```tsx
<button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
  Get Started →
</button>
```

### Cards

#### Basic Card
```tsx
<div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
  {/* Content */}
</div>
```

#### Clickable Card
```tsx
<div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer">
  {/* Content */}
</div>
```

#### Feature Card (Landing Page)
```tsx
<div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-8 border border-gray-200">
  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
    <Icon className="w-6 h-6 text-primary" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>
  <p className="text-gray-600">Description</p>
</div>
```

### Form Inputs

#### Text Input
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
  placeholder="Enter value..."
/>
```

#### Input with Label
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Field Name
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
  />
</div>
```

#### Input with Error
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Email
  </label>
  <input
    type="email"
    className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
  />
  <p className="text-sm text-red-600 mt-1">Please enter a valid email</p>
</div>
```

#### Textarea
```tsx
<textarea
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
  rows={4}
/>
```

#### Select
```tsx
<select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white">
  <option value="">Select an option</option>
  <option value="1">Option 1</option>
</select>
```

### Modals

#### Modal Structure
```tsx
{/* Overlay */}
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  {/* Container */}
  <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900">Modal Title</h2>
      <button className="text-gray-400 hover:text-gray-600">
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Content */}
    <div className="p-6">
      {/* Form or content */}
    </div>

    {/* Footer */}
    <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
        Cancel
      </button>
      <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
        Confirm
      </button>
    </div>
  </div>
</div>
```

#### Modal Widths
```
Small:    max-w-sm   (384px)
Default:  max-w-md   (448px)
Large:    max-w-lg   (512px)
XLarge:   max-w-xl   (576px)
2XLarge:  max-w-2xl  (672px)
```

### Navigation

#### Nav Link (Active)
```tsx
<a className="px-4 py-2 rounded-md font-medium bg-primary text-white">
  Dashboard
</a>
```

#### Nav Link (Inactive)
```tsx
<a className="px-4 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition-colors">
  Settings
</a>
```

#### Sidebar Link
```tsx
<button className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
  isActive
    ? 'bg-primary/10 text-primary font-medium'
    : 'text-gray-600 hover:bg-gray-100'
}`}>
  <Icon className="w-5 h-5" />
  <span>Link Text</span>
</button>
```

### Loading States

#### Spinner
```tsx
<div className="animate-spin h-8 w-8 text-primary mx-auto">
  <Loader2 className="w-full h-full" />
</div>
```

#### Loading Banner
```tsx
<div className="bg-primary text-white px-6 py-3 flex items-center gap-3 shadow-md">
  <Loader2 className="w-5 h-5 animate-spin" />
  <span>Loading...</span>
</div>
```

#### Skeleton
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### Empty States

```tsx
<div className="text-center py-12">
  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <FolderOpen className="w-8 h-8 text-gray-400" />
  </div>
  <h3 className="text-lg font-medium text-gray-900 mb-1">No items yet</h3>
  <p className="text-gray-500 mb-4">Get started by creating your first item.</p>
  <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
    Create Item
  </button>
</div>
```

### Badges & Labels

#### Status Badge
```tsx
// Active/Success
<span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
  Active
</span>

// Warning
<span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
  Pending
</span>

// Error/Danger
<span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
  Failed
</span>

// Neutral
<span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
  Draft
</span>
```

---

## Layout Patterns

### Page Structure

```tsx
<div className="min-h-screen bg-gray-50 flex flex-col">
  {/* Header */}
  <header className="bg-white border-b border-gray-200 px-6 py-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      {/* Logo + Navigation */}
    </div>
  </header>

  {/* Main Content */}
  <div className="flex-1 flex">
    {/* Optional Sidebar */}
    <aside className="w-60 bg-white border-r border-gray-200 flex-shrink-0">
      {/* Sidebar content */}
    </aside>

    {/* Main */}
    <main className="flex-1 overflow-auto p-6">
      {/* Page content */}
    </main>
  </div>
</div>
```

### Section Header with Actions

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-xl font-semibold text-gray-900">Section Title</h2>
    <p className="text-sm text-gray-600 mt-1">
      {count} item{count !== 1 ? 's' : ''}
    </p>
  </div>
  <div className="flex gap-2">
    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
      Secondary Action
    </button>
    <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
      Primary Action
    </button>
  </div>
</div>
```

### Content Max Width

```tsx
// For centered content
<div className="max-w-7xl mx-auto">
  {/* Content */}
</div>

// Widths available
max-w-md:   448px
max-w-lg:   512px
max-w-xl:   576px
max-w-2xl:  672px
max-w-4xl:  896px
max-w-6xl:  1152px
max-w-7xl:  1280px
```

### Sidebar Layout

```tsx
<aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
  {/* Sidebar header */}
  <div className="p-4 border-b border-gray-200">
    <h2 className="font-semibold text-gray-900">Navigation</h2>
  </div>

  {/* Navigation links */}
  <nav className="flex-1 p-4 space-y-1">
    {links.map(link => (
      <SidebarLink key={link.id} {...link} />
    ))}
  </nav>

  {/* Sidebar footer */}
  <div className="p-4 border-t border-gray-200">
    {/* Footer content */}
  </div>
</aside>
```

---

## Icons

We use **Lucide React** for icons.

```tsx
import { Plus, Edit, Trash2, X, Check, ChevronRight, Loader2 } from 'lucide-react';
```

### Icon Sizes

| Size | Classes | Usage |
|------|---------|-------|
| Small | `w-4 h-4` | Inline with text, buttons |
| Medium | `w-5 h-5` | Navigation, standalone |
| Large | `w-6 h-6` | Feature cards, headers |
| XLarge | `w-8 h-8` | Empty states, loading |

### Icon with Background

```tsx
// Colored background circle
<div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
  <Icon className="w-5 h-5 text-blue-600" />
</div>

// Primary color background
<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
  <Icon className="w-6 h-6 text-primary" />
</div>
```

---

## Responsive Design

### Breakpoints

```
sm:   640px
md:   768px
lg:   1024px
xl:   1280px
2xl:  1536px
```

### Common Patterns

```tsx
// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">

// 1 column on mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Hide on mobile
<div className="hidden md:block">

// Show only on mobile
<div className="md:hidden">
```

---

## Quick Reference

### Class Combinations Cheat Sheet

```tsx
// Primary Button
"px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors font-medium"

// Secondary Button
"px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"

// Card
"bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"

// Input
"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"

// Modal Overlay
"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"

// Modal Container
"bg-white rounded-lg shadow-xl max-w-md w-full mx-4"

// Section Header
"flex items-center justify-between mb-6"

// Icon Button
"p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"

// Badge
"px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
```

### Required Dependencies

```json
{
  "dependencies": {
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## File Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   └── layout/          # Layout components
│       ├── PageLayout.tsx
│       └── SectionHeader.tsx
├── lib/
│   └── utils.ts         # cn() utility
└── index.css            # Global styles + Tailwind
```

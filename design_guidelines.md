# CBT Software Design Guidelines

## Design Approach

**Selected Approach:** Design System - Material Design with educational context adaptations

**Rationale:** This is a utility-focused, information-dense application where clarity, efficiency, and reliability are paramount. Students need distraction-free exam experiences, while administrators require efficient data management interfaces.

**Key Principles:**
- Clarity over decoration - zero visual distractions during exams
- Functional hierarchy - critical information always visible
- Predictable interactions - students should never be confused
- Accessibility-first - readable for all age groups and abilities

---

## Typography System

**Font Stack:** Inter (primary), system fonts fallback
- **Exam Questions:** text-xl to text-2xl, font-medium, leading-relaxed for optimal readability
- **Answer Options:** text-lg, font-normal, generous line-height
- **UI Labels:** text-sm, font-medium, uppercase tracking for section headers
- **Timer/Critical Info:** text-base, font-semibold, tabular numbers
- **Admin Dashboards:** text-base for content, text-sm for metadata

**Hierarchy Rule:** Student interfaces use 20% larger text than typical web apps for extended reading comfort.

---

## Layout & Spacing System

**Tailwind Units:** Standardize on **4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: space-y-8 to space-y-12
- Card gaps: gap-6
- Form fields: mb-6

**Container Strategy:**
- Admin dashboards: max-w-7xl with sidebar navigation
- Exam interface: max-w-4xl centered, zero sidebars
- Results view: max-w-6xl for data tables

---

## Core Component Library

### Student Exam Interface Components

**Exam Header (Sticky):**
- Full-width bar with exam title, timer, question counter (Question 5 of 50)
- Timer positioned top-right with clear numerical display
- Minimal height (h-16) to maximize question space

**Question Display Card:**
- Contained card with generous padding (p-8)
- Question text with ample whitespace above/below
- Clear numbering system
- Support for images/diagrams with proper sizing

**Answer Option Components:**
- Radio buttons for multiple choice - large clickable areas (min-h-14)
- Checkbox groups for multiple answers
- Text input fields for short answers (w-full, p-4)
- Each option as full-width button-like card with hover states

**Navigation Panel:**
- Bottom-fixed or side panel showing all question numbers as grid
- Visual indicators: answered (filled), unanswered (outline), flagged (marked), current (highlighted)
- Grid layout: grid-cols-10 for 50 questions, grid-cols-8 for smaller sets

**Progress Indicator:**
- Subtle progress bar showing completion percentage
- Placed below header or above footer

### Admin Dashboard Components

**Sidebar Navigation:**
- Fixed left sidebar (w-64) with icon + label menu items
- Sections: Dashboard, Exams, Questions, Students, Results, Settings
- Active state indicators

**Data Tables:**
- Clean tables with alternating row treatments
- Sortable columns with clear indicators
- Action buttons (Edit, Delete, View) aligned right
- Pagination controls at bottom

**Exam Builder:**
- Multi-step form layout with progress indicator at top
- Question type selector with visual cards
- Rich text editor for question content
- Drag-and-drop question reordering

**Analytics Dashboard:**
- Card-based metrics (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Charts using libraries like Chart.js or Recharts
- Filter controls in top bar

### Form Components

**Input Fields:**
- Clear labels above inputs (text-sm font-medium mb-2)
- Input height: h-12 with p-4
- Error states with red border and error text below
- Helper text in muted treatment

**Buttons:**
- Primary actions: h-12 px-8, font-medium
- Secondary actions: outline variant
- Destructive actions: distinct treatment for delete/cancel
- Loading states with spinner

**Modal Dialogs:**
- Centered overlays with backdrop blur
- Max width constraints (max-w-2xl)
- Clear header, body, footer structure
- Close button top-right

---

## Specialized Layouts

### Login/Authentication
- Centered card (max-w-md) on full-height page
- Institution logo at top
- Role selection (Student/Admin/Teacher)
- Clean form with minimal fields

### Student Exam View
- Fullscreen, distraction-free mode
- Header: 64px height, sticky
- Main content: centered max-w-4xl
- Footer navigation: 80px height, sticky
- NO sidebars during active exam

### Results Display
- Two-column layout: Summary cards (left) + Question review (right)
- Expandable question review showing correct vs student answers
- Score visualization at top (circular progress or gauge)
- Detailed breakdown table below

### Question Bank Management
- Three-panel layout: Filters (left 256px) | List (center) | Preview (right)
- Collapsible filter panel on mobile
- Search bar prominent at top

---

## Accessibility Standards

- All interactive elements min 44x44px touch targets
- Form inputs with explicit labels and ARIA attributes
- Keyboard navigation throughout - tab order logical
- Focus indicators visible and high-contrast
- Screen reader text for icons and status indicators
- Skip links for exam interface
- Timer should not cause anxiety - clear visual, optional audio alerts

---

## Images

**Admin Dashboard Header:** Optional illustration showing students at computers (decorative, 400x300px, top-right of dashboard welcome section)

**Login Page:** Institution can upload custom logo (max 200px width, centered above login form)

**Empty States:** Simple illustrations for empty question banks, no exams created, etc. (Use undraw.co style placeholders)

**No hero images** - This is a utility application focused on functionality.
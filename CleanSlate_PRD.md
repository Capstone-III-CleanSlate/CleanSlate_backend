# Product Requirements Document

## Project Name

**CleanSlate**

**Tagline:** An AI-powered Chrome extension that helps users safely clean and organize their inbox.

## Problem Statement

Most people receive hundreds of emails every week, including newsletters, promotions, automated notifications, and other messages they never read. Over time, these emails pile up and make it harder to find important messages.

Although Gmail already filters obvious spam, it doesn't know which legitimate emails are no longer useful to a specific user. Cleaning an inbox manually can take a lot of time because users have to decide which emails are worth keeping.

Our goal is to build an AI-powered inbox cleanup assistant that helps users organize old unread emails while keeping them in control of every action.

## Target User

Our primary users are:

- College students
- Working professionals
- Job seekers
- Anyone with a cluttered Gmail inbox

For our MVP, the application will support Gmail only.

## Solution

CleanSlate is a Chrome extension built with React and an Express backend.

The application works in two stages.

### Stage 1 – Rule-Based Filtering

Our own filtering logic scans the inbox and finds possible cleanup candidates.

By default, it looks for emails that are:

- Unread
- Older than 15 days
- Not starred
- Not marked as important
- Not from a protected sender

Only these emails continue to the next step.

### Stage 2 – AI Analysis

AI analyzes only the emails selected during Stage 1.

For each email, it returns:

- Category
- Recommended action
- Confidence score
- Short explanation

Possible categories include:

- Important
- Promotional
- Newsletter
- Automated notification
- Low priority
- Needs review

The user reviews every recommendation before any action is taken.

## Core Features

Our team plans to complete the following features:

- Chrome extension interface
- Gmail login using Google OAuth
- Rule-based email filtering
- AI email classification
- Confidence score and explanation
- Protected sender list
- Bulk actions
- Archive selected emails
- Cleanup summary after each scan

## How AI Is Used

AI is responsible for understanding the content of emails that pass our first filter.

It will:

- Identify promotional and newsletter emails
- Detect emails that may require action
- Recommend whether an email should be kept, archived, or reviewed
- Explain its recommendation
- Provide a confidence score

The AI will not automatically delete emails or make final decisions for the user.

## Stretch Goals

If we finish early, we'd like to add:

- Outlook support
- Yahoo Mail support
- Scheduled automatic scans
- Personalized recommendations based on user feedback
- Inbox analytics
- Multiple connected email accounts

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Chrome Extension API

### Backend

- Node.js
- Express.js

### Database

- PostgreSQL
- Sequelize

The database will store user preferences, protected senders, cleanup history, and AI recommendations.

### APIs & Services

- Gmail API
- Google OAuth
- OpenAI API (or another LLM API)

### Other Tools

- Git
- GitHub
- Postman
- Visual Studio Code

## Team Roles

### Member 1 – Frontend

- React interface
- Chrome extension UI
- Dashboard
- Settings page

### Member 2 – Backend

- Express server
- Gmail API integration
- Google OAuth
- Email retrieval
- Archive endpoints

### Member 3 – AI

- AI integration
- Prompt engineering
- Email classification
- Confidence scoring
- Recommendation system

### Member 4 – Database & Integration

- PostgreSQL
- Sequelize
- Protected sender management
- Cleanup history
- Frontend/backend integration
- Testing

## Three-Week Timeline

### Week 1

- Finalize project structure
- Set up frontend and backend
- Configure PostgreSQL
- Implement Google OAuth
- Connect to Gmail API
- Build the Chrome extension layout

### Week 2

- Implement rule-based filtering
- Connect AI
- Display AI recommendations
- Build review interface
- Add protected sender functionality

### Week 3

- Add archive and bulk actions
- Polish the UI
- Fix bugs
- Test the application
- Prepare the final demo

## Demo Pitch

### The Problem

People spend too much time cleaning cluttered inboxes because it's difficult to know which old unread emails are still important.

### Our Solution

CleanSlate combines rule-based filtering with AI to recommend which emails users should keep, archive, or review, while always leaving the final decision to the user.

### Technical Highlight

Our project combines a React Chrome extension, Express backend, PostgreSQL database, Google OAuth, Gmail API integration, and AI-powered email classification into one complete application.

## Success Criteria

Our MVP will be successful if a user can:

- Connect a Gmail account
- Scan old unread emails
- Receive AI recommendations
- Review explanations
- Archive selected emails
- Protect important senders
- View a cleanup summary

# Retail POS

A modular web point-of-sale system for small retail businesses. The repository contains a React frontend and a TypeScript/Express API in an npm workspace.

## Structure

- `apps/web` - React POS interface
- `apps/api` - REST API, database migrations, and server tests
- `apps/api/migrations` - PostgreSQL migrations
- `plan.md` - implementation roadmap

## Core data model

The database includes categories, suppliers, products, product variants, inventory balances, inventory movements, purchase receipts, sales, sale items, payments, and refunds. Customer profiles and loyalty fields are not included in the MVP model.

Product and sale monetary values are stored in `bigint` columns representing integer minor units, such as cents. Currency codes use three-letter ISO-style values.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 17, or Docker with Docker Compose

## Setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

3. Install dependencies:

   ```powershell
   npm.cmd install
   ```

4. Apply migrations:

   ```powershell
   npm.cmd run db:migrate
   ```

5. Start the web app and API:

   ```powershell
   npm.cmd run dev
   ```

- Web: http://localhost:5173
- API health: http://localhost:3001/api/health

## Commands

- `npm.cmd run dev` - start web and API in watch mode
- `npm.cmd run build` - build both applications
- `npm.cmd run test` - run both test suites
- `npm.cmd run lint` - lint both applications
- `npm.cmd run format` - format source and configuration files
- `npm.cmd run format:check` - verify formatting
- `npm.cmd run db:migrate` - apply pending PostgreSQL migrations

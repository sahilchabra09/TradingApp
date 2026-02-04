/**
 * Schema Index - Export all database schemas
 * FSC Mauritius Compliant Trading Platform Database Schema
 */

// Helper utilities - Must be first
export * from './helpers';

// Base tables without relations - Export these first
export * from './users';
export * from './assets';

// Tables with one-way relations
export * from './wallets';
export * from './holdings';
export * from './trades';
export * from './kyc-sessions'; // Didit KYC verification (minimal)
export * from './audit';
export * from './sessions';
export * from './alerts';
export * from './compliance';
export * from './payments';

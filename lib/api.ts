import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';

// Helper: create a configured axios instance on demand
function getClient(): AxiosInstance {
    const { url, token } = useAuthStore.getState();
    return axios.create({
        baseURL: url ? `${url}/api/v1` : '',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        timeout: 15000,
    });
}

// ─── About ───────────────────────────────────────────────
export const aboutApi = {
    get: () => getClient().get('/about'),
    user: () => getClient().get('/about/user'),
};

// ─── Accounts ────────────────────────────────────────────
export type AccountType = 'asset' | 'expense' | 'revenue' | 'cash' | 'liability' | 'initial-balance';
export const accountsApi = {
    list: (type?: AccountType, page = 1) =>
        getClient().get('/accounts', { params: { type, page } }),
    get: (id: string) => getClient().get(`/accounts/${id}`),
    create: (data: any) => getClient().post('/accounts', data),
    update: (id: string, data: any) => getClient().put(`/accounts/${id}`, data),
    delete: (id: string) => getClient().delete(`/accounts/${id}`),
    transactions: (id: string, page = 1, start?: string, end?: string) =>
        getClient().get(`/accounts/${id}/transactions`, { params: { page, start, end } }),
};

// ─── Transactions ────────────────────────────────────────
export type TransactionType = 'withdrawal' | 'deposit' | 'transfer' | 'reconciliation' | 'opening-balance';
export const transactionsApi = {
    list: (page = 1, start?: string, end?: string, type?: TransactionType) =>
        getClient().get('/transactions', { params: { page, start, end, type } }),
    get: (id: string) => getClient().get(`/transactions/${id}`),
    create: (data: {
        transactions: Array<{
            type: TransactionType;
            description: string;
            amount: string;
            date: string;
            source_id?: string;
            source_name?: string;
            destination_id?: string;
            destination_name?: string;
            category_name?: string;
            budget_id?: string;
            tags?: string[];
            notes?: string;
        }>;
    }) => getClient().post('/transactions', data),
    update: (id: string, data: any) => getClient().put(`/transactions/${id}`, data),
    delete: (id: string) => getClient().delete(`/transactions/${id}`),
};

// ─── Budgets ─────────────────────────────────────────────
export const budgetsApi = {
    list: (page = 1) => getClient().get('/budgets', { params: { page } }),
    get: (id: string) => getClient().get(`/budgets/${id}`),
    create: (data: any) => getClient().post('/budgets', data),
    update: (id: string, data: any) => getClient().put(`/budgets/${id}`, data),
    delete: (id: string) => getClient().delete(`/budgets/${id}`),
    limits: (id: string, start?: string, end?: string) =>
        getClient().get(`/budgets/${id}/limits`, { params: { start, end } }),
    createLimit: (id: string, data: { start: string; end: string; amount: string }) =>
        getClient().post(`/budgets/${id}/limits`, data),
};

// ─── Categories ──────────────────────────────────────────
export const categoriesApi = {
    list: (page = 1) => getClient().get('/categories', { params: { page } }),
    get: (id: string) => getClient().get(`/categories/${id}`),
    create: (data: { name: string }) => getClient().post('/categories', data),
    update: (id: string, data: { name: string }) => getClient().put(`/categories/${id}`, data),
    delete: (id: string) => getClient().delete(`/categories/${id}`),
    transactions: (id: string, page = 1, start?: string, end?: string) =>
        getClient().get(`/categories/${id}/transactions`, { params: { page, start, end } }),
};

// ─── Piggy Banks ─────────────────────────────────────────
export const piggyBanksApi = {
    list: (page = 1) => getClient().get('/piggy-banks', { params: { page } }),
    get: (id: string) => getClient().get(`/piggy-banks/${id}`),
    create: (data: any) => getClient().post('/piggy-banks', data),
    update: (id: string, data: any) => getClient().put(`/piggy-banks/${id}`, data),
    delete: (id: string) => getClient().delete(`/piggy-banks/${id}`),
    events: (id: string) => getClient().get(`/piggy-banks/${id}/events`),
};

// ─── Bills ───────────────────────────────────────────────
export const billsApi = {
    list: (page = 1, start?: string, end?: string) =>
        getClient().get('/bills', { params: { page, start, end } }),
    get: (id: string) => getClient().get(`/bills/${id}`),
    create: (data: any) => getClient().post('/bills', data),
    update: (id: string, data: any) => getClient().put(`/bills/${id}`, data),
    delete: (id: string) => getClient().delete(`/bills/${id}`),
};

// ─── Recurring Transactions ──────────────────────────────
export const recurringApi = {
    list: (page = 1) => getClient().get('/recurrences', { params: { page } }),
    get: (id: string) => getClient().get(`/recurrences/${id}`),
    create: (data: any) => getClient().post('/recurrences', data),
    update: (id: string, data: any) => getClient().put(`/recurrences/${id}`, data),
    delete: (id: string) => getClient().delete(`/recurrences/${id}`),
};

// ─── Summary / Charts ────────────────────────────────────
export const summaryApi = {
    basic: (start: string, end: string) =>
        getClient().get('/summary/basic', { params: { start, end } }),
};

export const chartsApi = {
    overview: (start: string, end: string) =>
        getClient().get('/chart/account/overview', { params: { start, end } }),
};

// ─── Tags ────────────────────────────────────────────────
export const tagsApi = {
    list: (page = 1) => getClient().get('/tags', { params: { page } }),
};

// ─── Preferences ─────────────────────────────────────────
export const preferencesApi = {
    list: () => getClient().get('/preferences'),
    get: (name: string) => getClient().get(`/preferences/${name}`),
    update: (name: string, data: { data: string }) => getClient().put(`/preferences/${name}`, data),
};

// ─── Autocomplete ────────────────────────────────────────
export const autocompleteApi = {
    accounts: (query: string, types?: string) =>
        getClient().get('/autocomplete/accounts', { params: { query, types } }),
    categories: (query: string) =>
        getClient().get('/autocomplete/categories', { params: { query } }),
    tags: (query: string) =>
        getClient().get('/autocomplete/tags', { params: { query } }),
    descriptions: (query: string) =>
        getClient().get('/autocomplete/transactions', { params: { query } }),
};

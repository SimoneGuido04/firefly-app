import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { budgetsApi } from '../../lib/api';
import { firstOfMonthStr, formatCurrency, lastOfMonthStr } from '../../lib/helpers';
import { useRefreshStore } from '../../store/refreshStore';
import { useThemeStore } from '../../store/themeStore';

const COLORS = ['#f97316', '#3b82f6', '#ef4444', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export default function BudgetScreen() {
    const { colors: c } = useThemeStore();
    const refreshKey = useRefreshStore(s => s.refreshKey);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalSpent, setTotalSpent] = useState(0);
    const [totalBudgeted, setTotalBudgeted] = useState(0);

    const load = useCallback(async () => {
        try {
            const res = await budgetsApi.list();
            if (res.data?.data) {
                const start = firstOfMonthStr();
                const end = lastOfMonthStr();
                const budgetData = res.data.data;
                const limitResults = await Promise.all(
                    budgetData.map((b: any) =>
                        budgetsApi.limits(b.id, start, end).catch(() => ({ data: { data: [] } }))
                    )
                );
                const items: any[] = [];
                let tSpent = 0, tBudget = 0;
                budgetData.forEach((b: any, i: number) => {
                    const limits = limitResults[i]?.data?.data || [];
                    const limit = limits[0];
                    const budgeted = limit ? parseFloat(limit.attributes.amount) : 0;
                    const spent = limit ? Math.abs(parseFloat(limit.attributes.spent?.[0]?.sum || '0')) : 0;
                    items.push({ id: b.id, name: b.attributes.name, budgeted, spent });
                    tSpent += spent; tBudget += budgeted;
                });
                setBudgets(items); setTotalSpent(tSpent); setTotalBudgeted(tBudget);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load, refreshKey]);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
    const overallPct = totalBudgeted > 0 ? Math.min(totalSpent / totalBudgeted, 1) : 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>Gestione Budget</Text>
                <MaterialIcons name="add" size={22} color={c.primary} />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
                    <View style={{ backgroundColor: c.bgCard, margin: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 20 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 }}>BUDGET TOTALE MENSILE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                            <Text style={{ color: c.text, fontSize: 28, fontWeight: '800' }}>{formatCurrency(totalSpent)}</Text>
                            <Text style={{ color: c.textSecondary, fontSize: 14 }}>su {formatCurrency(totalBudgeted)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13 }}>Progresso</Text>
                            <Text style={{ color: c.primary, fontSize: 13, fontWeight: '800' }}>{Math.round(overallPct * 100)}%</Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: c.bgSecondary, borderRadius: 4, overflow: 'hidden' }}>
                            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.primary, width: `${overallPct * 100}%` }} />
                        </View>
                        <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                            {totalBudgeted - totalSpent > 0 ? `Hai ancora ${formatCurrency(totalBudgeted - totalSpent)} disponibili` : 'Budget esaurito!'}
                        </Text>
                    </View>

                    <View style={{ paddingHorizontal: 16, gap: 12 }}>
                        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Dettaglio categorie</Text>
                        {budgets.map((b, i) => {
                            const pct = b.budgeted > 0 ? Math.min(b.spent / b.budgeted, 1) : 0;
                            const over = b.spent > b.budgeted && b.budgeted > 0;
                            const color = COLORS[i % COLORS.length];
                            return (
                                <View key={b.id} style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
                                            <MaterialIcons name="pie-chart" size={22} color={color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{b.name}</Text>
                                                <Text style={{ color, fontSize: 12, fontWeight: '800' }}>{Math.round(pct * 100)}%</Text>
                                            </View>
                                            <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }}>{formatCurrency(b.spent)} / {formatCurrency(b.budgeted)}</Text>
                                        </View>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: c.bgSecondary, borderRadius: 4, overflow: 'hidden' }}>
                                        <View style={{ height: 8, borderRadius: 4, backgroundColor: over ? c.danger : color, width: `${pct * 100}%` }} />
                                    </View>
                                    {over && <Text style={{ color: c.danger, fontSize: 11, fontWeight: '700', marginTop: 6 }}>Budget superato di {formatCurrency(b.spent - b.budgeted)}</Text>}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

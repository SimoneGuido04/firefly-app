import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { summaryApi, categoriesApi } from '../lib/api';
import { formatCurrency } from '../lib/helpers';
import { useThemeStore } from '../store/themeStore';
import { useRefreshStore } from '../store/refreshStore';

type Period = '1M' | '3M' | '6M' | '1Y';
const CATEGORY_COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];
const CATEGORY_ICONS: Record<string, string> = {
    'alimentari': 'restaurant', 'cibo': 'restaurant', 'food': 'restaurant',
    'trasporti': 'directions-car', 'auto': 'directions-car', 'transport': 'directions-car',
    'shopping': 'shopping-bag', 'acquisti': 'shopping-bag',
    'intrattenimento': 'movie', 'svago': 'movie', 'entertainment': 'movie',
    'salute': 'local-hospital', 'health': 'local-hospital',
    'casa': 'home', 'house': 'home', 'affitto': 'home',
};

export default function ReportsScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const refreshKey = useRefreshStore(s => s.refreshKey);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<Period>('6M');
    const [netBalance, setNetBalance] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [categorySpending, setCategorySpending] = useState<any[]>([]);
    const [monthlyData, setMonthlyData] = useState<{ month: string; earned: number; spent: number }[]>([]);

    const getPeriodDates = (p: Period) => {
        const end = new Date(); const start = new Date();
        switch (p) { case '1M': start.setMonth(start.getMonth() - 1); break; case '3M': start.setMonth(start.getMonth() - 3); break; case '6M': start.setMonth(start.getMonth() - 6); break; case '1Y': start.setFullYear(start.getFullYear() - 1); break; }
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    };

    const load = useCallback(async () => {
        try {
            const { start, end } = getPeriodDates(period);
            const summaryRes = await summaryApi.basic(start, end).catch(() => null);
            if (summaryRes?.data) {
                const d = summaryRes.data; let earned = 0, spent = 0;
                for (const key of Object.keys(d)) { if (key.startsWith('earned-in-')) earned += parseFloat(d[key]?.monetary_value || '0'); if (key.startsWith('spent-in-')) spent += Math.abs(parseFloat(d[key]?.monetary_value || '0')); }
                setTotalEarned(earned); setTotalSpent(spent); setNetBalance(earned - spent);
            }
            const catRes = await categoriesApi.list().catch(() => null);
            if (catRes?.data?.data) {
                const catSpending: any[] = [];
                for (const cat of catRes.data.data.slice(0, 8)) {
                    try {
                        const txRes = await categoriesApi.transactions(cat.id, 1, start, end);
                        if (txRes.data?.data) {
                            const total = txRes.data.data.reduce((sum: number, tx: any) => { const t = tx.attributes.transactions[0]; if (t.type === 'withdrawal') return sum + Math.abs(parseFloat(t.amount || '0')); return sum; }, 0);
                            if (total > 0) catSpending.push({ name: cat.attributes.name, amount: total, count: txRes.data.data.length });
                        }
                    } catch { }
                }
                catSpending.sort((a, b) => b.amount - a.amount); setCategorySpending(catSpending);
            }
            const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
            const monthCount = period === '1M' ? 1 : period === '3M' ? 3 : period === '6M' ? 6 : 12;
            const now = new Date(); const mData: any[] = [];
            for (let i = monthCount - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
                try {
                    const mRes = await summaryApi.basic(mStart, mEnd); let mE = 0, mS = 0;
                    if (mRes?.data) { for (const key of Object.keys(mRes.data)) { if (key.startsWith('earned-in-')) mE += parseFloat(mRes.data[key]?.monetary_value || '0'); if (key.startsWith('spent-in-')) mS += Math.abs(parseFloat(mRes.data[key]?.monetary_value || '0')); } }
                    mData.push({ month: months[d.getMonth()], earned: mE, spent: mS });
                } catch { mData.push({ month: months[d.getMonth()], earned: 0, spent: 0 }); }
            }
            setMonthlyData(mData);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [period]);

    useEffect(() => { setLoading(true); load(); }, [period, load, refreshKey]);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
    const maxBar = Math.max(...monthlyData.map(m => Math.max(m.earned, m.spent)), 1);
    const totalCatSpending = categorySpending.reduce((s, cc) => s + cc.amount, 0);
    const PERIODS: { key: Period; label: string }[] = [{ key: '1M', label: '1 Mese' }, { key: '3M', label: '3 Mesi' }, { key: '6M', label: '6 Mesi' }, { key: '1Y', label: 'Annuale' }];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="arrow-back" size={24} color={c.text} /></TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Report e Analisi</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, maxHeight: 48, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
                {PERIODS.map(p => (
                    <TouchableOpacity key={p.key} style={{ height: 36, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 18, backgroundColor: period === p.key ? c.primary : c.bgCard, borderWidth: 1, borderColor: period === p.key ? c.primary : c.border }} onPress={() => setPeriod(p.key)}>
                        <Text style={{ color: period === p.key ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '700' }}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
                    <View style={{ backgroundColor: c.bgCard, margin: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 20 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13 }}>Bilancio Netto</Text>
                        <Text style={{ color: c.text, fontSize: 28, fontWeight: '800', marginTop: 4 }}>{formatCurrency(netBalance)}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <MaterialIcons name={netBalance >= 0 ? 'trending-up' : 'trending-down'} size={14} color={netBalance >= 0 ? c.success : c.danger} />
                            <Text style={{ color: netBalance >= 0 ? c.success : c.danger, fontSize: 13, fontWeight: '600' }}>{netBalance >= 0 ? '+' : ''}{totalEarned > 0 ? Math.round((netBalance / totalEarned) * 100) : 0}%</Text>
                        </View>
                        {monthlyData.length > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 20, height: 120, paddingHorizontal: 4 }}>
                                {monthlyData.map((m, i) => (
                                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                                            <View style={{ width: 8, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: c.primary + 'CC', height: Math.max((m.earned / maxBar) * 100, 4) }} />
                                            <View style={{ width: 8, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: c.danger, height: Math.max((m.spent / maxBar) * 100, 4) }} />
                                        </View>
                                        <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700', marginTop: 6 }}>{m.month}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /><Text style={{ color: c.textSecondary, fontSize: 12 }}>Entrate</Text></View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.danger }} /><Text style={{ color: c.textSecondary, fontSize: 12 }}>Uscite</Text></View>
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                        <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Top Categorie di Spesa</Text>
                        <View style={{ gap: 16, marginTop: 12 }}>
                            {categorySpending.map((cat, i) => {
                                const pct = totalCatSpending > 0 ? (cat.amount / totalCatSpending) * 100 : 0;
                                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                                const iconName = CATEGORY_ICONS[cat.name.toLowerCase()] || 'category';
                                return (
                                    <View key={cat.name} style={{ gap: 8 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name={iconName as any} size={20} color={color} /></View>
                                                <View><Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{cat.name}</Text><Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 1 }}>{cat.count} Transazioni</Text></View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}><Text style={{ color: c.text, fontSize: 14, fontWeight: '800' }}>{formatCurrency(cat.amount)}</Text><Text style={{ color: c.danger, fontSize: 11, fontWeight: '600', marginTop: 1 }}>{Math.round(pct)}%</Text></View>
                                        </View>
                                        <View style={{ height: 6, backgroundColor: c.bgSecondary, borderRadius: 3, overflow: 'hidden' }}><View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${pct}%` }} /></View>
                                    </View>
                                );
                            })}
                            {categorySpending.length === 0 && <Text style={{ color: c.textMuted, textAlign: 'center', padding: 24 }}>Nessun dato per questo periodo</Text>}
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

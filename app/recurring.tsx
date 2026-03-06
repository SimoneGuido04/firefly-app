import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recurringApi } from '../lib/api';
import { formatCurrency } from '../lib/helpers';
import { useRefreshStore } from '../store/refreshStore';
import { useThemeStore } from '../store/themeStore';

type Tab = 'active' | 'inactive' | 'all';

export default function RecurringScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const refreshKey = useRefreshStore(s => s.refreshKey);
    const [recurrences, setRecurrences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<Tab>('active');

    const load = useCallback(async () => {
        try { const res = await recurringApi.list(); if (res.data?.data) setRecurrences(res.data.data); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load, refreshKey]);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const filtered = recurrences.filter(r => tab === 'active' ? r.attributes.active : tab === 'inactive' ? !r.attributes.active : true);
    const totalMonth = filtered.reduce((sum, r) => {
        const a = r.attributes;
        const tx = a.transactions?.[0];
        if (!tx) return sum;

        const type = a.type || tx.type || 'withdrawal';
        if (type === 'transfer') return sum; // Transfers are cashflow neutral

        const rawAmt = parseFloat(tx.amount || a.amount || '0');
        const amt = type === 'deposit' ? rawAmt : -rawAmt;
        const freq = a.repeat_freq;

        if (freq === 'monthly') return sum + amt;
        if (freq === 'weekly') return sum + amt * (52 / 12);
        if (freq === 'daily') return sum + amt * (365 / 12);
        if (freq === 'yearly') return sum + amt / 12;
        if (freq === 'quarterly') return sum + amt / 3;
        if (freq === 'half-year') return sum + amt / 6;
        return sum + amt;
    }, 0);

    const getFreqLabel = (freq: string) => {
        switch (freq) { case 'daily': return 'Giornaliero'; case 'weekly': return 'Settimanale'; case 'monthly': return 'Mensile'; case 'yearly': return 'Annuale'; case 'half-year': return 'Semestrale'; case 'quarterly': return 'Trimestrale'; default: return freq; }
    };

    const TABS: { key: Tab; label: string }[] = [{ key: 'active', label: 'Attive' }, { key: 'inactive', label: 'Inattive' }, { key: 'all', label: 'Tutte' }];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="arrow-back" size={24} color={c.text} /></TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Ricorrenze</Text>
                <TouchableOpacity onPress={() => router.push('/new-recurring' as any)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="add" size={22} color={c.primary} /></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: c.bgCard, borderBottomWidth: 1, borderBottomColor: c.border }}>
                {TABS.map(t => (
                    <TouchableOpacity key={t.key} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? c.primary : 'transparent' }} onPress={() => setTab(t.key)}>
                        <Text style={{ color: tab === t.key ? c.primary : c.textSecondary, fontSize: 14, fontWeight: '600' }}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
                    <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
                        <View style={{ flex: 1, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MaterialIcons name="calendar-month" size={16} color={c.primary} /><Text style={{ color: c.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>TOTALE MESE</Text></View>
                            <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>{formatCurrency(totalMonth)}</Text>
                            <Text style={{ color: c.textMuted, fontSize: 10 }}>Stima</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MaterialIcons name="speed" size={16} color={c.primary} /><Text style={{ color: c.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>RICORRENZE</Text></View>
                            <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>{filtered.length}</Text>
                            <Text style={{ color: c.textMuted, fontSize: 10 }}>{tab === 'active' ? 'Attive' : tab === 'inactive' ? 'Inattive' : 'Totali'}</Text>
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 16, gap: 10 }}>
                        {filtered.length === 0 ? <Text style={{ color: c.textMuted, textAlign: 'center', padding: 40 }}>Nessuna ricorrenza</Text> : filtered.map(r => {
                            const a = r.attributes; const tx = a.transactions?.[0]; const type = a.type || tx?.type || 'withdrawal';
                            const amount = parseFloat(tx?.amount || a.amount || '0'); const isDeposit = type === 'deposit';
                            const desc = a.title || tx?.description || 'Ricorrenza'; const accountName = tx?.source_name || tx?.destination_name || '';
                            return (
                                <TouchableOpacity key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14 }} onPress={() => router.push(`/recurring/${r.id}` as any)}>
                                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDeposit ? c.success + '1A' : type === 'transfer' ? c.textSecondary + '1A' : c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                                        <MaterialIcons name={isDeposit ? 'arrow-downward' : type === 'transfer' ? 'sync-alt' : 'arrow-upward'} size={22} color={isDeposit ? c.success : type === 'transfer' ? c.textSecondary : c.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{desc}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                            <MaterialIcons name="account-balance-wallet" size={12} color={c.textMuted} />
                                            <Text style={{ color: c.textMuted, fontSize: 11 }}>{accountName} • {getFreqLabel(a.repeat_freq)}</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: isDeposit ? c.success : c.text }}>{isDeposit ? '+' : '-'} {formatCurrency(amount)}</Text>
                                        {a.latest_date && <View style={{ backgroundColor: c.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}><Text style={{ color: c.primary, fontSize: 10, fontWeight: '600' }}>{a.latest_date.substring(5, 10).replace('-', '/')}</Text></View>}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

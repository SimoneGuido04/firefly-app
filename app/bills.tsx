import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { billsApi } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/helpers';
import { useThemeStore } from '../store/themeStore';
import { useRefreshStore } from '../store/refreshStore';

export default function BillsScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const refreshKey = useRefreshStore(s => s.refreshKey);
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalPaid, setTotalPaid] = useState(0);
    const [totalPending, setTotalPending] = useState(0);

    const load = useCallback(async () => {
        try {
            const res = await billsApi.list();
            if (res.data?.data) {
                const items = res.data.data; setBills(items);
                let paid = 0, pending = 0;
                items.forEach((b: any) => { const a = b.attributes; const avg = (parseFloat(a.amount_min || '0') + parseFloat(a.amount_max || '0')) / 2; if (a.paid_dates?.length > 0) paid += avg; else pending += avg; });
                setTotalPaid(paid); setTotalPending(pending);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load, refreshKey]);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const getIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('elettric') || n.includes('luce') || n.includes('enel')) return 'bolt';
        if (n.includes('gas')) return 'local-fire-department';
        if (n.includes('acqua') || n.includes('idric')) return 'water-drop';
        if (n.includes('internet') || n.includes('fibra') || n.includes('wifi')) return 'wifi';
        if (n.includes('affitto') || n.includes('casa')) return 'home';
        if (n.includes('telefon') || n.includes('mobile')) return 'phone-android';
        if (n.includes('assicuraz')) return 'security';
        return 'receipt-long';
    };

    const paidBills = bills.filter(b => b.attributes.paid_dates?.length > 0);
    const pendingBills = bills.filter(b => !b.attributes.paid_dates?.length);
    const total = totalPaid + totalPending;
    const paidPct = total > 0 ? totalPaid / total : 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="arrow-back" size={24} color={c.text} /></TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Bollette e Spese</Text>
                <TouchableOpacity onPress={() => router.push('/new-bill' as any)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="add" size={24} color={c.primary} /></TouchableOpacity>
            </View>
            {loading ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
                    <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
                        <View style={{ flex: 1, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}><MaterialIcons name="check-circle" size={18} color={c.success} /><Text style={{ color: c.textSecondary, fontSize: 13 }}>Pagate</Text></View>
                            <Text style={{ color: c.text, fontSize: 22, fontWeight: '800' }}>{formatCurrency(totalPaid)}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}><MaterialIcons name="pending" size={18} color={c.warning} /><Text style={{ color: c.textSecondary, fontSize: 13 }}>Rimanenti</Text></View>
                            <Text style={{ color: c.text, fontSize: 22, fontWeight: '800' }}>{formatCurrency(totalPending)}</Text>
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                            <View><Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>Progresso mensile</Text><Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }}>{paidBills.length} di {bills.length} liquidate</Text></View>
                            <Text style={{ color: c.primary, fontSize: 18, fontWeight: '800' }}>{Math.round(paidPct * 100)}%</Text>
                        </View>
                        <View style={{ height: 10, backgroundColor: c.bgSecondary, borderRadius: 5, overflow: 'hidden' }}><View style={{ height: 10, borderRadius: 5, backgroundColor: c.primary, width: `${paidPct * 100}%` }} /></View>
                    </View>

                    {pendingBills.length > 0 && <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>In sospeso</Text>
                            <View style={{ backgroundColor: c.warning + '26', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}><Text style={{ color: c.warning, fontSize: 11, fontWeight: '700' }}>{pendingBills.length} scadenze</Text></View>
                        </View>
                        <View style={{ paddingHorizontal: 16, gap: 10 }}>
                            {pendingBills.map(bill => {
                                const a = bill.attributes; const avg = (parseFloat(a.amount_min || '0') + parseFloat(a.amount_max || '0')) / 2;
                                return (
                                    <View key={bill.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                                        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.warning + '1A', alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name={getIcon(a.name) as any} size={24} color={c.warning} /></View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: c.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{a.name}</Text><Text style={{ color: c.text, fontSize: 15, fontWeight: '800' }}>{formatCurrency(avg)}</Text></View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}><Text style={{ color: c.textSecondary, fontSize: 12 }}>Scade: {a.next_expected_match ? formatDate(a.next_expected_match) : 'N/D'}</Text><Text style={{ color: c.warning, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>DA PAGARE</Text></View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>}

                    {paidBills.length > 0 && <>
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 }}><Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>Pagate</Text></View>
                        <View style={{ paddingHorizontal: 16, gap: 10 }}>
                            {paidBills.map(bill => {
                                const a = bill.attributes; const avg = (parseFloat(a.amount_min || '0') + parseFloat(a.amount_max || '0')) / 2;
                                return (
                                    <View key={bill.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, opacity: 0.7 }}>
                                        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.success + '1A', alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name={getIcon(a.name) as any} size={24} color={c.success} /></View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: c.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{a.name}</Text><Text style={{ color: c.text, fontSize: 15, fontWeight: '800' }}>{formatCurrency(avg)}</Text></View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}><Text style={{ color: c.textSecondary, fontSize: 12 }}>{a.paid_dates?.[0]?.date ? formatDate(a.paid_dates[0].date) : ''}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialIcons name="check-circle" size={12} color={c.success} /><Text style={{ color: c.success, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>PAGATO</Text></View></View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>}
                    {bills.length === 0 && <Text style={{ color: c.textMuted, textAlign: 'center', padding: 40 }}>Nessuna bolletta trovata</Text>}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

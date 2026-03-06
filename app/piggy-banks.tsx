import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { piggyBanksApi } from '../lib/api';
import { formatCurrency } from '../lib/helpers';
import { useThemeStore } from '../store/themeStore';
import { useRefreshStore } from '../store/refreshStore';

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444'];

export default function PiggyBanksScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const refreshKey = useRefreshStore(s => s.refreshKey);
    const [piggies, setPiggies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalSaved, setTotalSaved] = useState(0);
    const [totalTarget, setTotalTarget] = useState(0);

    const load = useCallback(async () => {
        try {
            const res = await piggyBanksApi.list();
            if (res.data?.data) {
                const items = res.data.data; setPiggies(items);
                let saved = 0, target = 0;
                items.forEach((p: any) => { saved += parseFloat(p.attributes.current_amount || '0'); target += parseFloat(p.attributes.target_amount || '0'); });
                setTotalSaved(saved); setTotalTarget(target);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load, refreshKey]);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
    const globalPct = totalTarget > 0 ? Math.min(totalSaved / totalTarget, 1) : 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="arrow-back" size={24} color={c.text} /></TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Salvadanai</Text>
                <TouchableOpacity onPress={() => router.push('/new-piggy-bank' as any)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="add" size={24} color={c.primary} /></TouchableOpacity>
            </View>
            {loading ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
                    <View style={{ backgroundColor: c.primary, margin: 16, borderRadius: 16, padding: 20, elevation: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Risparmi Totali</Text><Text style={{ color: 'white', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{formatCurrency(totalSaved)}</Text></View>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="account-balance-wallet" size={24} color="white" /></View>
                        </View>
                        <View style={{ marginTop: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Progresso Globale</Text>
                                <Text style={{ color: 'white', fontSize: 13, fontWeight: '800' }}>{Math.round(globalPct * 100)}%</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ height: 8, borderRadius: 4, backgroundColor: 'white', width: `${globalPct * 100}%` }} />
                            </View>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 8 }}>{formatCurrency(totalSaved)} di {formatCurrency(totalTarget)}</Text>
                        </View>
                    </View>
                    <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}><Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>I tuoi obiettivi</Text></View>
                    <View style={{ paddingHorizontal: 16, gap: 12 }}>
                        {piggies.length === 0 ? <Text style={{ color: c.textMuted, textAlign: 'center', padding: 40 }}>Nessun salvadanaio</Text> : piggies.map((p, i) => {
                            const a = p.attributes; const current = parseFloat(a.current_amount || '0'); const target = parseFloat(a.target_amount || '0');
                            const pct = target > 0 ? Math.min(current / target, 1) : 0; const color = COLORS[i % COLORS.length];
                            return (
                                <View key={p.id} style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                                    <View style={{ flexDirection: 'row', gap: 14 }}>
                                        <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="savings" size={28} color={color} /></View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{a.name}</Text>
                                                <View style={{ backgroundColor: color + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}><Text style={{ color, fontSize: 11, fontWeight: '800' }}>{Math.round(pct * 100)}%</Text></View>
                                            </View>
                                            <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 4 }}>Target: {formatCurrency(target)}</Text>
                                            <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', marginTop: 2 }}>{formatCurrency(current)} salvati</Text>
                                        </View>
                                    </View>
                                    <View style={{ marginTop: 12 }}>
                                        <View style={{ height: 6, backgroundColor: c.bgSecondary, borderRadius: 3, overflow: 'hidden' }}><View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${pct * 100}%` }} /></View>
                                        {a.start_date && a.target_date && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                            <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Inizio: {a.start_date}</Text>
                                            <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Scadenza: {a.target_date}</Text>
                                        </View>}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

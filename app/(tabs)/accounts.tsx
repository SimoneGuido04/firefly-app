import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountsApi } from '../../lib/api';
import { formatCurrency } from '../../lib/helpers';
import { useRefreshStore } from '../../store/refreshStore';
import { useThemeStore } from '../../store/themeStore';

type Tab = 'asset' | 'expense' | 'revenue';

export default function AccountsScreen() {
    const { colors: c } = useThemeStore();
    const refreshKey = useRefreshStore(s => s.refreshKey);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<Tab>('asset');
    const [totalBalance, setTotalBalance] = useState(0);

    const load = useCallback(async () => {
        try {
            const res = await accountsApi.list(tab as any);
            if (res.data?.data) {
                const accs = res.data.data;
                setAccounts(accs);
                if (tab === 'asset') {
                    const total = accs
                        .filter((a: any) => a.attributes.include_net_worth !== false)
                        .reduce((s: number, a: any) => s + parseFloat(a.attributes.current_balance || '0'), 0);
                    setTotalBalance(total);
                } else {
                    setTotalBalance(0);
                }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [tab]);

    useEffect(() => { setLoading(true); load(); }, [tab, load, refreshKey]);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const getIcon = (role: string) => {
        if (role === 'defaultAsset' || role === 'sharedAsset') return 'account-balance';
        if (role === 'savingAsset') return 'savings';
        return 'account-balance-wallet';
    };

    const TABS: { key: Tab; label: string }[] = [
        { key: 'asset', label: 'Correnti' }, { key: 'expense', label: 'Spesa' }, { key: 'revenue', label: 'Entrate' },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
            <View style={{ backgroundColor: c.bgCard, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>Gestione Conti</Text>
            </View>

            {tab === 'asset' && (
                <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: c.bgCard }}>
                    <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 }}>PATRIMONIO NETTO</Text>
                    <Text style={{ color: c.text, fontSize: 32, fontWeight: '800' }}>{formatCurrency(totalBalance)}</Text>
                </View>
            )}

            <View style={{ flexDirection: 'row', backgroundColor: c.bgCard, borderBottomWidth: 1, borderBottomColor: c.border }}>
                {TABS.map(t => (
                    <TouchableOpacity key={t.key} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? c.primary : 'transparent' }} onPress={() => setTab(t.key)}>
                        <Text style={{ color: tab === t.key ? c.primary : c.textSecondary, fontSize: 14, fontWeight: '700' }}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
                    {accounts.length === 0 ? (
                        <Text style={{ color: c.textMuted, textAlign: 'center', padding: 40 }}>Nessun conto trovato</Text>
                    ) : accounts.map(acc => {
                        const a = acc.attributes;
                        const bal = parseFloat(a.current_balance || '0');
                        const excluded = a.include_net_worth === false;
                        return (
                            <TouchableOpacity key={acc.id} style={[{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, flexDirection: 'row', alignItems: 'center' }, excluded && { opacity: 0.7 }]}>
                                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                                    <MaterialIcons name={getIcon(a.account_role) as any} size={28} color={excluded ? c.textSecondary : c.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{a.name}</Text>
                                    <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 3 }}>{a.type} {a.iban ? `• ${a.iban.slice(-4)}` : ''}</Text>
                                    {excluded && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                            <MaterialIcons name="visibility-off" size={12} color={c.textSecondary} />
                                            <Text style={{ color: c.textSecondary, fontSize: 10, fontWeight: '600' }}>Escluso dal patrimonio netto</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>{formatCurrency(bal, a.currency_symbol || '€')}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

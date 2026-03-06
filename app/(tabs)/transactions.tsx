import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { transactionsApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/helpers';
import { useRefreshStore } from '../../store/refreshStore';
import { useThemeStore } from '../../store/themeStore';

type FilterType = 'all' | 'withdrawal' | 'deposit' | 'transfer';

export default function TransactionsScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const refreshKey = useRefreshStore(s => s.refreshKey);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(async (p = 1, append = false) => {
        try {
            const type = filter === 'all' ? undefined : filter;
            const res = await transactionsApi.list(p, undefined, undefined, type as any);
            if (res.data?.data) {
                const newItems = res.data.data;
                if (append) setTransactions(prev => [...prev, ...newItems]);
                else setTransactions(newItems);
                setHasMore(newItems.length >= 50);
                setPage(p);
            } else {
                setHasMore(false);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); setLoadingMore(false); }
    }, [filter]);

    useEffect(() => { setLoading(true); setPage(1); setHasMore(true); load(1); }, [filter, load, refreshKey]);
    const onRefresh = async () => { setRefreshing(true); setPage(1); setHasMore(true); await load(1); setRefreshing(false); };
    const loadMore = () => {
        if (!hasMore || loadingMore || loading) return;
        setLoadingMore(true);
        load(page + 1, true);
    };

    const getTxIcon = (type: string) => type === 'withdrawal' ? 'shopping-cart' : type === 'deposit' ? 'payments' : 'sync-alt';
    const getTxColors = (type: string) => {
        if (type === 'withdrawal') return { icon: c.danger, bg: c.danger + '1A', amount: c.danger };
        if (type === 'deposit') return { icon: c.success, bg: c.success + '1A', amount: c.success };
        return { icon: c.textSecondary, bg: c.textSecondary + '1A', amount: c.textMuted };
    };

    const grouped: Record<string, any[]> = {};
    transactions.forEach(tx => {
        const t = tx.attributes.transactions[0];
        if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return;
        const dateKey = formatDate(t.date);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(tx);
    });

    const FILTERS: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'Tutte' }, { key: 'withdrawal', label: 'Uscite' },
        { key: 'deposit', label: 'Entrate' }, { key: 'transfer', label: 'Trasferimenti' },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>Transazioni</Text>
                <MaterialIcons name="notifications-none" size={22} color={c.textSecondary} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 44 }}>
                <MaterialIcons name="search" size={20} color={c.textSecondary} style={{ marginLeft: 12 }} />
                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Cerca transazioni..." placeholderTextColor={c.textMuted} value={search} onChangeText={setSearch} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, maxHeight: 48, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
                {FILTERS.map(f => (
                    <TouchableOpacity key={f.key} style={{ height: 36, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 18, backgroundColor: filter === f.key ? c.primary : c.bgCard, borderWidth: 1, borderColor: filter === f.key ? c.primary : c.border }} onPress={() => setFilter(f.key)}>
                        <Text style={{ color: filter === f.key ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 90 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                    onScroll={({ nativeEvent }) => {
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) loadMore();
                    }}
                    scrollEventThrottle={400}>
                    {Object.keys(grouped).length === 0 ? (
                        <Text style={{ color: c.textMuted, textAlign: 'center', padding: 40, fontSize: 14 }}>Nessuna transazione trovata</Text>
                    ) : Object.entries(grouped).map(([date, txs]) => (
                        <View key={date} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                            <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>{date}</Text>
                            {txs.map((tx: any) => {
                                const t = tx.attributes.transactions[0];
                                const tc = getTxColors(t.type);
                                return (
                                    <TouchableOpacity key={tx.id} onPress={() => router.push(`/transaction/${tx.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 8 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tc.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <MaterialIcons name={getTxIcon(t.type) as any} size={20} color={tc.icon} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{t.description}</Text>
                                            <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 2 }}>{t.category_name || t.source_name}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: tc.amount, fontSize: 14, fontWeight: '800' }}>
                                                {t.type === 'withdrawal' ? '-' : t.type === 'deposit' ? '+' : ''}{formatCurrency(t.amount)}
                                            </Text>
                                            <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 2 }}>{t.source_name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}
                    {loadingMore && <ActivityIndicator size="small" color={c.primary} style={{ paddingVertical: 16 }} />}
                </ScrollView>
            )}

            <TouchableOpacity style={{ position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 }} onPress={() => router.push('/new-transaction')}>
                <MaterialIcons name="add" size={28} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

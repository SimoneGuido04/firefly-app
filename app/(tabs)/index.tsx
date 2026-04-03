import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountsApi, billsApi, summaryApi, transactionsApi } from '../../lib/api';
import { firstOfMonthStr, formatCurrency, formatDate, lastOfMonthStr } from '../../lib/helpers';
import { useRefreshStore } from '../../store/refreshStore';
import { useThemeStore } from '../../store/themeStore';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors: c } = useThemeStore();
  const refreshKey = useRefreshStore(s => s.refreshKey);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState('0');
  const [earned, setEarned] = useState('0');
  const [spent, setSpent] = useState('0');
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const start = firstOfMonthStr();
      const end = lastOfMonthStr();
      const [summaryRes, txRes, accountsRes, billsRes] = await Promise.all([
        summaryApi.basic(start, end).catch(() => null),
        transactionsApi.list(1, start, end).catch(() => null),
        accountsApi.list('asset', 1).catch(() => null),
        billsApi.list(1, start, end).catch(() => null),
      ]);
      if (summaryRes?.data) {
        const d = summaryRes.data;
        let totalSpent = 0, totalEarned = 0;
        for (const key of Object.keys(d)) {
          if (key.startsWith('spent-in-')) totalSpent += parseFloat(d[key]?.monetary_value || '0');
          if (key.startsWith('earned-in-')) totalEarned += parseFloat(d[key]?.monetary_value || '0');
        }
        setSpent(String(totalSpent));
        setEarned(String(totalEarned));
      }
      if (accountsRes?.data?.data) {
        const total = accountsRes.data.data
          .filter((acc: any) => acc.attributes.include_net_worth !== false)
          .reduce((sum: number, acc: any) => sum + parseFloat(acc.attributes.current_balance || '0'), 0);
        setBalance(String(total));
      }
      if (billsRes?.data?.data) {
        // Find bills that don't have paid_dates for this month
        setPendingBills(billsRes.data.data.filter((b: any) => !b.attributes.paid_dates?.length));
      }
      if (txRes?.data?.data) setRecentTx(txRes.data.data.slice(0, 5));
    } catch (e: any) { setError('Errore nel caricamento dati'); console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getTxIcon = (type: string) => type === 'withdrawal' ? 'shopping-cart' : type === 'deposit' ? 'payments' : 'sync-alt';
  const getTxColor = (type: string) => {
    if (type === 'withdrawal') return { icon: c.danger, bg: c.danger + '1A' };
    if (type === 'deposit') return { icon: c.success, bg: c.success + '1A' };
    return { icon: c.textSecondary, bg: c.textSecondary + '1A' };
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={{ color: c.textSecondary, marginTop: 12 }}>Caricamento...</Text>
    </View>
  );

  const spentNum = Math.abs(parseFloat(spent));
  const earnedNum = parseFloat(earned);
  const net = earnedNum - spentNum;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
        {error ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.danger + '14', borderRadius: 12, margin: 16, padding: 14, borderWidth: 1, borderColor: c.danger + '33' }}>
            <MaterialIcons name="error-outline" size={20} color={c.danger} />
            <Text style={{ color: c.danger, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Balance Cards */}
        <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
          <View style={{ flex: 1, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Saldo Totale</Text>
            <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>{formatCurrency(balance)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Netto Mensile</Text>
            <Text style={{ color: net >= 0 ? c.success : c.danger, fontSize: 20, fontWeight: '800' }}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </Text>
          </View>
        </View>

        {/* Pending Bills Widget */}
        {pendingBills.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>Da Pagare</Text>
              <View style={{ backgroundColor: c.warning + '26', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: c.warning, fontSize: 11, fontWeight: '700' }}>{pendingBills.length} in sospeso</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {pendingBills.map(bill => {
                const a = bill.attributes;
                const avg = (parseFloat(a.amount_min || '0') + parseFloat(a.amount_max || '0')) / 2;
                return (
                  <TouchableOpacity
                    key={bill.id}
                    onPress={() => router.push('/bills')}
                    style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, width: 160 }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.warning + '1A', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="receipt-long" size={18} color={c.warning} />
                      </View>
                      <TouchableOpacity
                        onPress={() => router.push(`/new-transaction?billId=${bill.id}&billName=${encodeURIComponent(a.name)}&amount=${avg}` as any)}
                        style={{ backgroundColor: c.success + '22', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MaterialIcons name="done" size={16} color={c.success} />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>{a.name}</Text>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>{formatCurrency(avg)}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 4 }}>Scade: {a.next_expected_match ? formatDate(a.next_expected_match) : 'N/D'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Monthly Summary */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Riepilogo Mensile</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialIcons name="arrow-downward" size={18} color={c.success} />
                <View>
                  <Text style={{ color: c.textSecondary, fontSize: 11 }}>Entrate</Text>
                  <Text style={{ color: c.success, fontSize: 16, fontWeight: '800' }}>{formatCurrency(earned)}</Text>
                </View>
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: c.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialIcons name="arrow-upward" size={18} color={c.danger} />
                <View>
                  <Text style={{ color: c.textSecondary, fontSize: 11 }}>Uscite</Text>
                  <Text style={{ color: c.danger, fontSize: 16, fontWeight: '800' }}>{formatCurrency(spentNum)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>Ultime Transazioni</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={{ color: c.primary, fontSize: 13, fontWeight: '700' }}>Tutte</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
            {recentTx.length === 0 ? (
              <Text style={{ color: c.textMuted, textAlign: 'center', padding: 20 }}>Nessuna transazione questo mese</Text>
            ) : recentTx.map((tx, i) => {
              const t = tx.attributes.transactions[0];
              const type = t.type;
              const tc = getTxColor(type);
              const isExpense = type === 'withdrawal';
              return (
                <TouchableOpacity key={tx.id} onPress={() => router.push(`/transaction/${tx.id}` as any)} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tc.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <MaterialIcons name={getTxIcon(type) as any} size={20} color={tc.icon} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{t.description}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 2 }}>{formatDate(t.date)} • {t.category_name || t.source_name}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isExpense ? c.danger : c.success }}>
                    {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

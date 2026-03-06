import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { summaryApi, transactionsApi, accountsApi } from '../../lib/api';
import { firstOfMonthStr, lastOfMonthStr, formatCurrency, formatDate } from '../../lib/helpers';
import { useThemeStore } from '../../store/themeStore';
import { useRefreshStore } from '../../store/refreshStore';

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
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const start = firstOfMonthStr();
      const end = lastOfMonthStr();
      const [summaryRes, txRes, accountsRes] = await Promise.all([
        summaryApi.basic(start, end).catch(() => null),
        transactionsApi.list(1, start, end).catch(() => null),
        accountsApi.list('asset', 1).catch(() => null),
      ]);
      if (summaryRes?.data) {
        const d = summaryRes.data;
        for (const key of Object.keys(d)) {
          if (key.startsWith('spent-in-')) setSpent(d[key]?.monetary_value || '0');
          if (key.startsWith('earned-in-')) setEarned(d[key]?.monetary_value || '0');
        }
      }
      if (accountsRes?.data?.data) {
        const total = accountsRes.data.data
          .filter((acc: any) => acc.attributes.include_net_worth !== false)
          .reduce((sum: number, acc: any) => sum + parseFloat(acc.attributes.current_balance || '0'), 0);
        setBalance(String(total));
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
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgCard, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Text style={{ flex: 1, color: c.text, fontSize: 18, fontWeight: '700' }}>Firefly III</Text>
        <MaterialIcons name="notifications" size={22} color={c.textSecondary} />
      </View>

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
        <View style={{ height: 90 }} />
      </ScrollView>

      <TouchableOpacity style={{ position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 }} onPress={() => router.push('/new-transaction')}>
        <MaterialIcons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

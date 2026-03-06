import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { piggyBanksApi, accountsApi } from '../lib/api';
import { todayStr } from '../lib/helpers';
import { useThemeStore } from '../store/themeStore';
import { useRefreshStore } from '../store/refreshStore';

export default function NewPiggyBankScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const triggerRefresh = useRefreshStore(s => s.triggerRefresh);

    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [startDate, setStartDate] = useState(todayStr());
    const [targetDate, setTargetDate] = useState('');
    const [notes, setNotes] = useState('');
    const [accountId, setAccountId] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await accountsApi.list('asset');
                if (res.data?.data) { setAccounts(res.data.data); if (res.data.data.length > 0) setAccountId(res.data.data[0].id); }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('Errore', 'Inserisci un nome'); return; }
        if (!targetAmount || parseFloat(targetAmount) <= 0) { Alert.alert('Errore', 'Inserisci un importo obiettivo'); return; }
        if (!accountId) { Alert.alert('Errore', 'Seleziona un conto'); return; }
        setSaving(true);
        try {
            await piggyBanksApi.create({
                name: name.trim(),
                account_id: accountId,
                target_amount: targetAmount.replace(',', '.'),
                current_amount: currentAmount ? currentAmount.replace(',', '.') : '0',
                start_date: startDate || undefined,
                target_date: targetDate || undefined,
                notes: notes || undefined,
            });
            triggerRefresh();
            Alert.alert('Successo', 'Salvadanaio creato!', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (e: any) {
            console.error(e?.response?.data || e);
            Alert.alert('Errore', e?.response?.data?.message || 'Impossibile creare');
        } finally { setSaving(false); }
    };

    if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View>;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="close" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Nuovo Salvadanaio</Text>
                <TouchableOpacity onPress={handleSave} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={c.primary} /> : <MaterialIcons name="check" size={24} color={c.primary} />}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Target Amount Hero */}
                <View style={{ backgroundColor: c.primaryBg, paddingVertical: 32, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 4 }}>Obiettivo</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={{ color: c.primary, fontSize: 24, fontWeight: '800', marginRight: 4 }}>€</Text>
                        <TextInput style={{ color: c.primary, fontSize: 48, fontWeight: '800', minWidth: 100, textAlign: 'center' }}
                            value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={c.textMuted} />
                    </View>
                </View>

                <View style={{ paddingHorizontal: 16, gap: 16, paddingTop: 16, paddingBottom: 24 }}>
                    {/* Name */}
                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Nome</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                            <MaterialIcons name="savings" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Es. Vacanza estiva" placeholderTextColor={c.textMuted} value={name} onChangeText={setName} />
                        </View>
                    </View>

                    {/* Account */}
                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Conto associato</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {accounts.map(acc => (
                                <TouchableOpacity key={acc.id} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: accountId === acc.id ? c.primary : c.border, backgroundColor: accountId === acc.id ? c.primary : c.bgCard }} onPress={() => setAccountId(acc.id)}>
                                    <Text style={{ color: accountId === acc.id ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{acc.attributes.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Current Amount */}
                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Importo già risparmiato</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                            <MaterialIcons name="account-balance-wallet" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="0,00" placeholderTextColor={c.textMuted} value={currentAmount} onChangeText={setCurrentAmount} keyboardType="decimal-pad" />
                        </View>
                    </View>

                    {/* Dates */}
                    {[
                        { label: 'Data inizio', icon: 'event', value: startDate, set: setStartDate, placeholder: 'YYYY-MM-DD' },
                        { label: 'Data obiettivo', icon: 'flag', value: targetDate, set: setTargetDate, placeholder: 'YYYY-MM-DD' },
                    ].map(f => (
                        <View key={f.label} style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                <MaterialIcons name={f.icon as any} size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder={f.placeholder} placeholderTextColor={c.textMuted} value={f.value} onChangeText={f.set} />
                            </View>
                        </View>
                    ))}

                    {/* Notes */}
                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Note</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 80, paddingTop: 12 }}>
                            <MaterialIcons name="notes" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: 60, textAlignVertical: 'top' }} placeholder="Note..." placeholderTextColor={c.textMuted} value={notes} onChangeText={setNotes} multiline />
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: c.bg + 'F2', borderTopWidth: 1, borderTopColor: c.border }}>
                <TouchableOpacity style={[{ backgroundColor: c.primary, height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 6 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="white" /> : <><MaterialIcons name="savings" size={20} color="white" /><Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Crea Salvadanaio</Text></>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
